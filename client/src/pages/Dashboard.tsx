import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, Clock, AlertTriangle, Plus, Target, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/stats");
      return response.json();
    },
  });

  const {
    data: activities = [],
    isLoading: activitiesLoading,
  } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: () => apiRequest("GET", "/api/activities").then((res) => res.json()),
  });

  const { data: subtasks = [], isLoading: subtasksLoading } = useQuery({
    queryKey: ["/api/subtasks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subtasks");
      return response.json();
    },
  });

  const { data: roadblocks = [], isLoading: roadblocksLoading } = useQuery({
    queryKey: ["/api/roadblocks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/roadblocks");
      return response.json();
    },
  });

  if (statsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Safely access stats with defaults
  const safeStats = {
    totalActivities: stats?.totalActivities || 0,
    completedActivities: stats?.completedActivities || 0,
    totalSubtasks: stats?.totalSubtasks || 0,
    totalRoadblocks: stats?.totalRoadblocks || 0,
  };

  const recentActivities = activities.slice(0, 5);
  const pendingSubtasks = subtasks.filter(s => s.status === 'pending').slice(0, 3);
  const activeRoadblocks = roadblocks.filter(r => r.status === 'open').slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex gap-2">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeStats.totalActivities}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeStats.completedActivities}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Subtasks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeStats.totalSubtasks}</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Roadblocks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeStats.totalRoadblocks}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Priority: {activity.priority}
                      </p>
                    </div>
                    <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No activities yet</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Subtasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Subtasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subtasksLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : pendingSubtasks.length > 0 ? (
              <div className="space-y-3">
                {pendingSubtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{subtask.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Type: {subtask.type}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {subtask.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No pending subtasks</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Roadblocks */}
      {activeRoadblocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Active Roadblocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRoadblocks.map((roadblock) => (
                <div key={roadblock.id} className="p-4 border border-red-200 bg-red-50 dark:bg-red-950 rounded-lg">
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">{roadblock.title}</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">{roadblock.description}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="destructive">{roadblock.severity}</Badge>
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {new Date(roadblock.reportedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Productivity Health Card - Temporarily disabled */}
        {false && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Productivity Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {productivityHealth?.score ?? 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                {productivityHealth?.status ?? 'Calculating...'}
              </p>
            </div>
            </CardContent>
          </Card>
        )}

    </div>
  );
}