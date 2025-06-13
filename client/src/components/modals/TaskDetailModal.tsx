import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  ListChecks, 
  Calendar, 
  Users, 
  Clock,
  Plus,
  Target,
  Zap,
  Construction
} from "lucide-react";
import { Activity, TaskComment, Subtask, Contact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TaskDetailModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ activity, isOpen, onClose }: TaskDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    participants: [] as string[],
    dueDate: "",
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<TaskComment[]>({
    queryKey: ["/api/activities", activity.id, "comments"],
    queryFn: () => fetch(`/api/activities/${activity.id}/comments`).then(res => res.json()),
    enabled: isOpen,
  });

  // Fetch subtasks
  const { data: allSubtasks = [] } = useQuery<Subtask[]>({
    queryKey: ["/api/subtasks"],
    enabled: isOpen,
  });

  // Filter subtasks for this activity
  const subtasks = allSubtasks.filter(subtask => subtask.linkedActivityId === activity.id);

  // Fetch contacts for participants
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: isOpen,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      return apiRequest("/api/task-comments", "POST", {
        activityId: activity.id,
        comment: comment.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activity.id, "comments"] });
      setNewComment("");
      toast({
        title: "Opmerking toegevoegd",
        description: "Je opmerking is succesvol toegevoegd",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Kon opmerking niet toevoegen",
        variant: "destructive",
      });
    },
  });

  // Add subtask mutation
  const addSubtaskMutation = useMutation({
    mutationFn: async (subtask: typeof newSubtask) => {
      return apiRequest("/api/subtasks", "POST", {
        ...subtask,
        type: "task", // Default type
        linkedActivityId: activity.id,
        dueDate: subtask.dueDate ? new Date(subtask.dueDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setNewSubtask({
        title: "",
        description: "",
        priority: "medium",
        participants: [],
        dueDate: "",
      });
      toast({
        title: "Subtaak toegevoegd",
        description: "Subtaak is toegevoegd aan deze activiteit",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Kon subtaak niet toevoegen",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.title.trim()) {
      addSubtaskMutation.mutate(newSubtask);
    }
  };

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
      case "resolved": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case "quick_win": return <Zap className="h-4 w-4 text-yellow-600" />;
      case "roadblock": return <Construction className="h-4 w-4 text-red-600" />;
      default: return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{activity.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getPriorityColor(activity.priority)}>
                  {activity.priority}
                </Badge>
                <Badge className={getStatusColor(activity.status)}>
                  {activity.status}
                </Badge>
                {activity.dueDate && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Due {format(new Date(activity.dueDate), "MMM d")}
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {activity.description && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{activity.description}</p>
            </div>
          )}

          <Tabs defaultValue="comments" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comments">Opmerkingen</TabsTrigger>
              <TabsTrigger value="subtasks">Subtaken</TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Opmerking toevoegen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        placeholder="Voeg een opmerking toe..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      <Button 
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Opmerking toevoegen
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">User</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </CardContent>
                      </Card>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Nog geen opmerkingen. Voeg de eerste toe!
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="subtasks" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5" />
                        Subtaak toevoegen
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Maak subtaken die deelnemers kunnen markeren als taken, quick wins of wegversperringen.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        placeholder="Subtaak titel..."
                        value={newSubtask.title}
                        onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                      />
                      <Textarea
                        placeholder="Beschrijving..."
                        value={newSubtask.description}
                        onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm font-medium">Prioriteit</label>
                          <select
                            value={newSubtask.priority}
                            onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value as "low" | "medium" | "high" })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="low">Laag</option>
                            <option value="medium">Gemiddeld</option>
                            <option value="high">Hoog</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Vervaldatum</label>
                          <Input
                            type="date"
                            value={newSubtask.dueDate}
                            onChange={(e) => setNewSubtask({ ...newSubtask, dueDate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Deelnemers</label>
                        <div className="space-y-2">
                          {contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`contact-${contact.id}`}
                                checked={newSubtask.participants.includes(contact.email)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewSubtask({
                                      ...newSubtask,
                                      participants: [...newSubtask.participants, contact.email]
                                    });
                                  } else {
                                    setNewSubtask({
                                      ...newSubtask,
                                      participants: newSubtask.participants.filter(p => p !== contact.email)
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <label htmlFor={`contact-${contact.id}`} className="text-sm">
                                {contact.name} ({contact.email})
                              </label>
                            </div>
                          ))}
                          <div className="mt-3 pt-3 border-t">
                            <Input
                              placeholder="Type email address to add new participant..."
                              value=""
                              onChange={(e) => {
                                const email = (e.target as HTMLInputElement).value.trim();
                                if (email && email.includes('@') && !newSubtask.participants.includes(email)) {
                                  setNewSubtask({
                                    ...newSubtask,
                                    participants: [...newSubtask.participants, email]
                                  });
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const email = (e.target as HTMLInputElement).value.trim();
                                  if (email && email.includes('@') && !newSubtask.participants.includes(email)) {
                                    setNewSubtask({
                                      ...newSubtask,
                                      participants: [...newSubtask.participants, email]
                                    });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                              className="text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Press Enter to add email. New contacts will be auto-imported from Microsoft if available.
                            </p>
                            {newSubtask.participants.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {newSubtask.participants.map((email) => (
                                  <Badge 
                                    key={email} 
                                    variant="secondary" 
                                    className="text-xs cursor-pointer"
                                    onClick={() => {
                                      setNewSubtask({
                                        ...newSubtask,
                                        participants: newSubtask.participants.filter(p => p !== email)
                                      });
                                    }}
                                  >
                                    {email} ×
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAddSubtask}
                        disabled={!newSubtask.title.trim() || addSubtaskMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Subtaak toevoegen
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {subtasks.map((subtask) => (
                      <Card key={subtask.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getTaskTypeIcon(subtask.type)}
                              <h4 className="font-medium">{subtask.title}</h4>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getPriorityColor(subtask.priority)}>
                                {subtask.priority}
                              </Badge>
                              <Badge className={getStatusColor(subtask.status)}>
                                {subtask.status}
                              </Badge>
                            </div>
                          </div>
                          {subtask.description && (
                            <p className="text-sm text-gray-600 mb-2">{subtask.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {subtask.participants.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{subtask.participants.length} deelnemers</span>
                              </div>
                            )}
                            {subtask.dueDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Vervalt {format(new Date(subtask.dueDate), "d MMM")}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {subtasks.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Nog geen subtaken. Voeg er een toe om te beginnen!
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}