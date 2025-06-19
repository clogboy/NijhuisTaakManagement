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

export default function Dashboard({ lowStimulusMode: lowStimulus = false, setLowStimulusMode: setLowStimulus }: DashboardProps = {}) {
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

  const { data: quickWins, isLoading: quickWinsLoading } = useQuery<QuickWin[]>({
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

  const { data: smartInsights } = useQuery<any>({
    queryKey: ["/api/smart-insights"],
  });

  const { data: activeDeepFocus } = useQuery<any>({
    queryKey: ["/api/deep-focus/active"],
    refetchInterval: 5000, // Check every 5 seconds
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
      // Use smart prioritization if available, fall back to basic priority
      if (smartInsights) {
        const allPrioritizedActivities = [
          ...smartInsights.topPriority,
          ...smartInsights.quickWins,
          ...Object.values(smartInsights.timeSlotSuggestions).flat()
        ];
        
        const aSmartActivity = allPrioritizedActivities.find((sa: any) => sa.id === a.id);
        const bSmartActivity = allPrioritizedActivities.find((sa: any) => sa.id === b.id);
        
        if (aSmartActivity && bSmartActivity) {
          return bSmartActivity.smartPriority.score - aSmartActivity.smartPriority.score;
        } else if (aSmartActivity) {
          return -1;
        } else if (bSmartActivity) {
          return 1;
        }
      }
      
      // Fallback to basic priority
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
            {userPreferences?.productivityHealthEnabled === true && !healthCardDismissed && (
              <ProductivityHealthCard
                onDismiss={() => setHealthCardDismissed(true)}
                userPreferences={userPreferences}
                updatePreferences={updatePreferencesMutation.mutate}
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
                        {(stats?.completedCount || 0) > 0 
                          ? "Je hebt al vooruitgang geboekt vandaag. Elke afgeronde taak draagt bij aan je doelen."
                          : (stats?.urgentCount || 0) > 0
                          ? "Urgente zaken vragen focus en aandacht. Neem de tijd die je nodig hebt."
                          : "Elke stap voorwaarts telt, ook de kleine. Vooruitgang hoeft niet perfect te zijn om waardevol te zijn."
                        }
                      </p>
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
              className={`micro-card micro-fadeIn ${activeDeepFocus ? 'border-2 border-blue-500 bg-blue-50' : 'micro-button-press cursor-pointer'}`}
              style={{ animationDelay: '0.3s' }}
              onClick={activeDeepFocus ? undefined : () => setIsDeepFocusModalOpen(true)}
            >
              <CardContent className="p-2 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 ${activeDeepFocus ? 'bg-blue-500 animate-pulse' : 'bg-purple-500'} rounded-lg flex items-center justify-center`}>
                        <Focus className="text-white" size={10} />
                      </div>
                    </div>
                    <div className="ml-1.5 sm:ml-3 lg:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-neutral-medium truncate">
                        {activeDeepFocus ? getSelectedTaskName() : 'Deep Focus'}
                      </p>
                      <p className="text-sm sm:text-lg lg:text-2xl font-semibold text-neutral-dark">
                        {activeDeepFocus ? getRemainingTime() || 'Actief' : 'Start'}
                      </p>
                    </div>
                  </div>
                  {!activeDeepFocus && (
                    <Button variant="ghost" size="sm" className="hidden sm:flex text-neutral-medium hover:text-neutral-dark micro-button-press micro-hover-lift">
                      Enter →
                    </Button>
                  )}
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
          </>
        )}

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

      {/* Low Stimulus Mode Exit Button - only show when actually in low stimulus mode */}
      {lowStimulus && activeDeepFocus && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={deactivateLowStimulus}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-2 border-red-500 text-red-600 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-2" />
            Exit Focus Mode
          </Button>
        </div>
      )}

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

      {/* Deep Focus Task Selection Modal */}
      <Dialog open={isDeepFocusModalOpen} onOpenChange={(open) => {
        setIsDeepFocusModalOpen(open);
        if (!open) {
          setSelectedFocusActivity(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Focus size={20} />
              {activeDeepFocus ? "Actieve Deep Focus Sessie" : "Deep Focus Starten"}
            </DialogTitle>
            <DialogDescription>
              {activeDeepFocus ? 
                "Je bent momenteel in een deep focus sessie." :
                "Selecteer een taak om op te focussen. We bereiden je omgeving voor en schakelen over naar focus modus."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {activeDeepFocus ? (
              // Active session display
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-blue-900 mb-2">
                      {getRemainingTime() || "Actief"}
                    </div>
                  </div>
                  
                  {/* Show full subtask card */}
                  {activeDeepFocus && subtasks && (
                    <div className="bg-white border border-blue-300 rounded-lg p-3">
                      {(() => {
                        // Debug: check what ID we have
                        console.log('Active deep focus:', activeDeepFocus);
                        console.log('Looking for subtask ID:', activeDeepFocus.selectedSubtaskId);
                        console.log('Available subtasks:', subtasks);
                        
                        const currentSubtask = subtasks.find(s => s.id === activeDeepFocus.selectedSubtaskId);
                        console.log('Found subtask:', currentSubtask);
                        
                        if (!currentSubtask) {
                          return (
                            <div className="text-center text-gray-500">
                              <p>Geen taak geselecteerd</p>
                              <p className="text-xs">ID: {activeDeepFocus.selectedSubtaskId}</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">{currentSubtask.title}</span>
                              <div className="ml-auto">
                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                                  Urgent
                                </span>
                              </div>
                            </div>
                            {currentSubtask.description && (
                              <p className="text-sm text-gray-600 ml-4">{currentSubtask.description}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">💡 Focus Tips</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Schakel alle notificaties uit</li>
                    <li>• Houd water binnen handbereik</li>
                    <li>• Maak notities van afleidende gedachten</li>
                    <li>• Neem korte pauzes als je moe wordt</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Duration Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Sessie duur:</label>
                  <div className="flex gap-2">
                    {[30, 60, 90, 120].map((duration) => (
                      <button
                        key={duration}
                        onClick={() => setSelectedDuration(duration)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedDuration === duration
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {duration < 60 ? `${duration}m` : `${duration / 60}u`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgent Subtasks Section */}
                {subtasks?.filter(s => s.status === 'pending').length > 0 ? (
                  <div>
                    <label className="text-sm font-medium text-orange-700 mb-2 block">Selecteer een actiepunt om op te focussen:</label>
                    <div className="space-y-2">
                      {subtasks?.filter(s => s.status === 'pending').map((subtask) => (
                        <div 
                          key={`subtask-${subtask.id}`}
                          onClick={() => {
                            setSelectedFocusSubtask(subtask);
                            setSelectedFocusActivity(null);
                          }}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedFocusSubtask?.id === subtask.id 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">{subtask.title}</span>
                          </div>
                          {subtask.description && (
                            <p className="text-xs text-gray-600 mt-1 ml-4">{subtask.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    <p>Geen urgente actiepunten beschikbaar voor focus sessie.</p>
                  </div>
                )}
              </div>
            )}

            {selectedFocusSubtask && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-sm text-blue-900 mb-2">
                  Voorbereiding voor: {selectedFocusSubtask.title}
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Sluit onnodige browsertabs en applicaties</li>
                  <li>• Zet telefoon op stil of niet storen modus</li>
                  <li>• Zorg dat benodigde bronnen en documenten klaar staan</li>
                  <li>• Neem even de tijd om je specifieke doelen helder te krijgen</li>
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeepFocusModalOpen(false)}
                className="flex-1"
              >
                {activeDeepFocus ? "Sluiten" : "Annuleren"}
              </Button>
              {activeDeepFocus ? (
                <Button
                  onClick={async () => {
                    try {
                      // End the deep focus session via API
                      await apiRequest(`/api/deep-focus/${activeDeepFocus.id}/end`, "POST", {
                        productivityRating: 4, // Default good rating
                        completionNotes: "Session ended by user"
                      });
                      
                      // Update UI state
                      deactivateLowStimulus();
                      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus/active"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus"] });
                      setIsDeepFocusModalOpen(false);
                      
                      toast({
                        title: "Deep Focus beëindigd",
                        description: "Je sessie is gestopt. Welkom terug!",
                      });
                    } catch (error) {
                      toast({
                        title: "Fout bij beëindigen",
                        description: "Kon sessie niet beëindigen.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Beëindig Sessie
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (selectedFocusSubtask) {
                      createAndStartDeepFocus();
                    }
                  }}
                  disabled={!selectedFocusSubtask || createFocusMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createFocusMutation.isPending ? "Wordt gestart..." : "Start Focus Sessie"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
