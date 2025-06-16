import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Calendar, CheckCircle2, Target, Plus, Filter, Clock, Users, X, AlertCircle } from "lucide-react";
import { Activity, Contact } from "@shared/schema";
import { format, isToday, isThisWeek, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import NewActivityModal from "@/components/modals/NewActivityModal";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";
import ProductivityHealthCard from "@/components/productivity/ProductivityHealthCard";

interface DashboardStats {
  urgentCount: number;
  dueThisWeek: number;
  completedCount: number;
  roadblocksCount: number;
  activeContacts: number;
  overdueCount: number;
  quickWinsCount: number;
  subtasksCompleted: number;
  totalSubtasks: number;
}

interface DashboardProps {
  lowStimulusMode?: boolean;
  setLowStimulusMode?: (value: boolean) => void;
}

const priorityColors = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800", 
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800"
};

const statusColors = {
  todo: "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  blocked: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800"
};

export default function Dashboard({ lowStimulusMode: lowStimulus = false, setLowStimulusMode: setLowStimulus }: DashboardProps = {}) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [healthCardDismissed, setHealthCardDismissed] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: userPreferences = { productivityHealthEnabled: true } } = useQuery({
    queryKey: ["/api/user/preferences"],
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: any) => {
      return apiRequest("PUT", "/api/user/preferences", preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (priorityFilters.length > 0 && !priorityFilters.includes(activity.priority)) return false;
    if (statusFilters.length > 0 && !statusFilters.includes(activity.status)) return false;
    return true;
  });

  // Calculate stats
  const stats: DashboardStats = {
    urgentCount: activities.filter(a => a.priority === 'urgent' && a.status !== 'completed').length,
    dueThisWeek: activities.filter(a => a.dueDate && isThisWeek(new Date(a.dueDate)) && a.status !== 'completed').length,
    completedCount: activities.filter(a => a.status === 'completed').length,
    roadblocksCount: activities.filter(a => a.status === 'blocked').length,
    activeContacts: new Set(activities.filter(a => a.participants && a.participants.length > 0).map(a => a.participants?.length || 0)).size,
    overdueCount: activities.filter(a => a.dueDate && isPast(new Date(a.dueDate)) && a.status !== 'completed').length,
    quickWinsCount: 0,
    subtasksCompleted: 0,
    totalSubtasks: 0,
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsTaskDetailModalOpen(true);
  };

  const handleModeSwitch = (checked: boolean) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setLowStimulus?.(checked);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 150);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Full-screen white overlay for transitions */}
      <div 
        className={`fixed inset-0 bg-white/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out pointer-events-none z-50 ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Header with Low Stimulus Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-dark">
            {lowStimulus ? "🟠 Focus modus" : "🟢 Alle functies"}
          </h1>
          <p className="text-sm text-neutral-medium mt-1">
            {lowStimulus ? "Vereenvoudigde weergave voor betere focus" : "Volledig overzicht van je activiteiten"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-medium">Focus modus</span>
          <Switch
            checked={lowStimulus}
            onCheckedChange={handleModeSwitch}
          />
        </div>
      </div>

      {/* Content with smooth transitions */}
      <div className="relative">
        {/* Low Stimulus Mode - Simplified View */}
        <div 
          className={`transition-all duration-700 ease-in-out ${
            lowStimulus 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-95 absolute inset-0 pointer-events-none'
          }`}
        >
          {lowStimulus && (
            <div className="space-y-6">
              {/* Productivity Health Card - Keep this visible in focus mode */}
              {userPreferences?.productivityHealthEnabled === true && !healthCardDismissed && (
                <ProductivityHealthCard
                  stats={stats}
                  onDismiss={() => setHealthCardDismissed(true)}
                  showSettings={true}
                />
              )}

              {/* Key Stats - Simplified */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold text-red-800">{stats.urgentCount}</p>
                        <p className="text-sm text-red-600">Urgent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-800">{stats.completedCount}</p>
                        <p className="text-sm text-green-600">Voltooid</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Today's Focus - Simplified Activity List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-neutral-dark">Vandaag focussen op</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activities
                    .filter(activity => 
                      activity.status !== 'completed' && 
                      (activity.priority === 'urgent' || 
                       (activity.dueDate && isToday(new Date(activity.dueDate))))
                    )
                    .slice(0, 5)
                    .map((activity) => (
                      <div
                        key={activity.id}
                        className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleEditActivity(activity)}
                      >
                        <div className="font-medium text-gray-900">{activity.title}</div>
                        {activity.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {activity.description}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded-full ${
                            activity.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            activity.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {activity.priority}
                          </span>
                          {activity.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(activity.dueDate), 'dd MMM')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Simple Create Button */}
              <div className="text-center">
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nieuwe activiteit
                </Button>
              </div>

              {/* Simple Exit Message */}
              <Card className="border-green-100 bg-green-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-green-700 text-sm">
                      Klaar om meer te doen? Schakel terug naar alle functies met de toggle rechtsboven.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Normal Mode - Full View */}
        <div 
          className={`transition-all duration-700 ease-in-out ${
            !lowStimulus 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-95 absolute inset-0 pointer-events-none'
          }`}
        >
          {!lowStimulus && (
            <div className="space-y-6">
              {/* Stats Cards - Hidden when productivity reflection is active */}
              {(userPreferences?.productivityHealthEnabled === false || healthCardDismissed) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
                  <Card className="micro-card micro-fadeIn">
                    <CardContent className="p-2 sm:p-4 lg:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
                        <div>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-800">{stats.urgentCount}</p>
                          <p className="text-xs sm:text-sm text-red-600">Urgent</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="micro-card micro-fadeIn">
                    <CardContent className="p-2 sm:p-4 lg:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                        <div>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800">{stats.dueThisWeek}</p>
                          <p className="text-xs sm:text-sm text-blue-600">Deze week</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="micro-card micro-fadeIn">
                    <CardContent className="p-2 sm:p-4 lg:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
                        <div>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">{stats.completedCount}</p>
                          <p className="text-xs sm:text-sm text-green-600">Voltooid</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="micro-card micro-fadeIn">
                    <CardContent className="p-2 sm:p-4 lg:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
                        <div>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-800">{stats.roadblocksCount}</p>
                          <p className="text-xs sm:text-sm text-orange-600">Roadblocks</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Productivity Health Card */}
              {userPreferences?.productivityHealthEnabled === true && !healthCardDismissed && (
                <ProductivityHealthCard
                  stats={stats}
                  onDismiss={() => setHealthCardDismissed(true)}
                  showSettings={true}
                />
              )}

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-primary text-white hover:bg-primary/90 flex-1 sm:flex-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuwe activiteit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsFilterPanelOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>

              {/* Activities Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recente Activiteiten</span>
                    <Badge variant="secondary">{filteredActivities.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredActivities.slice(0, 8).map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleEditActivity(activity)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-neutral-dark">{activity.title}</h4>
                            <Badge className={`text-xs ${priorityColors[activity.priority as keyof typeof priorityColors]}`}>
                              {activity.priority}
                            </Badge>
                            <Badge className={`text-xs ${statusColors[activity.status as keyof typeof statusColors]}`}>
                              {activity.status}
                            </Badge>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-neutral-medium mt-1 line-clamp-1">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-neutral-medium">
                            {activity.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(activity.dueDate), 'dd MMM yyyy')}
                              </span>
                            )}
                            {activity.participants && activity.participants.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {activity.participants.length} participant(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <aside className="w-80 bg-white shadow-sm border-l border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-dark">Filters & Contacts</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilterPanelOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      )}

      {/* Modals */}
      <NewActivityModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {selectedActivity && (
        <TaskDetailModal
          activity={selectedActivity}
          isOpen={isTaskDetailModalOpen}
          onClose={() => setIsTaskDetailModalOpen(false)}
        />
      )}
    </div>
  );
}