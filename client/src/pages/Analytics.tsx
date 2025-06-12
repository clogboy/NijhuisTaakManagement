import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Clock, Target, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface ProductivityMetrics {
  completionRate: number;
  averageTimeToComplete: number;
  totalActivitiesCompleted: number;
  urgentTasksResolved: number;
  collaborationActivity: number;
  trendData: {
    date: string;
    completed: number;
    created: number;
  }[];
}

interface TeamMetrics {
  totalUsers: number;
  activeUsers: number;
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;
  collaborativeActivities: number;
}

interface ROIMetrics {
  timesSaved: number;
  efficiencyGain: number;
  collaborationImprovement: number;
  deadlineCompliance: number;
}

export default function Analytics() {
  const { data: productivity } = useQuery<ProductivityMetrics>({
    queryKey: ["/api/analytics/productivity"],
  });

  const { data: team } = useQuery<TeamMetrics>({
    queryKey: ["/api/analytics/team"],
  });

  const { data: roi } = useQuery<ROIMetrics>({
    queryKey: ["/api/analytics/roi"],
  });

  const formatCurrency = (hours: number) => {
    const hourlyRate = 75; // Average hourly rate for knowledge workers
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(hours * hourlyRate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Performance metrics and ROI insights for NijFlow productivity platform
        </p>
      </div>

      {/* ROI Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roi?.timesSaved || 0}h</div>
            <p className="text-xs text-muted-foreground">
              Value: {formatCurrency(roi?.timesSaved || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Gain</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roi?.efficiencyGain || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Through AI optimization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deadline Compliance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roi?.deadlineCompliance || 0}%</div>
            <p className="text-xs text-muted-foreground">
              On-time completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collaboration Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roi?.collaborationImprovement || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Multi-user activities
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Team Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
            <CardDescription>Current system usage and activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Users</span>
                <Badge variant="secondary">
                  {team?.activeUsers || 0} / {team?.totalUsers || 0}
                </Badge>
              </div>
              <Progress 
                value={team ? (team.activeUsers / team.totalUsers) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Activity Completion</span>
                <Badge variant="secondary">
                  {team?.completedActivities || 0} / {team?.totalActivities || 0}
                </Badge>
              </div>
              <Progress 
                value={team ? (team.completedActivities / team.totalActivities) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {team?.collaborativeActivities || 0}
                </div>
                <div className="text-xs text-muted-foreground">Collaborative Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {team?.overdueActivities || 0}
                </div>
                <div className="text-xs text-muted-foreground">Overdue Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Productivity */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Productivity</CardTitle>
            <CardDescription>Your individual performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <Badge variant="secondary">{productivity?.completionRate || 0}%</Badge>
              </div>
              <Progress value={productivity?.completionRate || 0} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {productivity?.totalActivitiesCompleted || 0}
                </div>
                <div className="text-xs text-muted-foreground">Tasks Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {productivity?.urgentTasksResolved || 0}
                </div>
                <div className="text-xs text-muted-foreground">Urgent Resolved</div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between text-sm">
                <span>Avg. Completion Time</span>
                <span className="font-medium">
                  {productivity?.averageTimeToComplete.toFixed(1) || 0} days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Trends (Last 14 Days)</CardTitle>
          <CardDescription>
            Track your daily activity creation and completion patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={productivity?.trendData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('nl-NL', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('nl-NL')}
              />
              <Line 
                type="monotone" 
                dataKey="created" 
                stroke="#0078d4" 
                strokeWidth={2}
                name="Created"
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ROI Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Business Value Summary
          </CardTitle>
          <CardDescription>
            Quantified impact of NijFlow on organizational productivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-800 font-semibold">Cost Savings</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(roi?.timesSaved || 0)}
              </div>
              <div className="text-sm text-green-700">
                Through automated scheduling and prioritization
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-800 font-semibold">Productivity Boost</div>
              <div className="text-2xl font-bold text-blue-900">
                +{roi?.efficiencyGain || 0}%
              </div>
              <div className="text-sm text-blue-700">
                Efficiency improvement through AI optimization
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-800 font-semibold">Team Collaboration</div>
              <div className="text-2xl font-bold text-purple-900">
                {roi?.collaborationImprovement || 0}%
              </div>
              <div className="text-sm text-purple-700">
                Multi-participant project rate
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Key Benefits Delivered:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Automated email notifications reduce coordination overhead</li>
              <li>• AI-powered scheduling optimizes daily productivity</li>
              <li>• Multi-tenant architecture enables secure collaboration</li>
              <li>• Integrated deadline tracking prevents project delays</li>
              <li>• Dutch localization supports local business practices</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}