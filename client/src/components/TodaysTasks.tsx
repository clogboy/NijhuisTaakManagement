import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, Calendar, ArrowRight } from "lucide-react";
import { Activity } from "@shared/schema";
import { format } from "date-fns";

export default function TodaysTasks() {
  const today = new Date();
  const todayString = format(today, "yyyy-MM-dd");

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Filter activities for today (due today or scheduled for today)
  const todaysTasks = activities.filter(activity => {
    const dueDate = activity.dueDate ? format(new Date(activity.dueDate), "yyyy-MM-dd") : null;
    return dueDate === todayString || activity.status === "in-progress";
  }).slice(0, 5); // Show max 5 tasks

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "on-hold": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Calendar className="mr-2 h-5 w-5" />
            Today's Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-ms-blue" />
            Today's Tasks
          </div>
          <Badge variant="secondary" className="text-xs">
            {todaysTasks.length} tasks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todaysTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">No tasks for today</h3>
            <p className="mt-1 text-sm text-gray-500">
              Great! You're all caught up for today.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <Badge
                      variant="secondary"
                      className={getStatusColor(task.status)}
                    >
                      {task.status.replace("-", " ")}
                    </Badge>
                    {task.dueDate && (
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        Due {format(new Date(task.dueDate), "MMM d")}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-8 w-8 p-0"
                  onClick={() => window.location.href = `/activities`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {todaysTasks.length > 0 && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.location.href = `/agenda`}
                >
                  View AI Agenda
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}