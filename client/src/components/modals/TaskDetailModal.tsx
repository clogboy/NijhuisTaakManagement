import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Trophy,
  AlertTriangle,
  Plus,
  Clock,
  User,
  CheckCircle2,
  X
} from "lucide-react";
import { Activity, TaskComment, QuickWin, Roadblock } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskDetailModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ activity, isOpen, onClose }: TaskDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Comment state
  const [newComment, setNewComment] = useState("");
  
  // Quick Win state
  const [newQuickWin, setNewQuickWin] = useState({
    title: "",
    description: "",
    impact: "medium" as const,
    effort: "medium" as const,
  });
  
  // Roadblock state
  const [newRoadblock, setNewRoadblock] = useState({
    title: "",
    description: "",
    severity: "medium" as const,
    assignedTo: "",
  });

  // Fetch task comments
  const { data: comments = [] } = useQuery<TaskComment[]>({
    queryKey: ["/api/activities", activity.id, "comments"],
    enabled: isOpen,
  });

  // Fetch task quick wins
  const { data: quickWins = [] } = useQuery<QuickWin[]>({
    queryKey: ["/api/activities", activity.id, "quickwins"],
    enabled: isOpen,
  });

  // Fetch task roadblocks
  const { data: roadblocks = [] } = useQuery<Roadblock[]>({
    queryKey: ["/api/activities", activity.id, "roadblocks"],
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
        title: "Comment Added",
        description: "Your comment has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Add quick win mutation
  const addQuickWinMutation = useMutation({
    mutationFn: async (quickWin: typeof newQuickWin) => {
      return apiRequest("/api/quickwins", "POST", {
        ...quickWin,
        linkedActivityId: activity.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activity.id, "quickwins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quickwins"] });
      setNewQuickWin({
        title: "",
        description: "",
        impact: "medium",
        effort: "medium",
      });
      toast({
        title: "Quick Win Added",
        description: "Quick win has been added to this task",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add quick win",
        variant: "destructive",
      });
    },
  });

  // Add roadblock mutation
  const addRoadblockMutation = useMutation({
    mutationFn: async (roadblock: typeof newRoadblock) => {
      return apiRequest("/api/roadblocks", "POST", {
        ...roadblock,
        linkedActivityId: activity.id,
        reportedDate: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activity.id, "roadblocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      setNewRoadblock({
        title: "",
        description: "",
        severity: "medium",
        assignedTo: "",
      });
      toast({
        title: "Roadblock Reported",
        description: "Roadblock has been added to this task",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add roadblock",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  const handleAddQuickWin = () => {
    if (newQuickWin.title.trim()) {
      addQuickWinMutation.mutate(newQuickWin);
    }
  };

  const handleAddRoadblock = () => {
    if (newRoadblock.title.trim() && newRoadblock.description.trim()) {
      addRoadblockMutation.mutate(newRoadblock);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{activity.title}</span>
            <Badge variant={activity.priority === "urgent" ? "destructive" : "secondary"}>
              {activity.priority}
            </Badge>
            <Badge variant={activity.status === "completed" ? "default" : "outline"}>
              {activity.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">{activity.description}</p>
            {activity.dueDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Due: {format(new Date(activity.dueDate), "PPP")}
              </p>
            )}
          </div>

          <Tabs defaultValue="comments" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="quickwins" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Quick Wins ({quickWins.length})
              </TabsTrigger>
              <TabsTrigger value="roadblocks" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Roadblocks ({roadblocks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="flex-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Add Comment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Add a time-stamped comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                  </Button>
                </CardContent>
              </Card>

              <ScrollArea className="h-60">
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No comments yet. Add the first comment above.
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm">{comment.comment}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(comment.createdAt), "PPp")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="quickwins" className="flex-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Add Quick Win
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Quick win title..."
                    value={newQuickWin.title}
                    onChange={(e) => setNewQuickWin({ ...newQuickWin, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Description..."
                    value={newQuickWin.description}
                    onChange={(e) => setNewQuickWin({ ...newQuickWin, description: e.target.value })}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Impact</label>
                      <Select
                        value={newQuickWin.impact}
                        onValueChange={(value: "low" | "medium" | "high") => 
                          setNewQuickWin({ ...newQuickWin, impact: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Effort</label>
                      <Select
                        value={newQuickWin.effort}
                        onValueChange={(value: "low" | "medium" | "high") => 
                          setNewQuickWin({ ...newQuickWin, effort: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddQuickWin}
                    disabled={!newQuickWin.title.trim() || addQuickWinMutation.isPending}
                  >
                    {addQuickWinMutation.isPending ? "Adding..." : "Add Quick Win"}
                  </Button>
                </CardContent>
              </Card>

              <ScrollArea className="h-60">
                <div className="space-y-3">
                  {quickWins.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No quick wins yet. Add one above.
                    </p>
                  ) : (
                    quickWins.map((quickWin) => (
                      <Card key={quickWin.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{quickWin.title}</h4>
                              {quickWin.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {quickWin.description}
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">Impact: {quickWin.impact}</Badge>
                                <Badge variant="outline">Effort: {quickWin.effort}</Badge>
                              </div>
                            </div>
                            <Badge variant={quickWin.status === "completed" ? "default" : "secondary"}>
                              {quickWin.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="roadblocks" className="flex-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Report Roadblock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Roadblock title..."
                    value={newRoadblock.title}
                    onChange={(e) => setNewRoadblock({ ...newRoadblock, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Describe the roadblock..."
                    value={newRoadblock.description}
                    onChange={(e) => setNewRoadblock({ ...newRoadblock, description: e.target.value })}
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Severity</label>
                      <Select
                        value={newRoadblock.severity}
                        onValueChange={(value: "low" | "medium" | "high" | "critical") => 
                          setNewRoadblock({ ...newRoadblock, severity: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assigned To</label>
                      <Input
                        placeholder="Person/team..."
                        value={newRoadblock.assignedTo}
                        onChange={(e) => setNewRoadblock({ ...newRoadblock, assignedTo: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddRoadblock}
                    disabled={!newRoadblock.title.trim() || !newRoadblock.description.trim() || addRoadblockMutation.isPending}
                  >
                    {addRoadblockMutation.isPending ? "Reporting..." : "Report Roadblock"}
                  </Button>
                </CardContent>
              </Card>

              <ScrollArea className="h-60">
                <div className="space-y-3">
                  {roadblocks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No roadblocks reported yet.
                    </p>
                  ) : (
                    roadblocks.map((roadblock) => (
                      <Card key={roadblock.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{roadblock.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {roadblock.description}
                              </p>
                              {roadblock.assignedTo && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Assigned to: {roadblock.assignedTo}
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Badge 
                                  variant={
                                    roadblock.severity === "critical" ? "destructive" :
                                    roadblock.severity === "high" ? "destructive" :
                                    "outline"
                                  }
                                >
                                  {roadblock.severity}
                                </Badge>
                                <Badge variant="outline">{roadblock.status}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(roadblock.reportedDate), "PP")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}