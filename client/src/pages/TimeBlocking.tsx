
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, X, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface TimeBlock {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  activityId?: number;
  activityTitle?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
}

export default function TimeBlocking() {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newBlock, setNewBlock] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    activityId: '',
  });

  const { data: timeBlocks = [], isLoading } = useQuery({
    queryKey: ["/api/time-blocks", selectedDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/time-blocks?date=${selectedDate}`);
      return response.json();
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/activities");
      return response.json();
    },
  });

  const createTimeBlock = useMutation({
    mutationFn: async (blockData: any) => {
      const response = await apiRequest("POST", "/api/time-blocks", {
        ...blockData,
        date: selectedDate,
        activityId: blockData.activityId || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      setIsCreating(false);
      setNewBlock({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        activityId: '',
      });
      toast({ title: "Time block created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create time block", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteTimeBlock = useMutation({
    mutationFn: async (blockId: number) => {
      const response = await apiRequest("DELETE", `/api/time-blocks/${blockId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      toast({ title: "Time block deleted" });
    },
  });

  const updateBlockStatus = useMutation({
    mutationFn: async ({ blockId, status }: { blockId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/time-blocks/${blockId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBlock.title || !newBlock.startTime || !newBlock.endTime) {
      toast({ 
        title: "Missing fields", 
        description: "Please fill in title, start time, and end time",
        variant: "destructive" 
      });
      return;
    }

    if (newBlock.startTime >= newBlock.endTime) {
      toast({ 
        title: "Invalid time range", 
        description: "End time must be after start time",
        variant: "destructive" 
      });
      return;
    }

    createTimeBlock.mutate(newBlock);
  };

  // Check for conflicts
  const hasConflicts = (startTime: string, endTime: string, excludeId?: number) => {
    return timeBlocks.some((block: TimeBlock) => {
      if (excludeId && block.id === excludeId) return false;
      return (
        (startTime >= block.startTime && startTime < block.endTime) ||
        (endTime > block.startTime && endTime <= block.endTime) ||
        (startTime <= block.startTime && endTime >= block.endTime)
      );
    });
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'missed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Blocking</h1>
        <div className="flex gap-2 items-center">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Block
          </Button>
        </div>
      </div>

      {/* Create New Time Block */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Create Time Block
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title*</Label>
                  <Input
                    id="title"
                    value={newBlock.title}
                    onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                    placeholder="Focus session, Meeting, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="activity">Link to Activity (optional)</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newBlock.activityId}
                    onChange={(e) => setNewBlock({ ...newBlock, activityId: e.target.value })}
                  >
                    <option value="">No activity</option>
                    {activities.map((activity: any) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newBlock.description}
                  onChange={(e) => setNewBlock({ ...newBlock, description: e.target.value })}
                  placeholder="What will you work on during this time?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time*</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newBlock.startTime}
                    onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time*</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newBlock.endTime}
                    onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                  />
                </div>
              </div>

              {newBlock.startTime && newBlock.endTime && 
               hasConflicts(newBlock.startTime, newBlock.endTime) && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    This time slot conflicts with an existing block
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTimeBlock.isPending}>
                  {createTimeBlock.isPending ? "Creating..." : "Create Block"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Time Blocks List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : timeBlocks.length > 0 ? (
          timeBlocks
            .sort((a: TimeBlock, b: TimeBlock) => a.startTime.localeCompare(b.startTime))
            .map((block: TimeBlock) => (
              <Card key={block.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{block.title}</h3>
                        <Badge className={getStatusColor(block.status)}>
                          {block.status.replace('_', ' ')}
                        </Badge>
                        {block.activityTitle && (
                          <Badge variant="outline" className="text-xs">
                            {block.activityTitle}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(block.startTime)} - {formatTime(block.endTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(block.date).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                      
                      {block.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {block.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {block.status === 'scheduled' && (
                        <Button
                          size="sm"
                          onClick={() => updateBlockStatus.mutate({ 
                            blockId: block.id, 
                            status: 'in_progress' 
                          })}
                        >
                          Start
                        </Button>
                      )}
                      {block.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => updateBlockStatus.mutate({ 
                            blockId: block.id, 
                            status: 'completed' 
                          })}
                        >
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTimeBlock.mutate(block.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No time blocks for this date
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start organizing your day by creating time blocks for focused work.
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Block
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
