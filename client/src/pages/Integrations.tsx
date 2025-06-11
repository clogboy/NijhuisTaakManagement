import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Building, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings,
  ExternalLink,
  Sync,
  Plus,
  ArrowRight
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TeamsStatus {
  isConfigured: boolean;
  lastSync?: string;
  boardCount: number;
  taskCount: number;
}

interface BimcollabStatus {
  isConfigured: boolean;
  lastSync?: string;
  projectCount: number;
  issueCount: number;
  openIssues: number;
}

interface TeamsBoard {
  id: number;
  boardId: string;
  title: string;
  teamId: string;
  channelId?: string;
  lastSyncAt?: string;
}

interface TeamsCard {
  id: number;
  cardId: string;
  title: string;
  description?: string;
  assignedTo: string[];
  priority: string;
  status: string;
  dueDate?: string;
  bucketName?: string;
}

interface BimcollabProject {
  id: number;
  projectId: string;
  name: string;
  description?: string;
  serverUrl: string;
  lastSyncAt?: string;
}

interface BimcollabIssue {
  id: number;
  issueId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  issueType: string;
  assignedTo: string[];
  dueDate?: string;
  modelElement?: string;
}

export default function Integrations() {
  const [selectedTeamsBoard, setSelectedTeamsBoard] = useState<string>("");
  const [selectedBimcollabProject, setSelectedBimcollabProject] = useState<string>("");
  const { toast } = useToast();

  // Teams queries
  const { data: teamsStatus } = useQuery<TeamsStatus>({
    queryKey: ["/api/teams/status"],
  });

  const { data: teamsBoards = [] } = useQuery<TeamsBoard[]>({
    queryKey: ["/api/teams/boards"],
  });

  const { data: teamsCards = [] } = useQuery<TeamsCard[]>({
    queryKey: ["/api/teams/boards", selectedTeamsBoard, "tasks"],
    enabled: !!selectedTeamsBoard,
  });

  // BimCollab queries
  const { data: bimcollabStatus } = useQuery<BimcollabStatus>({
    queryKey: ["/api/bimcollab/status"],
  });

  const { data: bimcollabProjects = [] } = useQuery<BimcollabProject[]>({
    queryKey: ["/api/bimcollab/projects"],
  });

  const { data: bimcollabIssues = [] } = useQuery<BimcollabIssue[]>({
    queryKey: ["/api/bimcollab/projects", selectedBimcollabProject, "issues"],
    enabled: !!selectedBimcollabProject,
  });

  // Mutations
  const convertIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      return apiRequest(`/api/bimcollab/issues/${issueId}/convert-to-roadblock`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bimcollab/projects"] });
      toast({
        title: "Issue Converted",
        description: "BimCollab issue has been converted to a roadblock",
      });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return apiRequest(`/api/teams/tasks/${taskId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams/boards"] });
      toast({
        title: "Task Updated",
        description: "Teams task status has been updated",
      });
    },
  });

  const updateIssueStatusMutation = useMutation({
    mutationFn: async ({ issueId, status }: { issueId: string; status: string }) => {
      return apiRequest(`/api/bimcollab/issues/${issueId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bimcollab/projects"] });
      toast({
        title: "Issue Updated", 
        description: "BimCollab issue status has been updated",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "normal": return "bg-blue-100 text-blue-800 border-blue-200";
      case "low": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "resolved":
      case "closed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
      case "in-progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "open":
      case "not_started": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your external tools to centralize project management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Teams Integration Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Microsoft Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {teamsStatus?.isConfigured ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">
                {teamsStatus?.isConfigured ? "Connected" : "Not configured"}
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Boards:</span>
                <span>{teamsStatus?.boardCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tasks:</span>
                <span>{teamsStatus?.taskCount || 0}</span>
              </div>
              {teamsStatus?.lastSync && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Last sync:</span>
                  <span>{new Date(teamsStatus.lastSync).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* BimCollab Integration Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BimCollab</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {bimcollabStatus?.isConfigured ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">
                {bimcollabStatus?.isConfigured ? "Connected" : "Not configured"}
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Projects:</span>
                <span>{bimcollabStatus?.projectCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Issues:</span>
                <span>{bimcollabStatus?.issueCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Open Issues:</span>
                <span className="text-orange-600">{bimcollabStatus?.openIssues || 0}</span>
              </div>
              {bimcollabStatus?.lastSync && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Last sync:</span>
                  <span>{new Date(bimcollabStatus.lastSync).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Alerts */}
      {(!teamsStatus?.isConfigured || !bimcollabStatus?.isConfigured) && (
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            {!teamsStatus?.isConfigured && !bimcollabStatus?.isConfigured ? (
              "Both Teams and BimCollab integrations require API keys to be configured. Contact your administrator to set up these connections."
            ) : !teamsStatus?.isConfigured ? (
              "Microsoft Teams integration requires API keys to be configured. Contact your administrator to set up this connection."
            ) : (
              "BimCollab integration requires API keys to be configured. Contact your administrator to set up this connection."
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Microsoft Teams</TabsTrigger>
          <TabsTrigger value="bimcollab">BimCollab</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teams Boards & Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamsBoards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No Teams boards found</p>
                  <p className="text-sm">Configure the Teams integration to see your boards and tasks</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Board:</label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={selectedTeamsBoard}
                      onChange={(e) => setSelectedTeamsBoard(e.target.value)}
                    >
                      <option value="">Choose a board...</option>
                      {teamsBoards.map((board) => (
                        <option key={board.id} value={board.boardId}>
                          {board.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTeamsBoard && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Tasks</h4>
                        <Badge variant="secondary">{teamsCards.length} tasks</Badge>
                      </div>
                      
                      {teamsCards.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tasks in this board</p>
                      ) : (
                        <div className="space-y-2">
                          {teamsCards.map((card) => (
                            <div key={card.id} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">{card.title}</h5>
                                <div className="flex gap-2">
                                  <Badge className={getPriorityColor(card.priority)}>
                                    {card.priority}
                                  </Badge>
                                  <Badge className={getStatusColor(card.status)}>
                                    {card.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              {card.description && (
                                <p className="text-sm text-muted-foreground">{card.description}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {card.dueDate && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(card.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                  {card.assignedTo.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {card.assignedTo.length} assigned
                                    </div>
                                  )}
                                </div>
                                {card.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateTaskStatusMutation.mutate({
                                      taskId: card.cardId,
                                      status: 'completed'
                                    })}
                                    disabled={updateTaskStatusMutation.isPending}
                                  >
                                    Mark Complete
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bimcollab" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                BimCollab Projects & Issues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bimcollabProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No BimCollab projects found</p>
                  <p className="text-sm">Configure the BimCollab integration to see your projects and issues</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Project:</label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={selectedBimcollabProject}
                      onChange={(e) => setSelectedBimcollabProject(e.target.value)}
                    >
                      <option value="">Choose a project...</option>
                      {bimcollabProjects.map((project) => (
                        <option key={project.id} value={project.projectId}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBimcollabProject && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Issues</h4>
                        <Badge variant="secondary">{bimcollabIssues.length} issues</Badge>
                      </div>
                      
                      {bimcollabIssues.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No issues in this project</p>
                      ) : (
                        <div className="space-y-2">
                          {bimcollabIssues.map((issue) => (
                            <div key={issue.id} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">{issue.title}</h5>
                                <div className="flex gap-2">
                                  <Badge className={getPriorityColor(issue.priority)}>
                                    {issue.priority}
                                  </Badge>
                                  <Badge className={getStatusColor(issue.status)}>
                                    {issue.status}
                                  </Badge>
                                  <Badge variant="outline">
                                    {issue.issueType}
                                  </Badge>
                                </div>
                              </div>
                              {issue.description && (
                                <p className="text-sm text-muted-foreground">{issue.description}</p>
                              )}
                              {issue.modelElement && (
                                <div className="text-xs text-muted-foreground">
                                  Element: {issue.modelElement}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {issue.dueDate && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(issue.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                  {issue.assignedTo.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {issue.assignedTo.length} assigned
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {issue.status === 'open' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateIssueStatusMutation.mutate({
                                        issueId: issue.issueId,
                                        status: 'resolved'
                                      })}
                                      disabled={updateIssueStatusMutation.isPending}
                                    >
                                      Resolve
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => convertIssueMutation.mutate(issue.issueId)}
                                    disabled={convertIssueMutation.isPending}
                                    className="flex items-center gap-1"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                    Convert to Roadblock
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}