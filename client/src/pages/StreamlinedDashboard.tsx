import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Edit,
  BarChart3,
  Plus,
  Filter,
  Calendar,
  Target,
  Settings
} from "lucide-react";
import { Activity, QuickWin, Roadblock } from "@shared/schema";
import NewActivityModal from "@/components/modals/NewActivityModal";
import EditActivityModal from "@/components/modals/EditActivityModal";
import DeepFocusMode from "@/components/DeepFocusMode";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function StreamlinedDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isLowStimulusMode, setIsLowStimulusMode] = useState(false);

  // Data queries
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: quickWins = [] } = useQuery<QuickWin[]>({
    queryKey: ["/api/quick-wins"],
  });

  const { data: roadblocks = [] } = useQuery<Roadblock[]>({
    queryKey: ["/api/roadblocks"],
  });

  // Activity completion mutation
  const completeActivityMutation = useMutation({
    mutationFn: async (activityId: number) => {
      await apiRequest(`/api/activities/${activityId}`, "PATCH", { 
        status: "completed" 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Taak Voltooid",
        description: "De taak is succesvol afgerond",
      });
    },
  });

  // Filter activities
  const getFilteredActivities = () => {
    let filtered = activities;
    
    switch (selectedFilter) {
      case "pending":
        filtered = activities.filter(a => a.status === "pending");
        break;
      case "high":
        filtered = activities.filter(a => a.priority === "high");
        break;
      case "today":
        const today = new Date().toDateString();
        filtered = activities.filter(a => 
          a.dueDate && new Date(a.dueDate).toDateString() === today
        );
        break;
      default:
        filtered = activities.filter(a => a.status !== "completed");
    }
    
    return filtered.slice(0, 8); // Limit to 8 items for clean UI
  };

  // Calculate metrics
  const totalTasks = activities.length;
  const completedTasks = activities.filter(a => a.status === "completed").length;
  const pendingTasks = activities.filter(a => a.status === "pending").length;
  const highPriorityTasks = activities.filter(a => a.priority === "high" && a.status !== "completed").length;
  const openRoadblocks = roadblocks.filter(r => r.status === "open").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleCompleteActivity = (activityId: number) => {
    completeActivityMutation.mutate(activityId);
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isLowStimulusMode 
        ? "bg-gray-50 text-gray-800" 
        : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
    }`}>
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">NijFlow Dashboard</h1>
            <p className="text-gray-600 mt-1">Intelligente productiviteitsoptimalisatie voor professionals</p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={() => window.location.href = "/agenda"}
              className="flex items-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Agenda</span>
            </Button>
            <Button 
              onClick={() => setShowNewActivityModal(true)} 
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Nieuwe Activiteit</span>
            </Button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
                  <p className="text-sm text-gray-600">Voltooid</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{pendingTasks}</p>
                  <p className="text-sm text-gray-600">Openstaand</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{highPriorityTasks}</p>
                  <p className="text-sm text-gray-600">Hoge Prioriteit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{openRoadblocks}</p>
                  <p className="text-sm text-gray-600">Knelpunten</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Tasks Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <div className="flex space-x-2">
                    {[
                      { key: "all", label: "Alle Taken" },
                      { key: "pending", label: "Openstaand" },
                      { key: "high", label: "Hoge Prioriteit" },
                      { key: "today", label: "Vandaag" }
                    ].map(filter => (
                      <Button
                        key={filter.key}
                        variant={selectedFilter === filter.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedFilter(filter.key)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Actieve Taken</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {getFilteredActivities().map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={activity.status === "completed"}
                            onCheckedChange={() => handleCompleteActivity(activity.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {activity.title}
                            </h4>
                            {activity.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-3 mt-2">
                              {activity.priority && (
                                <Badge
                                  variant={
                                    activity.priority === "high" ? "destructive" :
                                    activity.priority === "medium" ? "default" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {activity.priority === "high" ? "Hoog" :
                                   activity.priority === "medium" ? "Gemiddeld" : "Laag"}
                                </Badge>
                              )}
                              {activity.dueDate && (
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(activity.dueDate).toLocaleDateString("nl-NL")}
                                </span>
                              )}
                              {activity.estimatedDuration && (
                                <span className="text-xs text-gray-500">
                                  ~{activity.estimatedDuration} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingActivity(activity)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {getFilteredActivities().length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Geen taken gevonden voor dit filter</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Wins */}
            {quickWins.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Snelle Overwinningen</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {quickWins.slice(0, 3).map((quickWin) => (
                      <div key={quickWin.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900">{quickWin.title}</h4>
                        <p className="text-sm text-green-700 mt-1">{quickWin.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Deep Focus Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Deep Focus Modus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeepFocusMode 
                  onLowStimulusModeChange={setIsLowStimulusMode}
                  isLowStimulusMode={isLowStimulusMode}
                />
              </CardContent>
            </Card>

            {/* Active Roadblocks */}
            {openRoadblocks > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span>Actieve Knelpunten</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roadblocks
                      .filter(r => r.status === "open")
                      .slice(0, 3)
                      .map((roadblock) => (
                        <div key={roadblock.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-red-900">{roadblock.title}</h4>
                              <p className="text-sm text-red-700 mt-1">{roadblock.description}</p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {roadblock.severity === "high" ? "Kritiek" :
                                 roadblock.severity === "medium" ? "Gemiddeld" : "Laag"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Snelle Acties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = "/agenda"}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Agenda Bekijken
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = "/analytics"}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analyses
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = "/settings"}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Instellingen
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewActivityModal
        open={showNewActivityModal}
        onOpenChange={setShowNewActivityModal}
      />

      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          open={!!editingActivity}
          onOpenChange={(open) => !open && setEditingActivity(null)}
        />
      )}
    </div>
  );
}