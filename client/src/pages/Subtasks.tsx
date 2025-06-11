import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, CheckCircle, Clock, AlertTriangle, Users, Calendar } from "lucide-react";
import { Subtask, Activity, Contact } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";
import AppLayout from "@/components/layout/AppLayout";

export default function Subtasks() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "quick_win" | "roadblock">("all");

  const { data: subtasks, isLoading: subtasksLoading } = useQuery<Subtask[]>({
    queryKey: ["/api/subtasks"],
    queryFn: () => fetch("/api/subtasks", { credentials: "include" }).then(res => res.json()),
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  // Create maps for lookup
  const activityMap = activities?.reduce((acc, activity) => {
    acc[activity.id] = activity;
    return acc;
  }, {} as Record<number, Activity>) || {};

  const contactMap = contacts?.reduce((acc, contact) => {
    acc[contact.email] = contact;
    return acc;
  }, {} as Record<string, Contact>) || {};

  // Filter subtasks based on search and type
  const filteredSubtasks = subtasks?.filter(subtask => {
    const matchesSearch = 
      subtask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subtask.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activityMap[subtask.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === "all" || subtask.type === selectedType;
    
    return matchesSearch && matchesType;
  }) || [];

  // Group subtasks by status
  const subtasksByStatus = {
    pending: filteredSubtasks.filter(s => s.status === "pending"),
    in_progress: filteredSubtasks.filter(s => s.status === "in_progress"),
    completed: filteredSubtasks.filter(s => s.status === "completed"),
    resolved: filteredSubtasks.filter(s => s.status === "resolved"),
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "quick_win": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "roadblock": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": 
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const updateSubtaskMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<Subtask> }) =>
      apiRequest("PUT", `/api/subtasks/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      toast({
        title: "Succes",
        description: "Subtaak succesvol bijgewerkt",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Kon subtaak niet bijwerken",
        variant: "destructive",
      });
    },
  });

  const toggleSubtaskStatus = (subtask: Subtask) => {
    const newStatus = subtask.status === "completed" || subtask.status === "resolved" 
      ? "pending" 
      : subtask.type === "quick_win" ? "completed" : "resolved";
    
    updateSubtaskMutation.mutate({
      id: subtask.id,
      updates: { 
        status: newStatus,
        completedDate: (newStatus === "completed" || newStatus === "resolved") ? new Date() : null
      }
    });
  };

  const renderSubtaskCard = (subtask: Subtask) => {
    const linkedActivity = activityMap[subtask.linkedActivityId];
    const isOverdue = subtask.dueDate && new Date(subtask.dueDate) < new Date() && 
                     subtask.status !== "completed" && subtask.status !== "resolved";

    return (
      <Card key={subtask.id} className={`transition-all hover:shadow-md ${isOverdue ? "ring-2 ring-red-200" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium mb-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSubtaskStatus(subtask)}
                  className="p-1 h-6 w-6"
                  disabled={updateSubtaskMutation.isPending}
                >
                  <CheckCircle className={`h-4 w-4 ${
                    subtask.status === "completed" || subtask.status === "resolved" 
                      ? "text-green-600" : "text-gray-400"
                  }`} />
                </Button>
                <span className={subtask.status === "completed" || subtask.status === "resolved" ? "line-through text-gray-500" : ""}>
                  {subtask.title}
                </span>
              </CardTitle>
              <div className="flex gap-2 mb-2">
                <Badge className={getTypeColor(subtask.type)}>
                  {subtask.type === "quick_win" ? "Quick Win" : "Wegversperring"}
                </Badge>
                <Badge className={getStatusColor(subtask.status)}>
                  {subtask.status === "pending" ? "In wachtrij" :
                   subtask.status === "in_progress" ? "In uitvoering" :
                   subtask.status === "completed" ? "Voltooid" : "Opgelost"}
                </Badge>
                <Badge className={getPriorityColor(subtask.priority)}>
                  {subtask.priority === "high" ? "Hoog" :
                   subtask.priority === "medium" ? "Gemiddeld" : "Laag"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {subtask.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {subtask.description}
            </p>
          )}
          
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="font-medium">Gekoppeld aan:</span>
              <span>{linkedActivity?.title || "Onbekende activiteit"}</span>
            </div>
            
            {subtask.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  Vervaldatum: {format(new Date(subtask.dueDate), "dd/MM/yyyy")}
                </span>
                {isOverdue && <AlertTriangle className="h-3 w-3 text-red-600" />}
              </div>
            )}
            
            {subtask.participants && subtask.participants.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>Deelnemers: {subtask.participants.length}</span>
                <div className="flex gap-1">
                  {subtask.participants.slice(0, 3).map((email, idx) => {
                    const contact = contactMap[email];
                    return (
                      <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                        {contact?.name || email.split('@')[0]}
                      </span>
                    );
                  })}
                  {subtask.participants.length > 3 && (
                    <span className="text-xs">+{subtask.participants.length - 3}</span>
                  )}
                </div>
              </div>
            )}
            
            {subtask.completedDate && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Voltooid: {format(new Date(subtask.completedDate), "dd/MM/yyyy")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Subtaken</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Beheer Quick Wins en Wegversperringen gekoppeld aan je activiteiten. 
              Deelnemers die ook toegang hebben tot het platform zullen deze subtaken zien in hun eigen agenda's.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe subtaak
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Zoek subtaken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("all")}
            >
              Alle
            </Button>
            <Button
              variant={selectedType === "quick_win" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("quick_win")}
            >
              Quick Wins
            </Button>
            <Button
              variant={selectedType === "roadblock" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("roadblock")}
            >
              Wegversperringen
            </Button>
          </div>
        </div>

        {subtasksLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Subtaken laden...</div>
          </div>
        ) : filteredSubtasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Geen subtaken gevonden
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedType !== "all" 
                  ? "Geen subtaken komen overeen met je zoekfilters"
                  : "Je hebt nog geen subtaken aangemaakt"
                }
              </p>
              {!searchQuery && selectedType === "all" && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste subtaak aanmaken
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending */}
            {subtasksByStatus.pending.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  In wachtrij ({subtasksByStatus.pending.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subtasksByStatus.pending.map(renderSubtaskCard)}
                </div>
              </div>
            )}

            {/* In Progress */}
            {subtasksByStatus.in_progress.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  In uitvoering ({subtasksByStatus.in_progress.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subtasksByStatus.in_progress.map(renderSubtaskCard)}
                </div>
              </div>
            )}

            {/* Completed/Resolved */}
            {(subtasksByStatus.completed.length > 0 || subtasksByStatus.resolved.length > 0) && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Voltooid ({subtasksByStatus.completed.length + subtasksByStatus.resolved.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...subtasksByStatus.completed, ...subtasksByStatus.resolved].map(renderSubtaskCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}