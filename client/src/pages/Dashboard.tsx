import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Filter, X, Clock, AlertCircle, CheckCircle2, Target, Users, Calendar, TrendingUp } from "lucide-react";
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
}

interface DashboardProps {
  lowStimulusMode?: boolean;
  setLowStimulusMode?: (value: boolean) => void;
}

export default function Dashboard({ lowStimulusMode: lowStimulus = false, setLowStimulusMode: setLowStimulus }: DashboardProps = {}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [healthCardDismissed, setHealthCardDismissed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: userPreferences } = useQuery({
    queryKey: ["/api/user/preferences"],
  });

  const updatePreferences = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await apiRequest("PATCH", "/api/user/preferences", preferences);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (priorityFilters.length > 0 && !priorityFilters.includes(activity.priority)) return false;
    if (statusFilters.length > 0 && !statusFilters.includes(activity.status)) return false;
    // Note: activities use participants array instead of assignedTo
    return true;
  });

  // Calculate stats
  const stats = {
    urgentCount: activities.filter(a => a.priority === 'urgent' && a.status !== 'completed').length,
    dueThisWeek: activities.filter(a => a.dueDate && isThisWeek(new Date(a.dueDate)) && a.status !== 'completed').length,
    completedCount: activities.filter(a => a.status === 'completed').length,
    roadblocksCount: activities.filter(a => a.status === 'blocked').length,
    activeContacts: new Set(activities.filter(a => a.participants && a.participants.length > 0).map(a => a.participants?.length || 0)).size,
    overdueCount: activities.filter(a => a.dueDate && isPast(new Date(a.dueDate)) && a.status !== 'completed').length,
    quickWinsCount: 0, // Add for compatibility with ProductivityHealthCard
    subtasksCompleted: 0, // Add for compatibility
    totalSubtasks: 0, // Add for compatibility
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsTaskDetailModalOpen(true);
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilters(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleContactFilter = (contactId: number) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(c => c !== contactId)
        : [...prev, contactId]
    );
  };

  const priorityColors = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    normal: "bg-blue-100 text-blue-800 border-blue-200", 
    low: "bg-green-100 text-green-800 border-green-200"
  };

  const statusColors = {
    todo: "bg-gray-100 text-gray-800 border-gray-200",
    'in-progress': "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    blocked: "bg-red-100 text-red-800 border-red-200"
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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
            onCheckedChange={(checked) => setLowStimulus?.(checked)}
          />
        </div>
      </div>

      {/* Content with fade transitions */}
      <div className={`transition-opacity duration-500 ease-in-out ${lowStimulus ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
        {/* Low Stimulus Mode - Simplified View */}
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
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => handleEditActivity(activity)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-dark">{activity.title}</h4>
                        {activity.dueDate && (
                          <p className="text-xs text-neutral-medium mt-1">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {format(new Date(activity.dueDate), 'dd MMM')}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-xs ${priorityColors[activity.priority as keyof typeof priorityColors]}`}>
                        {activity.priority}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className={`transition-opacity duration-500 ease-in-out ${!lowStimulus ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
        {/* Normal Mode - Full View */}
        {!lowStimulus && (
          <div className="space-y-6">
            {/* Stats Cards - Hidden when productivity reflection is active */}
            {(userPreferences?.productivityHealthEnabled === false || healthCardDismissed) && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
                <Card className="micro-card micro-fadeIn">
                  <CardContent className="p-2 sm:p-4 lg:p-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
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

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <aside className="w-80 bg-white shadow-sm border-l border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-dark">Filters & Contacts</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-neutral-medium hover:text-neutral-dark"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Priority Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Priority</h4>
            <div className="space-y-2">
              {["urgent", "normal", "low"].map((priority) => (
                <label key={priority} className="flex items-center">
                  <Checkbox
                    checked={priorityFilters.includes(priority)}
                    onCheckedChange={() => togglePriorityFilter(priority)}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{priority}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Status</h4>
            <div className="space-y-2">
              {["todo", "in-progress", "completed", "blocked"].map((status) => (
                <label key={status} className="flex items-center">
                  <Checkbox
                    checked={statusFilters.includes(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{status.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Contacts Filter */}
          <div>
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Contacts</h4>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <label key={contact.id} className="flex items-center">
                  <Checkbox
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={() => toggleContactFilter(contact.id)}
                    className="mr-2"
                  />
                  <span className="text-sm">{contact.name}</span>
                </label>
              ))}
            </div>
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