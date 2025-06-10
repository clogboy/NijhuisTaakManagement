import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, Activity as ActivityIcon, AlertCircle, User } from "lucide-react";
import { Roadblock, Activity } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function Roadblocks() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: roadblocks, isLoading: roadblocksLoading } = useQuery<Roadblock[]>({
    queryKey: ["/api/roadblocks"],
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Create a map of activity IDs to activity titles
  const activityMap = activities?.reduce((acc, activity) => {
    acc[activity.id] = activity;
    return acc;
  }, {} as Record<number, Activity>) || {};

  // Filter roadblocks based on search query
  const filteredRoadblocks = roadblocks?.filter(roadblock =>
    roadblock.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    roadblock.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    roadblock.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activityMap[roadblock.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group roadblocks by status
  const roadblocksByStatus = {
    open: filteredRoadblocks.filter(rb => rb.status === "open"),
    in_progress: filteredRoadblocks.filter(rb => rb.status === "in_progress"),
    resolved: filteredRoadblocks.filter(rb => rb.status === "resolved"),
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return "🚨";
      case "high": return "⚠️";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "❓";
    }
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-dark dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Roadblocks Dashboard
            </h1>
            <p className="text-neutral-medium dark:text-gray-400 mt-1">
              View roadblocks associated with your tasks. To report new roadblocks, open a task and use the Roadblocks tab.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
          <Input
            placeholder="Search roadblocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Info Banner */}
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-200">
                  Roadblocks are now Task-Specific
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Roadblocks are now managed within individual tasks. This dashboard shows all roadblocks across your tasks. 
                  To report new roadblocks, go to Activities and open any task's detail view.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {roadblocksLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-medium">Loading roadblocks...</p>
          </div>
        ) : filteredRoadblocks.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-neutral-light mx-auto mb-4" />
            <p className="text-neutral-medium text-lg mb-2">
              {roadblocks?.length === 0 ? "No roadblocks reported" : "No roadblocks match your search"}
            </p>
            <p className="text-neutral-medium">
              {roadblocks?.length === 0 
                ? "Report roadblocks by opening any task in the Activities section" 
                : "Try adjusting your search criteria"
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Open Roadblocks */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded text-sm">
                  Open ({roadblocksByStatus.open.length})
                </span>
              </h2>
              <div className="space-y-4">
                {roadblocksByStatus.open.map((roadblock) => {
                  const linkedActivity = activityMap[roadblock.linkedActivityId];
                  return (
                    <Card key={roadblock.id} className="hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base text-neutral-dark dark:text-white flex items-center gap-2">
                              <span>{getSeverityIcon(roadblock.severity)}</span>
                              {roadblock.title}
                            </CardTitle>
                            <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1">
                              {roadblock.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            <Badge className={getSeverityColor(roadblock.severity)}>
                              {roadblock.severity} severity
                            </Badge>
                            <Badge className={getStatusColor(roadblock.status)}>
                              {roadblock.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {roadblock.assignedTo && (
                            <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                              <User className="h-4 w-4" />
                              <span>Assigned to: {roadblock.assignedTo}</span>
                            </div>
                          )}
                          
                          {linkedActivity && (
                            <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                              <ActivityIcon className="h-4 w-4" />
                              <span>Task: {linkedActivity.title}</span>
                            </div>
                          )}
                          
                          <div className="text-xs text-neutral-medium dark:text-gray-500">
                            Reported: {format(new Date(roadblock.reportedDate), "MMM dd, yyyy")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {roadblocksByStatus.open.length === 0 && (
                  <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                    No open roadblocks
                  </div>
                )}
              </div>
            </div>

            {/* In Progress Roadblocks */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded text-sm">
                  In Progress ({roadblocksByStatus.in_progress.length})
                </span>
              </h2>
              <div className="space-y-4">
                {roadblocksByStatus.in_progress.map((roadblock) => {
                  const linkedActivity = activityMap[roadblock.linkedActivityId];
                  return (
                    <Card key={roadblock.id} className="hover:shadow-md transition-shadow border-l-4 border-l-yellow-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base text-neutral-dark dark:text-white flex items-center gap-2">
                              <span>{getSeverityIcon(roadblock.severity)}</span>
                              {roadblock.title}
                            </CardTitle>
                            <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1">
                              {roadblock.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            <Badge className={getSeverityColor(roadblock.severity)}>
                              {roadblock.severity} severity
                            </Badge>
                            <Badge className={getStatusColor(roadblock.status)}>
                              {roadblock.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {roadblock.assignedTo && (
                            <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                              <User className="h-4 w-4" />
                              <span>Assigned to: {roadblock.assignedTo}</span>
                            </div>
                          )}
                          
                          {linkedActivity && (
                            <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                              <ActivityIcon className="h-4 w-4" />
                              <span>Task: {linkedActivity.title}</span>
                            </div>
                          )}
                          
                          <div className="text-xs text-neutral-medium dark:text-gray-500">
                            Reported: {format(new Date(roadblock.reportedDate), "MMM dd, yyyy")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {roadblocksByStatus.in_progress.length === 0 && (
                  <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                    No roadblocks in progress
                  </div>
                )}
              </div>
            </div>

            {/* Resolved Roadblocks */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded text-sm">
                  Resolved ({roadblocksByStatus.resolved.length})
                </span>
              </h2>
              <div className="space-y-4">
                {roadblocksByStatus.resolved.map((roadblock) => {
                  const linkedActivity = activityMap[roadblock.linkedActivityId];
                  return (
                    <Card key={roadblock.id} className="hover:shadow-md transition-shadow opacity-75 border-l-4 border-l-green-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base text-neutral-dark dark:text-white flex items-center gap-2 line-through">
                              <span>{getSeverityIcon(roadblock.severity)}</span>
                              {roadblock.title}
                            </CardTitle>
                            <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1 line-through">
                              {roadblock.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            <Badge className={getSeverityColor(roadblock.severity)}>
                              {roadblock.severity} severity
                            </Badge>
                            <Badge className={getStatusColor(roadblock.status)}>
                              ✓ Resolved
                            </Badge>
                          </div>
                          
                          {roadblock.assignedTo && (
                            <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                              <User className="h-4 w-4" />
                              <span>Assigned to: {roadblock.assignedTo}</span>
                            </div>
                          )}
                          
                          {linkedActivity && (
                            <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                              <ActivityIcon className="h-4 w-4" />
                              <span>Task: {linkedActivity.title}</span>
                            </div>
                          )}
                          
                          <div className="text-xs text-neutral-medium dark:text-gray-500">
                            Reported: {format(new Date(roadblock.reportedDate), "MMM dd, yyyy")}
                            {roadblock.resolvedDate && (
                              <span className="ml-2">
                                • Resolved: {format(new Date(roadblock.resolvedDate), "MMM dd, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {roadblocksByStatus.resolved.length === 0 && (
                  <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                    No resolved roadblocks yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}