import { storage } from "./storage";
import { db } from "./db";
import { users, activities } from "@shared/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";

interface DepartmentMetrics {
  department: string;
  totalEmployees: number;
  activeEmployees: number;
  totalActivities: number;
  completedActivities: number;
  averageCompletionTime: number;
  collaborationRate: number;
}

interface ManagerDashboardData {
  directReports: {
    id: number;
    name: string;
    email: string;
    department: string;
    activitiesCount: number;
    completionRate: number;
    lastActivity: Date | null;
  }[];
  departmentMetrics: DepartmentMetrics;
  crossDepartmentActivities: {
    id: number;
    title: string;
    departments: string[];
    participants: string[];
    status: string;
    createdAt: Date;
  }[];
  teamPerformance: {
    productivity: number;
    collaboration: number;
    efficiency: number;
  };
}

class ManagementService {
  async getUsersByDepartment(department: string): Promise<any[]> {
    return await db.select()
      .from(users)
      .where(eq(users.department, department));
  }

  async getDirectReports(managerId: number): Promise<any[]> {
    return await db.select()
      .from(users)
      .where(eq(users.managerId, managerId));
  }

  async getDepartmentMetrics(department: string): Promise<DepartmentMetrics> {
    const departmentUsers = await this.getUsersByDepartment(department);
    const userIds = departmentUsers.map(u => u.id);

    if (userIds.length === 0) {
      return {
        department,
        totalEmployees: 0,
        activeEmployees: 0,
        totalActivities: 0,
        completedActivities: 0,
        averageCompletionTime: 0,
        collaborationRate: 0
      };
    }

    // Get activities created by department users
    const departmentActivities = await db.select()
      .from(activities)
      .where(inArray(activities.createdBy, userIds));

    const completedActivities = departmentActivities.filter(a => a.status === 'completed');
    
    // Calculate average completion time
    const completionTimes = completedActivities
      .filter(a => a.createdAt && a.updatedAt)
      .map(a => (a.updatedAt.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24)); // days
    
    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0;

    // Calculate collaboration rate (activities with multiple participants)
    const collaborativeActivities = departmentActivities.filter(a => 
      a.participants && a.participants.length > 1
    ).length;
    
    const collaborationRate = departmentActivities.length > 0 
      ? (collaborativeActivities / departmentActivities.length) * 100 
      : 0;

    // Active employees (those who created activities in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivities = departmentActivities.filter(a => a.createdAt >= thirtyDaysAgo);
    const activeEmployeeIds = new Set(recentActivities.map(a => a.createdBy));

    return {
      department,
      totalEmployees: departmentUsers.length,
      activeEmployees: activeEmployeeIds.size,
      totalActivities: departmentActivities.length,
      completedActivities: completedActivities.length,
      averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
      collaborationRate: Math.round(collaborationRate * 100) / 100
    };
  }

  async getManagerDashboardData(managerId: number): Promise<ManagerDashboardData> {
    const manager = await storage.getUser(managerId);
    if (!manager) {
      throw new Error("Manager not found");
    }

    // Get direct reports
    const directReportsData = await this.getDirectReports(managerId);
    
    // Enhance direct reports with activity data
    const directReports = await Promise.all(
      directReportsData.map(async (report) => {
        const userActivities = await storage.getActivities(report.id, report.email, false);
        const completedActivities = userActivities.filter(a => a.status === 'completed');
        const completionRate = userActivities.length > 0 
          ? (completedActivities.length / userActivities.length) * 100 
          : 0;
        
        const lastActivity = userActivities.length > 0 
          ? userActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
          : null;

        return {
          id: report.id,
          name: report.name,
          email: report.email,
          department: report.department || 'Unassigned',
          activitiesCount: userActivities.length,
          completionRate: Math.round(completionRate),
          lastActivity
        };
      })
    );

    // Get department metrics
    const departmentMetrics = manager.department 
      ? await this.getDepartmentMetrics(manager.department)
      : {
          department: 'Mixed',
          totalEmployees: directReports.length,
          activeEmployees: directReports.filter(r => r.lastActivity).length,
          totalActivities: directReports.reduce((sum, r) => sum + r.activitiesCount, 0),
          completedActivities: 0,
          averageCompletionTime: 0,
          collaborationRate: 0
        };

    // Get cross-department activities (activities involving multiple departments)
    const allActivities = await db.select().from(activities);
    const crossDepartmentActivities = await this.getCrossDepartmentActivities(allActivities);

    // Calculate team performance metrics
    const teamProductivity = directReports.length > 0 
      ? directReports.reduce((sum, r) => sum + r.completionRate, 0) / directReports.length 
      : 0;
    
    const teamCollaboration = departmentMetrics.collaborationRate;
    const teamEfficiency = departmentMetrics.averageCompletionTime > 0 
      ? Math.max(0, 100 - (departmentMetrics.averageCompletionTime * 10)) 
      : 0;

    return {
      directReports,
      departmentMetrics,
      crossDepartmentActivities,
      teamPerformance: {
        productivity: Math.round(teamProductivity),
        collaboration: Math.round(teamCollaboration),
        efficiency: Math.round(teamEfficiency)
      }
    };
  }

  private async getCrossDepartmentActivities(allActivities: any[]): Promise<any[]> {
    const crossDeptActivities = [];

    for (const activity of allActivities) {
      if (!activity.participants || activity.participants.length <= 1) continue;

      // Get departments of all participants
      const participantDepartments = new Set<string>();
      
      for (const participantEmail of activity.participants) {
        const participant = await db.select()
          .from(users)
          .where(eq(users.email, participantEmail))
          .limit(1);
        
        if (participant[0]?.department) {
          participantDepartments.add(participant[0].department);
        }
      }

      // If more than one department is involved, it's cross-departmental
      if (participantDepartments.size > 1) {
        crossDeptActivities.push({
          id: activity.id,
          title: activity.title,
          departments: Array.from(participantDepartments),
          participants: activity.participants,
          status: activity.status,
          createdAt: activity.createdAt
        });
      }
    }

    return crossDeptActivities.slice(0, 10); // Limit to 10 most recent
  }

  async getManagerialHierarchy(): Promise<{
    managers: {
      id: number;
      name: string;
      email: string;
      department: string;
      directReportCount: number;
      totalTeamSize: number;
    }[];
    departments: string[];
  }> {
    const allUsers = await storage.getAllUsers();
    const managers = allUsers.filter(user => user.role === 'manager' || user.role === 'admin');
    
    const managerData = await Promise.all(
      managers.map(async (manager) => {
        const directReports = await this.getDirectReports(manager.id);
        
        // Calculate total team size (including indirect reports)
        let totalTeamSize = directReports.length;
        for (const report of directReports) {
          if (report.role === 'manager') {
            const indirectReports = await this.getDirectReports(report.id);
            totalTeamSize += indirectReports.length;
          }
        }

        return {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          department: manager.department || 'Unassigned',
          directReportCount: directReports.length,
          totalTeamSize
        };
      })
    );

    const departments = [...new Set(allUsers.map(u => u.department).filter(Boolean))];

    return {
      managers: managerData,
      departments
    };
  }
}

export const managementService = new ManagementService();