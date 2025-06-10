import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, CheckSquare, Play, Square, Filter, Settings, CalendarCheck, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Activity, TimeBlock } from "@shared/schema";
import { format, startOfDay, endOfDay, addDays, isSameDay, parseISO } from "date-fns";

interface SmartScheduleOptions {
  workingHours: {
    start: string;
    end: string;
  };
  breakDuration: number;
  minimumBlockSize: number;
  focusTimePreferred: boolean;
  maxTasksPerDay: number;
}

interface ScheduleResult {
  scheduledBlocks: TimeBlock[];
  unscheduledActivities: Activity[];
  conflicts: string[];
  suggestions: string[];
}

export default function TimeBlocking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedActivities, setSelectedActivities] = useState<number[]>([]);
  const [scheduleOptions, setScheduleOptions] = useState<SmartScheduleOptions>({
    workingHours: { start: "09:00", end: "17:00" },
    breakDuration: 15,
    minimumBlockSize: 30,
    focusTimePreferred: true,
    maxTasksPerDay: 8
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<ScheduleResult | null>(null);

  const queryClient = useQueryClient();

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Fetch time blocks for selected date
  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(selectedDate);
  
  const { data: timeBlocks = [], isLoading: blocksLoading } = useQuery<TimeBlock[]>({
    queryKey: ["/api/timeblocks", { startDate: startDate.toISOString(), endDate: endDate.toISOString() }],
  });

  // Microsoft Calendar events query
  const { data: calendarEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/calendar/events", { startDate: selectedDate.toISOString(), endDate: addDays(selectedDate, 1).toISOString() }],
    enabled: true,
  });

  // Calendar conflict checking mutation
  const checkConflictsMutation = useMutation({
    mutationFn: async (timeBlocks: Array<{ startTime: Date; endTime: Date; title: string }>) => {
      return apiRequest("/api/calendar/check-conflicts", "POST", { timeBlocks });
    },
  });

  // Calendar sync mutation
  const syncCalendarMutation = useMutation({
    mutationFn: async (timeBlockIds: number[]) => {
      return apiRequest("/api/calendar/sync", "POST", { timeBlockIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
    },
  });

  // Schedule preview mutation
  const previewMutation = useMutation({
    mutationFn: async (params: { activityIds: number[]; date: Date; options: SmartScheduleOptions }): Promise<ScheduleResult> => {
      const response = await apiRequest("/api/schedule-preview", "POST", {
        activityIds: params.activityIds,
        date: params.date.toISOString(),
        options: params.options
      });
      return await response.json();
    },
    onSuccess: (result) => {
      setPreviewResult(result);
      setShowPreview(true);
    },
  });

  // Auto schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async (params: { activityIds: number[]; date: Date; options: SmartScheduleOptions }): Promise<ScheduleResult> => {
      const response = await apiRequest("/api/smart-schedule", "POST", {
        activityIds: params.activityIds,
        date: params.date.toISOString(),
        options: params.options
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeblocks"] });
      setSelectedActivities([]);
      setShowPreview(false);
      setPreviewResult(null);
    },
  });

  // Complete time block mutation
  const completeMutation = useMutation({
    mutationFn: async (blockId: number) => {
      return apiRequest(`/api/timeblocks/${blockId}`, "PUT", { isCompleted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeblocks"] });
    },
  });

  const availableActivities = activities.filter(activity => 
    activity.status !== 'completed' && 
    !timeBlocks.some(block => block.activityId === activity.id)
  );

  const handleActivityToggle = (activityId: number) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handlePreviewSchedule = () => {
    if (selectedActivities.length === 0) return;
    previewMutation.mutate({
      activityIds: selectedActivities,
      date: selectedDate,
      options: scheduleOptions
    });
  };

  const handleConfirmSchedule = () => {
    if (!previewResult) return;
    scheduleMutation.mutate({
      activityIds: selectedActivities,
      date: selectedDate,
      options: scheduleOptions
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (date: string | Date) => {
    return format(typeof date === 'string' ? parseISO(date) : date, 'HH:mm');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  if (activitiesLoading || blocksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Time Blocking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Schedule your activities with smart time management
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="w-40"
          />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="micro-button-press micro-ripple">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={scheduleOptions.workingHours.start}
                      onChange={(e) => setScheduleOptions(prev => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, start: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={scheduleOptions.workingHours.end}
                      onChange={(e) => setScheduleOptions(prev => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                  <Input
                    id="break-duration"
                    type="number"
                    min="0"
                    max="60"
                    value={scheduleOptions.breakDuration}
                    onChange={(e) => setScheduleOptions(prev => ({
                      ...prev,
                      breakDuration: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="min-block-size">Minimum Block Size (minutes)</Label>
                  <Input
                    id="min-block-size"
                    type="number"
                    min="15"
                    max="240"
                    value={scheduleOptions.minimumBlockSize}
                    onChange={(e) => setScheduleOptions(prev => ({
                      ...prev,
                      minimumBlockSize: parseInt(e.target.value) || 30
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="max-tasks">Max Tasks Per Day</Label>
                  <Input
                    id="max-tasks"
                    type="number"
                    min="1"
                    max="20"
                    value={scheduleOptions.maxTasksPerDay}
                    onChange={(e) => setScheduleOptions(prev => ({
                      ...prev,
                      maxTasksPerDay: parseInt(e.target.value) || 8
                    }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="focus-time"
                    checked={scheduleOptions.focusTimePreferred}
                    onCheckedChange={(checked) => setScheduleOptions(prev => ({
                      ...prev,
                      focusTimePreferred: checked as boolean
                    }))}
                  />
                  <Label htmlFor="focus-time">Include focus breaks</Label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Square className="h-5 w-5" />
              Available Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {availableActivities.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No unscheduled activities
                  </p>
                ) : (
                  availableActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border micro-card micro-button-press micro-fadeIn"
                    >
                      <Checkbox
                        checked={selectedActivities.includes(activity.id)}
                        onCheckedChange={() => handleActivityToggle(activity.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getPriorityColor(activity.priority)}>
                            {activity.priority}
                          </Badge>
                          {activity.estimatedDuration && (
                            <span className="text-xs text-gray-500">
                              {formatDuration(activity.estimatedDuration)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            {selectedActivities.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={handlePreviewSchedule}
                  disabled={previewMutation.isPending}
                  className="w-full micro-button-press micro-ripple micro-hover-lift"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Preview Schedule ({selectedActivities.length} activities)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Blocks Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule for {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {timeBlocks.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No time blocks scheduled for this day
                    </p>
                  </div>
                ) : (
                  timeBlocks
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((block) => (
                      <div
                        key={block.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          block.isCompleted 
                            ? 'bg-green-50 border-l-green-500 dark:bg-green-900/20' 
                            : block.blockType === 'break'
                            ? 'bg-gray-50 border-l-gray-400 dark:bg-gray-800'
                            : 'bg-blue-50 border-l-blue-500 dark:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatTime(block.startTime)} - {formatTime(block.endTime)}
                              </span>
                              <Badge variant="outline">
                                {formatDuration(block.duration)}
                              </Badge>
                              {block.blockType === 'break' && (
                                <Badge variant="secondary">Break</Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {block.title}
                            </p>
                            {block.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {block.description}
                              </p>
                            )}
                          </div>
                          
                          {!block.isCompleted && block.blockType === 'task' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeMutation.mutate(block.id)}
                              disabled={completeMutation.isPending}
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Microsoft Calendar Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Microsoft Calendar
              <Badge variant="outline" className="text-xs">
                {(calendarEvents as any[]).length} events
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {(calendarEvents as any[]).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div>No calendar events found</div>
                  <div className="text-sm mt-1">
                    Connect your Microsoft account to sync events
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(calendarEvents as any[])
                    .sort((a: any, b: any) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
                    .map((event: any) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{event.subject}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatTime(new Date(event.start.dateTime))} - {formatTime(new Date(event.end.dateTime))}
                            </div>
                            {event.location?.displayName && (
                              <div className="text-xs text-gray-500 mt-1">
                                📍 {event.location.displayName}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Calendar
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
            
            {timeBlocks.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => syncCalendarMutation.mutate(timeBlocks.map(b => b.id))}
                  disabled={syncCalendarMutation.isPending}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {syncCalendarMutation.isPending ? "Syncing..." : "Sync Time Blocks to Calendar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Schedule Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Preview</DialogTitle>
            </DialogHeader>
            
            {previewResult && (
              <div className="space-y-4">
                {/* Scheduled Blocks */}
                {previewResult.scheduledBlocks.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Scheduled Activities</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {previewResult.scheduledBlocks
                        .filter(block => block.blockType === 'task')
                        .map((block, index) => (
                          <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{block.title}</span>
                              <span className="text-sm text-gray-600">
                                {formatTime(block.startTime)} - {formatTime(block.endTime)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Unscheduled Activities */}
                {previewResult.unscheduledActivities.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-amber-600">Unscheduled Activities</h4>
                    <div className="space-y-1">
                      {previewResult.unscheduledActivities.map((activity) => (
                        <div key={activity.id} className="text-sm text-gray-600 dark:text-gray-400">
                          • {activity.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts */}
                {previewResult.conflicts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Conflicts</h4>
                    <div className="space-y-1">
                      {previewResult.conflicts.map((conflict, index) => (
                        <div key={index} className="text-sm text-red-600">
                          • {conflict}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {previewResult.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-blue-600">Suggestions</h4>
                    <div className="space-y-1">
                      {previewResult.suggestions.map((suggestion, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          • {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmSchedule}
                    disabled={scheduleMutation.isPending}
                  >
                    {scheduleMutation.isPending ? "Scheduling..." : "Confirm Schedule"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}