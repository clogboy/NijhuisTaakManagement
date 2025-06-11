import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, AlertCircle, RotateCcw, Plus, Users, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  nl: nl,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'deadline' | 'time_block' | 'microsoft' | 'meeting';
    activityId?: number;
    status?: string;
    priority?: string;
    participants?: string[];
    location?: string;
    description?: string;
    isEditable?: boolean;
  };
}

interface Activity {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline?: Date;
  createdAt: Date;
}

interface TimeBlock {
  id: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  activityId?: number;
  status: string;
  color: string;
}

export default function Calendar() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'deadline' as 'deadline' | 'time_block',
    activityId: '',
    priority: 'medium'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all calendar events (includes activities, time blocks, Microsoft events)
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/calendar/events'],
  });

  // Fetch activities for dropdown
  const { data: activities = [] } = useQuery({
    queryKey: ['/api/activities'],
  });

  // Fetch calendar insights
  const { data: insights } = useQuery({
    queryKey: ['/api/calendar/insights'],
  });

  // Sync with Microsoft Calendar
  const syncMicrosoftMutation = useMutation({
    mutationFn: () => apiRequest('/api/calendar/microsoft/sync', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/insights'] });
      toast({
        title: "Calendar gesynchroniseerd",
        description: "Microsoft Calendar succesvol gesynchroniseerd",
      });
    },
    onError: () => {
      toast({
        title: "Synchronisatie mislukt",
        description: "Kon niet synchroniseren met Microsoft Calendar",
        variant: "destructive",
      });
    },
  });

  // Create deadline
  const createDeadlineMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/calendar/deadlines', {
      method: 'POST',
      body: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/insights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      setIsCreateDialogOpen(false);
      resetNewEvent();
      toast({
        title: "Deadline aangemaakt",
        description: "Nieuwe deadline succesvol toegevoegd",
      });
    },
  });

  // Create time block
  const createTimeBlockMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/time-blocks', {
      method: 'POST',
      body: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/insights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-blocks'] });
      setIsCreateDialogOpen(false);
      resetNewEvent();
      toast({
        title: "Tijdblok aangemaakt",
        description: "Nieuw tijdblok succesvol toegevoegd",
      });
    },
  });

  const resetNewEvent = () => {
    setNewEvent({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      type: 'deadline',
      activityId: '',
      priority: 'medium'
    });
  };

  // Convert calendar events to react-big-calendar format
  const formattedEvents: CalendarEvent[] = calendarEvents.map((event: any) => ({
    id: event.id,
    title: event.title,
    start: new Date(event.start),
    end: new Date(event.end),
    resource: {
      type: event.type,
      activityId: event.activityId,
      status: event.status,
      priority: event.priority,
      description: event.description,
      location: event.location,
      participants: event.participants,
      isEditable: event.isEditable,
    },
  }));

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setNewEvent(prev => ({
      ...prev,
      startTime: format(start, 'yyyy-MM-dd\'T\'HH:mm'),
      endTime: format(new Date(start.getTime() + 60 * 60 * 1000), 'yyyy-MM-dd\'T\'HH:mm'),
    }));
    setIsCreateDialogOpen(true);
  };

  const handleCreateEvent = () => {
    const eventData = {
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      activityId: newEvent.activityId ? parseInt(newEvent.activityId) : undefined,
      priority: newEvent.priority,
    };

    if (newEvent.type === 'deadline') {
      createDeadlineMutation.mutate(eventData);
    } else {
      createTimeBlockMutation.mutate(eventData);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6';
    
    switch (event.resource.type) {
      case 'deadline':
        backgroundColor = event.resource.priority === 'high' ? '#ef4444' : 
                         event.resource.priority === 'medium' ? '#f59e0b' : '#10b981';
        break;
      case 'time_block':
        backgroundColor = '#8b5cf6';
        break;
      case 'microsoft':
        backgroundColor = '#0078d4';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const isLoading = eventsLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kalender & Deadlines</h1>
          <p className="text-muted-foreground">
            Beheer deadlines, tijdblokken en Microsoft Calendar integratie
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => syncMicrosoftMutation.mutate()}
            disabled={syncMicrosoftMutation.isPending}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {syncMicrosoftMutation.isPending ? "Synchroniseren..." : "Sync Microsoft Calendar"}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe deadline
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="month">Maand</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Dag</TabsTrigger>
        </TabsList>

        <TabsContent value={view} className="mt-6">
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Kalender laden...</p>
                  </div>
                </div>
              ) : (
                <div>
                  {insights && (
                    <div className="mb-4 grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{insights.totalEvents}</div>
                        <div className="text-sm text-muted-foreground">Total Events</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{insights.upcomingDeadlines}</div>
                        <div className="text-sm text-muted-foreground">Upcoming Deadlines</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{insights.scheduledHours}h</div>
                        <div className="text-sm text-muted-foreground">Scheduled Hours</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{insights.conflicts}</div>
                        <div className="text-sm text-muted-foreground">Conflicts</div>
                      </div>
                    </div>
                  )}
                  
                  <Calendar
                    localizer={localizer}
                    events={formattedEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 600 }}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    selectable
                    view={view}
                    onView={setView}
                    date={selectedDate}
                    onNavigate={setSelectedDate}
                    eventPropGetter={eventStyleGetter}
                    messages={{
                      month: 'Maand',
                      week: 'Week',
                      day: 'Dag',
                      today: 'Vandaag',
                      previous: 'Vorige',
                      next: 'Volgende',
                      showMore: (count) => `+${count} meer`,
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Details Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedEvent.resource.type === 'deadline' ? 'destructive' : 'default'}>
                      {selectedEvent.resource.type === 'deadline' ? 'Deadline' :
                       selectedEvent.resource.type === 'time_block' ? 'Tijdblok' :
                       selectedEvent.resource.type === 'microsoft' ? 'Microsoft Calendar' : 'Meeting'}
                    </Badge>
                    {selectedEvent.resource.priority && (
                      <Badge variant={selectedEvent.resource.priority === 'high' ? 'destructive' : 'secondary'}>
                        {selectedEvent.resource.priority === 'high' ? 'Hoog' :
                         selectedEvent.resource.priority === 'medium' ? 'Gemiddeld' : 'Laag'}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Tijd</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(selectedEvent.start, 'dd MMM yyyy HH:mm')} -
                    {format(selectedEvent.end, 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {selectedEvent.resource.description && (
                <div>
                  <Label className="text-sm font-medium">Beschrijving</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEvent.resource.description}
                  </p>
                </div>
              )}

              {selectedEvent.resource.participants && selectedEvent.resource.participants.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Deelnemers</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">
                      {selectedEvent.resource.participants.join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {selectedEvent.resource.location && (
                <div>
                  <Label className="text-sm font-medium">Locatie</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEvent.resource.location}
                  </p>
                </div>
              )}

              {selectedEvent.resource.type === 'microsoft' && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-sm">Dit evenement komt uit Microsoft Calendar</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe deadline/tijdblok</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={newEvent.type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="time_block">Tijdblok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Vul titel in..."
              />
            </div>

            <div>
              <Label htmlFor="description">Beschrijving</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optionele beschrijving..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start tijd</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="endTime">Eind tijd</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="activity">Gekoppelde activiteit (optioneel)</Label>
              <Select value={newEvent.activityId} onValueChange={(value) => setNewEvent(prev => ({ ...prev, activityId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer activiteit..." />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((activity: Activity) => (
                    <SelectItem key={activity.id} value={activity.id.toString()}>
                      {activity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioriteit</Label>
              <Select value={newEvent.priority} onValueChange={(value) => setNewEvent(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="medium">Gemiddeld</SelectItem>
                  <SelectItem value="low">Laag</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleCreateEvent}
                disabled={!newEvent.title || !newEvent.startTime || !newEvent.endTime}
              >
                Aanmaken
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}