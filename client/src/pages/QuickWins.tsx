import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Trophy, ExternalLink } from "lucide-react";
import { QuickWin, Activity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import NewQuickWinModal from "@/components/modals/NewQuickWinModal";
import AppLayout from "@/components/layout/AppLayout";

export default function QuickWins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewQuickWinModalOpen, setIsNewQuickWinModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState<number | undefined>();

  const { data: quickWins, isLoading: quickWinsLoading } = useQuery<QuickWin[]>({
    queryKey: ["/api/quickwins"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const deleteQuickWinMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/quickwins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickwins"] });
      toast({
        title: "Success",
        description: "Quick win deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quick win",
        variant: "destructive",
      });
    },
  });

  const filteredQuickWins = quickWins?.filter(quickWin =>
    quickWin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quickWin.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLinkedActivity = (activityId: number | null) => {
    if (!activityId || !activities) return null;
    return activities.find(activity => activity.id === activityId);
  };

  const groupedQuickWins = filteredQuickWins?.reduce((groups, quickWin) => {
    const linkedActivity = getLinkedActivity(quickWin.linkedActivityId);
    const groupKey = linkedActivity ? linkedActivity.title : "Unlinked Quick Wins";
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        activity: linkedActivity,
        quickWins: []
      };
    }
    
    groups[groupKey].quickWins.push(quickWin);
    return groups;
  }, {} as Record<string, { activity: Activity | null; quickWins: QuickWin[] }>);

  const handleCreateQuickWin = (linkedActivityId?: number) => {
    setSelectedActivityId(linkedActivityId);
    setIsNewQuickWinModalOpen(true);
  };

  if (quickWinsLoading || activitiesLoading) {
    return (
      <AppLayout title="Quick Wins" subtitle="Track achievements and milestones">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quick Wins" subtitle="Track achievements and milestones">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium" size={16} />
              <Input
                placeholder="Search quick wins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            onClick={() => handleCreateQuickWin()}
            className="bg-ms-blue hover:bg-ms-blue-dark text-white"
          >
            <Plus size={16} className="mr-2" />
            New Quick Win
          </Button>
        </div>

        {/* Stats Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mr-4">
                  <Trophy className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-medium">Total Quick Wins</p>
                  <p className="text-2xl font-semibold text-neutral-dark">{quickWins?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-ms-blue rounded-lg flex items-center justify-center mr-4">
                  <ExternalLink className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-medium">Linked to Activities</p>
                  <p className="text-2xl font-semibold text-neutral-dark">
                    {quickWins?.filter(qw => qw.linkedActivityId).length || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                  <Trophy className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-medium">This Month</p>
                  <p className="text-2xl font-semibold text-neutral-dark">
                    {quickWins?.filter(qw => {
                      const created = new Date(qw.createdAt);
                      const now = new Date();
                      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                    }).length || 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Wins by Activity */}
        <div className="space-y-6">
          {groupedQuickWins && Object.entries(groupedQuickWins).map(([groupName, group]) => (
            <Card key={groupName}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-neutral-dark flex items-center">
                      {group.activity && (
                        <div className="w-3 h-3 bg-ms-blue rounded-full mr-3"></div>
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
                      onClick={() => handleCreateQuickWin(group.activity!.id)}
                      className="text-ms-blue border-ms-blue hover:bg-ms-blue hover:text-white"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Quick Win
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.quickWins.map((quickWin) => (
                    <div
                      key={quickWin.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-neutral-dark mb-2">
                            {quickWin.title}
                          </h4>
                          {quickWin.description && (
                            <p className="text-xs text-neutral-medium mb-3">
                              {quickWin.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-medium">
                              {format(new Date(quickWin.createdAt), "MMM dd, yyyy")}
                            </span>
                            <Trophy className="text-yellow-500" size={16} />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuickWinMutation.mutate(quickWin.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 ml-2"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {!groupedQuickWins || Object.keys(groupedQuickWins).length === 0 && (
            <div className="text-center py-12">
              {searchQuery ? (
                <div>
                  <Trophy className="mx-auto h-12 w-12 text-neutral-medium mb-4" />
                  <p className="text-neutral-medium mb-2">No quick wins found matching "{searchQuery}"</p>
                  <Button
                    onClick={() => setSearchQuery("")}
                    variant="ghost"
                    className="text-ms-blue hover:text-ms-blue-dark"
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                <div>
                  <Trophy className="mx-auto h-12 w-12 text-neutral-medium mb-4" />
                  <p className="text-neutral-medium mb-4">No quick wins created yet</p>
                  <p className="text-sm text-neutral-medium mb-6">
                    Quick wins help you track small achievements and milestones related to your activities
                  </p>
                  <Button
                    onClick={() => handleCreateQuickWin()}
                    className="bg-ms-blue hover:bg-ms-blue-dark text-white"
                  >
                    Create your first quick win
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Quick Actions */}
        {activities && activities.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg text-neutral-dark">Create Quick Win for Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activities.slice(0, 6).map((activity) => (
                  <Button
                    key={activity.id}
                    variant="outline"
                    onClick={() => handleCreateQuickWin(activity.id)}
                    className="text-left p-3 h-auto flex-col items-start hover:bg-gray-50"
                  >
                    <div className="font-medium text-sm truncate w-full">{activity.title}</div>
                    <div className="text-xs text-neutral-medium mt-1">
                      {quickWins?.filter(qw => qw.linkedActivityId === activity.id).length || 0} quick wins
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal */}
      <NewQuickWinModal
        open={isNewQuickWinModalOpen}
        onOpenChange={setIsNewQuickWinModalOpen}
        linkedActivityId={selectedActivityId}
      />
    </AppLayout>
  );
}
