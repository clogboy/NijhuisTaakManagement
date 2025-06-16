import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "@/hooks/useTranslations";
import { useOnboarding } from "@/contexts/OnboardingContext";
import WelcomeFlow from "@/components/onboarding/WelcomeFlow";
import OnboardingTutorial from "@/components/onboarding/OnboardingTutorial";
import CharacterGuide from "@/components/onboarding/CharacterGuide";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Edit,
  Mail,
  Trophy,
  Filter,
  X,
  Download,
  Archive,
  ArchiveRestore,
  Shield
} from "lucide-react";
import { Activity, Contact, QuickWin } from "@shared/schema";
import NewActivityModal from "@/components/modals/NewActivityModal";
import EditActivityModal from "@/components/modals/EditActivityModal";
import EmailModal from "@/components/modals/EmailModal";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";
import TodaysTasks from "@/components/TodaysTasks";
import ProductivityHealthCard from "@/components/productivity/ProductivityHealthCard";
import OverdueTasksList from "@/components/OverdueTasksList";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  urgentCount: number;
  dueThisWeek: number;
  completedCount: number;
  roadblocksCount: number;
  activeContacts: number;
  overdueCount: number;
}

export default function Dashboard() {
  const { t } = useTranslations();
  const { state: onboardingState, completeTutorial, showGuide, hideGuide } = useOnboarding();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [sortBy, setSortBy] = useState<string>("priority");
  const [priorityFilters, setPriorityFilters] = useState<string[]>(["urgent", "normal", "low"]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [showWelcomeFlow, setShowWelcomeFlow] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [lowStimulusMode, setLowStimulusMode] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: quickWins, isLoading: quickWinsLoading } = useQuery<QuickWin[]>({
    queryKey: ["/api/quickwins"],
  });

  const { data: subtasks } = useQuery<any[]>({
    queryKey: ["/api/subtasks"],
  });

  const { data: roadblocks } = useQuery<any[]>({
    queryKey: ["/api/roadblocks"],
  });

  // Calculate task roadblocks (subtasks with participant_types containing "roadblock")
  const taskRoadblocks = subtasks?.filter((subtask: any) => {
    const participantTypes = subtask.participantTypes || subtask.participant_types;
    if (!participantTypes) return false;
    
    const participants = typeof participantTypes === 'string' 
      ? JSON.parse(participantTypes) 
      : participantTypes;
    
    return Object.values(participants).some((type: any) => type === 'roadblock');
  }) || [];

  // Total roadblocks including both traditional and task roadblocks  
  const totalActiveRoadblocks = (roadblocks?.filter(r => r.status !== 'completed' && r.status !== 'resolved').length || 0) + 
                               (taskRoadblocks?.filter(tr => tr.status !== 'completed' && tr.status !== 'resolved').length || 0);

  const { data: userPreferences } = useQuery<any>({
    queryKey: ["/api/user/preferences"],
  });

  const [healthCardDismissed, setHealthCardDismissed] = useState(false);

  // Productivity health preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: any) => {
      return apiRequest("/api/user/preferences", "PUT", preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Voorkeuren bijgewerkt",
        description: "Je productiviteitsinstellingen zijn opgeslagen",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon voorkeuren niet bijwerken",
        variant: "destructive",
      });
    },
  });

  // Archive/Unarchive mutations
  const archiveMutation = useMutation({
    mutationFn: async (activityId: number) => {
      return apiRequest(`/api/activities/${activityId}/archive`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Activity Archived",
        description: "Activity has been successfully archived",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive activity",
        variant: "destructive",
      });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (activityId: number) => {
      return apiRequest(`/api/activities/${activityId}/unarchive`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Activity Restored",
        description: "Activity has been successfully restored",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore activity",
        variant: "destructive",
      });
    },
  });

  // Trigger onboarding for new users
  useEffect(() => {
    if (onboardingState.isFirstVisit && !onboardingState.hasCompletedTutorial) {
      const timer = setTimeout(() => {
        setShowWelcomeFlow(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [onboardingState.isFirstVisit, onboardingState.hasCompletedTutorial]);

  // Show contextual guides based on user actions
  useEffect(() => {
    if (activities && activities.length === 0 && onboardingState.hasCompletedTutorial) {
      showGuide("helper", "Het lijkt erop dat je nog geen activiteiten hebt aangemaakt. Klik op 'Nieuwe Activiteit' om te beginnen!");
    }
  }, [activities, onboardingState.hasCompletedTutorial, showGuide]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "normal": return "bg-orange-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "normal": return "bg-orange-100 text-orange-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "planned": return "bg-blue-100 text-blue-800";
      case "archived": return "bg-gray-200 text-gray-700";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDeadlineWarningColor = (dueDate: string | null) => {
    if (!dueDate) return "";
    
    const today = new Date();
    const deadline = new Date(dueDate);
    const diffInDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      // Overdue - red background
      return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    } else if (diffInDays <= 1) {
      // Due today or tomorrow - orange background
      return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    } else if (diffInDays <= 3) {
      // Due within 3 days - yellow background
      return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    }
    
    return "";
  };

  const filteredActivities = activities?.filter(activity => {
    // Archive filter - show archived only if toggle is on
    if (activity.status === "archived" && !showArchived) return false;
    if (activity.status !== "archived" && showArchived) return false;
    
    // Priority filter
    if (!priorityFilters.includes(activity.priority)) return false;
    
    // Contact filter - check if any participants match selected contacts
    if (selectedContacts.length > 0 && activity.participants && activity.participants.length > 0) {
      const hasMatchingParticipant = activity.participants.some(participantEmail => 
        contacts?.some(contact => contact.email === participantEmail && selectedContacts.includes(contact.id))
      );
      if (!hasMatchingParticipant) {
        return false;
      }
    }
    
    // Date range filter
    if (dateRange.from && activity.dueDate) {
      const activityDate = new Date(activity.dueDate);
      const fromDate = new Date(dateRange.from);
      if (activityDate < fromDate) return false;
    }
    
    if (dateRange.to && activity.dueDate) {
      const activityDate = new Date(activity.dueDate);
      const toDate = new Date(dateRange.to);
      if (activityDate > toDate) return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { urgent: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    } else if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsEditActivityModalOpen(true);
  };

  const handleSendEmail = () => {
    setIsEmailModalOpen(true);
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilters(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleContactFilter = (contactId: number) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Helper function to get participant names from emails
  const getParticipantNames = (participantEmails: string[]) => {
    if (!participantEmails || participantEmails.length === 0) return "No participants";
    
    const names = participantEmails.map(email => {
      const contact = contacts?.find(c => c.email === email);
      return contact ? contact.name : email;
    });
    
    return names.join(", ");
  };

  const getContactName = (contactId: number) => {
    return contacts?.find(c => c.id === contactId)?.name || "Unknown";
  };

  const getLinkedActivityTitle = (activityId: number | null) => {
    if (!activityId) return null;
    return activities?.find(a => a.id === activityId)?.title || "Unknown Activity";
  };

  // Filter subtasks that are classified as quick wins
  const quickWinSubtasks = (subtasks || []).filter((subtask: any) => {
    const participantTypes = subtask.participantTypes as Record<string, string> || {};
    return subtask.type === "quick_win" || Object.values(participantTypes).includes("quick_win");
  });

  // Combine traditional quick wins with quick win subtasks for display
  const allQuickWins = [
    ...(quickWins || []),
    ...quickWinSubtasks.map((subtask: any) => ({
      id: `subtask-${subtask.id}`,
      title: subtask.title,
      description: subtask.description,
      linkedActivityId: subtask.linkedActivityId,
      createdAt: subtask.createdAt,
      status: subtask.status === "resolved" || subtask.status === "completed" ? "completed" : "pending",
      impact: "medium", // Default for subtasks
      effort: "low", // Default for subtasks
      isSubtask: true
    }))
  ];

  if (statsLoading || activitiesLoading || contactsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 sm:p-4">
        {/* Stats Cards - Hidden when productivity reflection is active */}
        {(userPreferences?.productivityHealthEnabled === false || healthCardDismissed) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
            <Card className="micro-card micro-fadeIn">
              <CardContent className="p-2 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-red-500 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="text-white" size={10} />
                    </div>
                  </div>
                  <div className="ml-1.5 sm:ml-3 lg:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-neutral-medium truncate">{t("dashboard.urgentTasks")}</p>
                    <p className="text-sm sm:text-lg lg:text-2xl font-semibold text-neutral-dark">{stats?.urgentCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="micro-card micro-fadeIn" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-2 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-orange-500 rounded-lg flex items-center justify-center micro-scaleIn">
                      <Clock className="text-white" size={10} />
                    </div>
                  </div>
                  <div className="ml-1.5 sm:ml-3 lg:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-neutral-medium truncate">{t("dashboard.dueThisWeek")}</p>
                    <p className="text-sm sm:text-lg lg:text-2xl font-semibold text-neutral-dark">{stats?.dueThisWeek || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="micro-card micro-fadeIn" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-2 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-green-500 rounded-lg flex items-center justify-center micro-scaleIn">
                      <CheckCircle className="text-white" size={10} />
                    </div>
                  </div>
                  <div className="ml-1.5 sm:ml-3 lg:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-neutral-medium truncate">Deze week voltooid</p>
                    <p className="text-sm sm:text-lg lg:text-2xl font-semibold text-neutral-dark">{stats?.completedCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="micro-card micro-fadeIn micro-button-press cursor-pointer"
              style={{ animationDelay: '0.3s' }}
              onClick={() => window.location.href = "/contacts"}
            >
              <CardContent className="p-2 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-ms-blue rounded-lg flex items-center justify-center">
                        <Users className="text-white" size={10} />
                      </div>
                    </div>
                    <div className="ml-1.5 sm:ml-3 lg:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-neutral-medium truncate">{t("dashboard.activeContacts")}</p>
                      <p className="text-sm sm:text-lg lg:text-2xl font-semibold text-neutral-dark">{stats?.activeContacts || 0}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="hidden sm:flex text-neutral-medium hover:text-neutral-dark micro-button-press micro-hover-lift">
                    Manage →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Productivity Health Card */}
        {userPreferences?.productivityHealthEnabled !== false && !healthCardDismissed && stats && (
          <div className="mb-6">
            <ProductivityHealthCard
              stats={{
                urgentCount: stats.urgentCount,
                dueThisWeek: stats.dueThisWeek,
                completedCount: stats.completedCount,
                activeContacts: stats.activeContacts,
                overdueCount: stats.overdueCount,
                roadblocksCount: roadblocks?.filter(r => r.status !== 'completed').length || 0,
                quickWinsCount: quickWins?.filter(q => q.status !== 'completed').length || 0,
                subtasksCompleted: subtasks?.filter(s => s.completed).length || 0,
                totalSubtasks: subtasks?.length || 0,
              }}
              onDismiss={() => setHealthCardDismissed(true)}
              onDisable={() => {
                updatePreferencesMutation.mutate({
                  productivityHealthEnabled: false
                });
              }}
              showSettings={true}
            />
          </div>
        )}

        {/* Overdue Tasks Alert - Auto-show task rescue panel */}
        {stats && stats.overdueCount > 0 && (
          <div className="mb-6">
            <OverdueTasksList autoShowRescue={true} />
          </div>
        )}

        {/* Roadblocks Alert */}
        {totalActiveRoadblocks > 0 && (
          <Card 
            className="mb-4 border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors micro-button-press"
            onClick={() => window.location.href = "/roadblocks"}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                    <Shield className="text-white" size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">
                      {totalActiveRoadblocks} Wegversperring{totalActiveRoadblocks > 1 ? 'en' : ''}
                    </h3>
                    <p className="text-sm text-red-600">
                      {taskRoadblocks.length > 0 && roadblocks?.filter(r => r.status !== 'completed' && r.status !== 'resolved').length === 0 
                        ? "Task roadblocks gedetecteerd - klik hier om ze op te lossen"
                        : taskRoadblocks.length > 0 
                        ? `${taskRoadblocks.length} task roadblocks + ${roadblocks?.filter(r => r.status !== 'completed' && r.status !== 'resolved').length || 0} traditionele roadblocks`
                        : "Klik hier om ze op te lossen via de Rescue workflow"
                      }
                    </p>
                  </div>
                </div>
                <div className="text-red-500">
                  <AlertTriangle size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Tasks and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <TodaysTasks />
          </div>
          
          <div className="lg:col-span-2">
            <Card>
              <div className="px-4 md:px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-neutral-dark mb-3">{t('dashboard.recentActivities')}</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">{t('dashboard.sortByPriority')}</SelectItem>
                      <SelectItem value="dueDate">{t('dashboard.sortByDueDate')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterPanelOpen(true)}
                    className="text-neutral-dark border-gray-300 hover:bg-gray-50 w-full sm:w-auto micro-button-press micro-ripple"
                    size="sm"
                  >
                    <Filter size={16} className="mr-2" />
                    Filters
                  </Button>
                </div>
              </div>

          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {filteredActivities?.map((activity) => (
              <Card 
                key={activity.id}
                className="cursor-pointer micro-card micro-button-press micro-slideIn"
                onClick={() => {
                  setSelectedActivity(activity);
                  setIsTaskDetailModalOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Title and Priority */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 ${getPriorityColor(activity.priority)} rounded-full`}></div>
                          <h3 className="font-medium text-neutral-dark text-sm">{activity.title}</h3>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-neutral-medium mt-1 line-clamp-2">{activity.description}</p>
                        )}
                      </div>
                      <Badge className={getPriorityBadgeColor(activity.priority)}>
                        {activity.priority}
                      </Badge>
                    </div>
                    
                    {/* Details Row */}
                    <div className="flex items-center justify-between text-xs text-neutral-medium">
                      <div className="flex items-center gap-4">
                        {activity.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{format(new Date(activity.dueDate), "MMM dd")}</span>
                          </div>
                        )}
                        {activity.participants && activity.participants.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <Users size={12} />
                                  <span>{activity.participants.length}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">{getParticipantNames(activity.participants)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Badge className={getStatusBadgeColor(activity.status)}>
                        {activity.status.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditActivity(activity);
                        }}
                        className="text-ms-blue hover:text-ms-blue-dark h-8 w-8 p-0"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendEmail();
                        }}
                        className="text-neutral-medium hover:text-neutral-dark h-8 w-8 p-0"
                      >
                        <Mail size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!filteredActivities?.length && (
              <div className="text-center py-8 text-neutral-medium">
                No activities found matching your filters
              </div>
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivities?.map((activity) => (
                  <tr 
                    key={activity.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${getDeadlineWarningColor(activity.dueDate ? activity.dueDate.toString() : null)}`}
                    onClick={() => {
                      setSelectedActivity(activity);
                      setIsTaskDetailModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 ${getPriorityColor(activity.priority)} rounded-full mr-3`}></div>
                        <div>
                          <div className="text-sm font-medium text-neutral-dark">{activity.title}</div>
                          <div className="text-sm text-neutral-medium">{activity.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getPriorityBadgeColor(activity.priority)}>
                        {activity.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-dark">
                      {activity.dueDate ? format(new Date(activity.dueDate), "MMM dd, yyyy") : "No due date"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-300 rounded-full mr-2"></div>
                        {activity.participants && activity.participants.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-neutral-dark cursor-help">
                                  {activity.participants.length} participant{activity.participants.length > 1 ? 's' : ''}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">{getParticipantNames(activity.participants)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-neutral-dark">No participants</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusBadgeColor(activity.status)}>
                        {activity.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(activity);
                          }}
                          className="text-ms-blue hover:text-ms-blue-dark"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendEmail();
                          }}
                          className="text-neutral-medium hover:text-neutral-dark"
                        >
                          <Mail size={16} />
                        </Button>
                        {activity.status === "archived" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              unarchiveMutation.mutate(activity.id);
                            }}
                            disabled={unarchiveMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                            title="Restore activity"
                          >
                            <ArchiveRestore size={16} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveMutation.mutate(activity.id);
                            }}
                            disabled={archiveMutation.isPending}
                            className="text-gray-600 hover:text-gray-700"
                            title="Archive activity"
                          >
                            <Archive size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredActivities?.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-medium">
                      No activities found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Wins Section */}
        <Card className="mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-dark">{t('dashboard.recentQuickWins')}</h3>
              <Button variant="ghost" className="text-sm text-ms-blue hover:text-ms-blue-dark font-medium">
                {t('dashboard.viewAll')}
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allQuickWins?.slice(0, 6).map((win) => (
                <div
                  key={win.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-neutral-dark">{win.title}</h4>
                      <p className="text-xs text-neutral-medium mt-1">{win.description}</p>
                      {win.linkedActivityId && (
                        <div className="flex items-center mt-2">
                          <span className="text-xs text-neutral-medium">Linked to:</span>
                          <span className="text-xs text-ms-blue ml-1">
                            {getLinkedActivityTitle(win.linkedActivityId)}
                          </span>
                        </div>
                      )}
                      {'isSubtask' in win && win.isSubtask && (
                        <div className="flex items-center mt-1">
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            From Subtask
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center mt-2 gap-1">
                        <Badge className={`text-xs ${win.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {win.status === 'completed' ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-2">
                      <Trophy className={win.status === 'completed' ? 'text-green-500' : 'text-yellow-500'} size={16} />
                    </div>
                  </div>
                </div>
              ))}
              {!allQuickWins?.length && (
                <div className="col-span-full text-center text-neutral-medium py-8">
                  No quick wins created yet
                </div>
              )}
            </div>
          </div>
        </Card>
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
                  />
                  <span className="ml-2 text-sm text-neutral-dark capitalize">{priority}</span>
                  <div className={`w-3 h-3 ${getPriorityColor(priority)} rounded-full ml-auto`}></div>
                </label>
              ))}
            </div>
          </div>

          {/* Archive Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Activity Status</h4>
            <label className="flex items-center">
              <Checkbox
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked === true)}
              />
              <span className="ml-2 text-sm text-neutral-dark">Show archived activities</span>
            </label>
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Due Date</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-medium mb-1">From</label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-medium mb-1">To</label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Contact Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Filter by Contacts</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {contacts?.map((contact) => (
                <label key={contact.id} className="flex items-start space-x-2">
                  <Checkbox
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={() => toggleContactFilter(contact.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-dark">{contact.name}</div>
                    <div className="text-xs text-neutral-medium truncate">{contact.company}</div>
                    <div className="text-xs text-neutral-medium">{contact.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button
                onClick={handleSendEmail}
                className="w-full bg-ms-blue hover:bg-ms-blue-dark text-white"
              >
                <Mail size={16} className="mr-2" />
                Send Email to Selected
              </Button>
              <Button
                variant="outline"
                className="w-full text-neutral-dark border-gray-300 hover:bg-gray-50"
              >
                <Download size={16} className="mr-2" />
                Export Filtered Data
              </Button>
            </div>
          </div>
        </aside>
      )}

      </div>

      {/* Modals */}
      <NewActivityModal
        open={isNewActivityModalOpen}
        onOpenChange={setIsNewActivityModalOpen}
      />

      {selectedActivity && (
        <EditActivityModal
          activity={selectedActivity}
          open={isEditActivityModalOpen}
          onOpenChange={setIsEditActivityModalOpen}
        />
      )}

      {contacts && (
        <EmailModal
          open={isEmailModalOpen}
          onOpenChange={setIsEmailModalOpen}
          contacts={contacts}
        />
      )}

      {selectedActivity && (
        <TaskDetailModal
          activity={selectedActivity}
          isOpen={isTaskDetailModalOpen}
          onClose={() => setIsTaskDetailModalOpen(false)}
        />
      )}

      {/* Onboarding Components */}
      <WelcomeFlow
        isOpen={showWelcomeFlow}
        onClose={() => setShowWelcomeFlow(false)}
      />

      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={completeTutorial}
      />

      <CharacterGuide
        character={onboardingState.guideCharacter}
        message={onboardingState.guidanceMessage}
        isVisible={onboardingState.showCharacterGuide}
        onDismiss={hideGuide}
        position="bottom-right"
        showActions={true}
        actions={[
          {
            label: "Start Tutorial",
            action: () => {
              setShowTutorial(true);
              hideGuide();
            }
          },
          {
            label: "Niet nu",
            action: hideGuide,
            variant: "outline"
          }
        ]}
      />
    </div>
  );
}
