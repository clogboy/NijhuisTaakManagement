import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  XCircle,
  Edit
} from "lucide-react";
import { Roadblock, Activity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import NewRoadblockModal from "@/components/modals/NewRoadblockModal";
import AppLayout from "@/components/layout/AppLayout";

export default function Roadblocks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewRoadblockModalOpen, setIsNewRoadblockModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedActivityId, setSelectedActivityId] = useState<number | undefined>();

  const { data: roadblocks, isLoading: roadblocksLoading } = useQuery<Roadblock[]>({
    queryKey: ["/api/roadblocks"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const deleteRoadblockMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/roadblocks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      toast({
        title: "Success",
        description: "Roadblock deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete roadblock",
        variant: "destructive",
      });
    },
  });

  const updateRoadblockStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PUT", `/api/roadblocks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      toast({
        title: "Success",
        description: "Roadblock status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update roadblock",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "open": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved": return <CheckCircle2 size={16} className="text-green-600" />;
      case "in_progress": return <Clock size={16} className="text-blue-600" />;
      case "open": return <XCircle size={16} className="text-red-600" />;
      default: return <AlertTriangle size={16} className="text-gray-600" />;
    }
  };

  const filteredRoadblocks = roadblocks?.filter(roadblock => {
    // Search filter
    const matchesSearch = roadblock.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         roadblock.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Severity filter
    const matchesSeverity = severityFilter === "all" || roadblock.severity === severityFilter;
    
    // Status filter
    const matchesStatus = statusFilter === "all" || roadblock.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getLinkedActivity = (activityId: number) => {
    return activities?.find(activity => activity.id === activityId) || null;
  };

  const groupedRoadblocks = filteredRoadblocks?.reduce((groups, roadblock) => {
    const linkedActivity = getLinkedActivity(roadblock.linkedActivityId);
    const groupKey = linkedActivity ? linkedActivity.title : "General Issues";
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        activity: linkedActivity,
        roadblocks: []
      };
    }
    
    groups[groupKey].roadblocks.push(roadblock);
    return groups;
  }, {} as Record<string, { activity: Activity | null; roadblocks: Roadblock[] }>);

  const handleCreateRoadblock = (linkedActivityId?: number) => {
    setSelectedActivityId(linkedActivityId);
    setIsNewRoadblockModalOpen(true);
  };

  const handleStatusChange = (roadblockId: number, newStatus: string) => {
    updateRoadblockStatusMutation.mutate({ id: roadblockId, status: newStatus });
  };

  if (roadblocksLoading || activitiesLoading) {
    return (
      <AppLayout title="Roadblocks" subtitle="Track and resolve project obstacles">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
        </div>
      </AppLayout>
    );
  }

  const roadblockStats = {
    total: roadblocks?.length || 0,
    open: roadblocks?.filter(r => r.status === "open").length || 0,
    inProgress: roadblocks?.filter(r => r.status === "in_progress").length || 0,
    resolved: roadblocks?.filter(r => r.status === "resolved").length || 0,
    critical: roadblocks?.filter(r => r.severity === "critical").length || 0,
  };

  return (
    <AppLayout title="Roadblocks" subtitle="Track and resolve project obstacles">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-neutral-dark">{roadblockStats.total}</div>
              <div className="text-sm text-neutral-medium">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-red-600">{roadblockStats.open}</div>
              <div className="text-sm text-neutral-medium">Open</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-blue-600">{roadblockStats.inProgress}</div>
              <div className="text-sm text-neutral-medium">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-green-600">{roadblockStats.resolved}</div>
              <div className="text-sm text-neutral-medium">Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-red-800">{roadblockStats.critical}</div>
              <div className="text-sm text-neutral-medium">Critical</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium" size={16} />
            <Input
              placeholder="Search roadblocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1"></div>

          <Button
            onClick={() => handleCreateRoadblock()}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <Plus size={16} className="mr-2" />
            Report Roadblock
          </Button>
        </div>

        {/* Roadblocks by Activity */}
        <div className="space-y-6">
          {groupedRoadblocks && Object.entries(groupedRoadblocks).map(([groupName, group]) => (
            <Card key={groupName}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-neutral-dark flex items-center">
                      {group.activity && (
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                      )}
                      {groupName}
                    </CardTitle>
                    {group.activity && (
                      <p className="text-sm text-neutral-medium mt-1">
                        {group.activity.description}
                      </p>
                    )}
                  </div>
                  {group.activity && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateRoadblock(group.activity!.id)}
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Plus size={16} className="mr-2" />
                      Report Issue
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.roadblocks.map((roadblock) => (
                    <div
                      key={roadblock.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-sm font-medium text-neutral-dark">
                              {roadblock.title}
                            </h4>
                            <Badge className={getSeverityColor(roadblock.severity)} variant="outline">
                              {roadblock.severity}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(roadblock.status)}
                              <Badge className={getStatusColor(roadblock.status)}>
                                {roadblock.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-sm text-neutral-medium mb-3">
                            {roadblock.description}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-neutral-medium">
                            <span>
                              Reported: {format(new Date(roadblock.reportedDate), "MMM dd, yyyy")}
                            </span>
                            {roadblock.resolvedDate && (
                              <span>
                                Resolved: {format(new Date(roadblock.resolvedDate), "MMM dd, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Select
                            value={roadblock.status}
                            onValueChange={(value) => handleStatusChange(roadblock.id, value)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRoadblockMutation.mutate(roadblock.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {!groupedRoadblocks || Object.keys(groupedRoadblocks).length === 0 && (
            <div className="text-center py-12">
              {searchQuery || severityFilter !== "all" || statusFilter !== "all" ? (
                <div>
                  <AlertTriangle className="mx-auto h-12 w-12 text-neutral-medium mb-4" />
                  <p className="text-neutral-medium mb-2">No roadblocks found matching your filters</p>
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setSeverityFilter("all");
                      setStatusFilter("all");
                    }}
                    variant="ghost"
                    className="text-ms-blue hover:text-ms-blue-dark"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div>
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <p className="text-neutral-medium mb-4">No roadblocks reported yet</p>
                  <p className="text-sm text-neutral-medium mb-6">
                    Track obstacles and issues that are blocking progress on your activities
                  </p>
                  <Button
                    onClick={() => handleCreateRoadblock()}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Report your first roadblock
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <NewRoadblockModal
        open={isNewRoadblockModalOpen}
        onOpenChange={setIsNewRoadblockModalOpen}
        linkedActivityId={selectedActivityId}
      />
    </AppLayout>
  );
}