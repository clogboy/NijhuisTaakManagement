import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "@/hooks/useTranslations";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useLowStimulus } from "@/contexts/LowStimulusContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Focus } from "lucide-react";
import WelcomeFlow from "@/components/onboarding/WelcomeFlow";
import OnboardingTutorial from "@/components/onboarding/OnboardingTutorial";
import CharacterGuide from "@/components/onboarding/CharacterGuide";
import DeepFocusBlock from "@/components/DeepFocusBlock";
import {
  AlertTriangle,
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
  Shield,
  BarChart3,
  Clock
} from "lucide-react";
import { Activity, Contact, QuickWin } from "@shared/schema";
import NewActivityModal from "@/components/modals/NewActivityModal";
import EditActivityModal from "@/components/modals/EditActivityModal";
import EmailModal from "@/components/modals/EmailModal";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";
import TodaysTasks from "@/components/TodaysTasks";
import ProductivityHealthCard from "@/components/productivity/ProductivityHealthCard";
import { DashboardLoadingScreen } from "@/components/ui/loading-animation";

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

interface DashboardProps {
  lowStimulusMode?: boolean;
  setLowStimulusMode?: (value: boolean) => void;
}

function DashboardContent() {
  const { t } = useTranslations();
  const { state: onboardingState, completeTutorial, showGuide, hideGuide } = useOnboarding();
  const { activateLowStimulus, deactivateLowStimulus } = useLowStimulus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isDeepFocusModalOpen, setIsDeepFocusModalOpen] = useState(false);
  const [selectedFocusActivity, setSelectedFocusActivity] = useState<Activity | null>(null);
  const [selectedFocusSubtask, setSelectedFocusSubtask] = useState<any | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [sortBy, setSortBy] = useState<string>("priority");
  const [priorityFilters, setPriorityFilters] = useState<string[]>(["urgent", "normal", "low"]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [showWelcomeFlow, setShowWelcomeFlow] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRemainingTime = () => {
    if (!activeDeepFocus || !activeDeepFocus.scheduledEnd) return null;

    const endTime = new Date(activeDeepFocus.scheduledEnd);
    const now = currentTime;
    const diffMs = endTime.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    // Show seconds only in the last 2 minutes
    if (totalMinutes < 2) {
      const minutes = Math.floor(totalMinutes);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Show exact minutes in the last 10 minutes
    if (totalMinutes < 10) {
      return `${totalMinutes} min`;
    }

    // Round up to nearest 5 minutes for longer sessions
    const roundedMinutes = Math.ceil(totalMinutes / 5) * 5;
    return `~${roundedMinutes} min`;
  };

  const getSelectedTaskName = () => {
    if (activeDeepFocus?.selectedActivityId && activities) {
      const activity = activities.find(a => a.id === activeDeepFocus.selectedActivityId);
      if (activity) return activity.title;
    }
    if (activeDeepFocus?.selectedSubtaskId && subtasks) {
      const subtask = subtasks.find(s => s.id === activeDeepFocus.selectedSubtaskId);
      if (subtask) return subtask.title;
    }
    return "Algemene focus sessie";
  };

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: quickWins } = useQuery<QuickWin[]>({
    queryKey: ["/api/quickwins"],
  });

  const { data: subtasks, isLoading: subtasksLoading } = useQuery<any[]>({
    queryKey: ["/api/subtasks"],
  });

  const { data: roadblocks, isLoading: roadblocksLoading } = useQuery<any[]>({
    queryKey: ["/api/roadblocks"],
  });

  const { data: userPreferences } = useQuery<any>({
    queryKey: ["/api/user/preferences"],
  });

  // Smart insights completely disabled to prevent crashes
  const smartInsights = null;

  const { data: activeDeepFocus } = useQuery<any>({
    queryKey: ["/api/deep-focus/active"],
    refetchInterval: 5000, // Check every 5 seconds
  });

  const { data: currentFlowStrategy } = useQuery<any>({
    queryKey: ["/api/flow/current-strategy"],
  });

  const { data: flowRecommendations } = useQuery<any>({
    queryKey: ["/api/flow/recommendations"],
    enabled: !!currentFlowStrategy,
  });

  const { data: dailyReflections } = useQuery<any>({
    queryKey: ["/api/daily-reflections"],
  });

  // Auto-deactivate low stimulus mode when no active deep focus
  useEffect(() => {
    if (!activeDeepFocus && lowStimulus) {
      deactivateLowStimulus();
    }
  }, [activeDeepFocus, lowStimulus, deactivateLowStimulus]);

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

  // Create and start deep focus session
  const createFocusMutation = useMutation({
    mutationFn: async ({ title, duration, subtaskId }: { title: string; duration: number; subtaskId?: number }) => {
      const now = new Date();
      const endTime = new Date(now.getTime() + duration * 60000);

      // Create the block
      const createResponse = await apiRequest("/api/deep-focus", "POST", {
        title,
        scheduledStart: now,
        scheduledEnd: endTime,
        focusType: "deep",
        lowStimulusMode: true,
      });

      const block = await createResponse.json();

      // Start the block with selected subtask
      const startResponse = await apiRequest(`/api/deep-focus/${block.id}/start`, "POST", {
        selectedSubtaskId: subtaskId
      });

      return await startResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus"] });
      activateLowStimulus();
      // Don't close the modal - keep it open to show the active session
      setSelectedFocusActivity(null);
      setSelectedFocusSubtask(null);
      toast({
        title: "Deep Focus gestart",
        description: "Je bent nu in deep focus modus met countdown timer.",
      });
    },
    onError: () => {
      toast({
        title: "Fout bij starten",
        description: "Kon deep focus sessie niet starten.",
        variant: "destructive",
      });
    },
  });

  const createAndStartDeepFocus = () => {
    if (selectedFocusSubtask) {
      createFocusMutation.mutate({
        title: `Deep Focus: ${selectedFocusSubtask.title}`,
        duration: selectedDuration,
        subtaskId: selectedFocusSubtask.id
      });
    }
  };

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

  // Show loading screen if critical data is still loading
  const isInitialLoading = statsLoading || activitiesLoading || contactsLoading || subtasksLoading;

  if (isInitialLoading) {
    return <DashboardLoadingScreen />;
  }

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

    // Set both to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

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

  // Helper function to check if activity has open subtasks
  const hasOpenSubtasks = (activityId: number) => {
    if (!subtasks || subtasks.length === 0) return true; // Show activity if no subtasks data
    return subtasks.some(subtask => 
      subtask.linkedActivityId === activityId && 
      subtask.status !== "completed" && 
      subtask.status !== "resolved"
    );
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
  })?.sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { urgent: 3, normal: 2, low: 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 1) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 1);
    } else if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  }) || [];

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
        {/* Header with Low Stimulus Mode Toggle */}
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="low-stimulus-mode" className="text-sm text-neutral-medium">
              {lowStimulus ? "🟠 Focus modus" : "🟢 Alle functies"}
            </Label>
            <Switch 
              id="low-stimulus-mode"
              checked={lowStimulus}
              onCheckedChange={(checked) => setLowStimulus?.(checked)}
            />
          </div>
        </div>
        {/* Low Stimulus Mode - Simplified View */}
        {lowStimulus ? (
          <div className="space-y-8">

            {/* Productivity Health Card - Keep this visible in focus mode */}
            {userPreferences?.productivityHealthEnabled === true && !healthCardDismissed && stats && (
              <ProductivityHealthCard
                stats={{
                  urgentCount: stats.urgentCount || 0,
                  dueThisWeek: stats.dueThisWeek || 0,
                  completedCount: stats.completedCount || 0,
                  activeContacts: stats.activeContacts || 0,
                  overdueCount: stats.overdueCount || 0,
                  roadblocksCount: stats.roadblocksCount || 0,
                  quickWinsCount: quickWins?.length || 0,
                  subtasksCompleted: subtasks?.filter(s => s.completed).length || 0,
                  totalSubtasks: subtasks?.length || 0
                }}
                onDismiss={() => setHealthCardDismissed(true)}
                onDisable={() => updatePreferencesMutation.mutate({ productivityHealthEnabled: false })}
                showSettings={true}
              />
            )}

            {/* Gentle intro message */}
            <Card className="border-blue-100 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-blue-300 rounded-full"></div>
                  <p className="text-blue-700 text-base">
                    Focus modus actief. Rustige weergave van je belangrijkste taken.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Productivity Reflections Box */}
                <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-medium text-gray-700 mb-6 flex items-center">
                      <BarChart3 className="mr-3 text-gray-500" size={24} />
                      Reflectie & Voortgang
                    </h3>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="text-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {stats?.completedCount || 0}
                        </div>
                        <div className="text-sm text-gray-500">Afgerond vandaag</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {stats?.dueThisWeek || 0}
                        </div>
                        <div className="text-sm text-gray-500">Deze week</div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-base text-gray-600 leading-relaxed">
                        {dailyReflections?.insights?.[0] || 
                         ((stats?.completedCount || 0) > 0 
                          ? "Je hebt al vooruitgang geboekt vandaag. Elke afgeronde taak draagt bij aan je doelen."
                          : (stats?.urgentCount || 0) > 0
                          ? "Urgente zaken vragen focus en aandacht. Neem de tijd die je nodig hebt."
                          : "Elke stap voorwaarts telt, ook de kleine. Vooruitgang hoeft niet perfect te zijn om waardevol te zijn."
                         )
                        }
                      </p>
                      {dailyReflections && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-500">
                            Laatste reflectie: {new Date(dailyReflections.date).toLocaleDateString('nl-NL')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Wins - Only show non-completed wins */}
                {quickWins && quickWins.filter((win: any) => win.status !== 'completed').length > 0 && (
                  <Card className="border-gray-100">
                    <CardContent className="p-8">
                      <h2 className="text-xl font-medium text-gray-700 mb-6 flex items-center">
                        <Trophy className="mr-3 text-gray-500" size={24} />
                        Quick wins
                      </h2>
                      <div className="space-y-4">
                        {quickWins.filter((win: any) => win.status !== 'completed').slice(0, 3).map((win: any) => (
                          <div key={win.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-700 mb-2">{win.title}</h4>
                                <p className="text-sm text-gray-500 mb-2">{win.description}</p>
                                {win.estimatedMinutes && (
                                  <p className="text-xs text-gray-400">
                                    ~{win.estimatedMinutes} minuten
                                  </p>
                                )}
                              </div>
                              <Badge className="ml-4 bg-yellow-50 text-yellow-700 border-yellow-200">
                                Quick win
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Deep Focus Button - Minimal and unobtrusive */}
                <Card className="border-gray-100">
                  <CardContent className="p-6">
                    <Button
                      onClick={() => setIsDeepFocusModalOpen(true)}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    >
                      <Focus size={18} />
                      Enter Deep Focus
                    </Button>
                  </CardContent>
                </Card>

                {/* Today's Tasks - Simplified */}
                <Card className="border-gray-100">
                  <CardContent className="p-8">
                    <h2 className="text-xl font-medium text-gray-700 mb-6 flex items-center">
                      <Clock className="mr-3 text-gray-500" size={24} />
                      Mijn acties
                    </h2>
                    <TodaysTasks />
                  </CardContent>
                </Card>

                {/* Delegatable Tasks */}
                {activities && activities.filter((activity: any) => 
                  activity.status === "pending" && 
                  activity.estimatedDuration && activity.estimatedDuration <= 60
                ).length > 0 && (
                  <Card className="border-gray-100">
                    <CardContent className="p-8">
                      <h2 className="text-xl font-medium text-gray-700 mb-6 flex items-center">
                        <Users className="mr-3 text-gray-500" size={24} />
                        Mogelijke delegatie
                      </h2>
                      <div className="space-y-4">
                        {activities.filter((activity: any) => 
                          activity.status === "pending" && 
                          activity.estimatedDuration && activity.estimatedDuration <= 60
                        ).slice(0, 3).map((activity: any) => (
                          <div key={activity.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-700 mb-2">{activity.title}</h4>
                                <p className="text-sm text-gray-500 mb-2">{activity.description}</p>
                                {activity.dueDate && (
                                  <p className="text-xs text-gray-400">
                                    Deadline: {format(new Date(activity.dueDate), 'dd MMM yyyy')}
                                  </p>
                                )}
                              </div>
                              <Badge className="ml-4 bg-purple-50 text-purple-700 border-purple-200">
                                Delegeren
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Simple Exit Message */}
            <Card className="border-green-100 bg-green-50 mt-8">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-green-700 text-base">
                    Klaar om meer te doen? Schakel terug naar alle functies met de toggle rechtsboven.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
        {/* Flow Strategy Display */}
        {currentFlowStrategy && (
          <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="text-white" size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      {currentFlowStrategy.strategyName}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {currentFlowStrategy.personalityType?.replace('_', ' ')} • Actieve flow strategie
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    Actief
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        <div className="space-y-6">
          {/* Dashboard stats and main content will go here */}
          <div className="text-center text-gray-500">
            Dashboard loading...
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  try {
    return <DashboardContent />;
  } catch (error) {
    console.error('Dashboard render error:', error);
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Dashboard Error</h2>
          <p className="text-red-600">There was an issue loading the dashboard. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}
