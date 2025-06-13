import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, AlertCircle, CheckCircle, Plus, Trash2, RefreshCw, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";
import AppLayout from "@/components/layout/AppLayout";
import { CalendarIntegration, CalendarEvent, DeadlineReminder } from "@shared/schema";
import { format } from "date-fns";

export default function CalendarIntegrationPage() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newIntegration, setNewIntegration] = useState({
    provider: "google",
    accountEmail: "",
    syncEnabled: true
  });

  const { data: integrations = [], isLoading: integrationsLoading } = useQuery<CalendarIntegration[]>({
    queryKey: ["/api/calendar/integrations"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<DeadlineReminder[]>({
    queryKey: ["/api/deadline-reminders"],
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (integrationData: any) => {
      const response = await fetch("/api/calendar/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(integrationData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create calendar integration");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/integrations"] });
      setNewIntegration({ provider: "google", accountEmail: "", syncEnabled: true });
      toast({
        title: t('common.success'),
        description: "Calendar integration created successfully",
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "Failed to create calendar integration",
        variant: "destructive",
      });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/calendar/integrations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete calendar integration");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/integrations"] });
      toast({
        title: t('common.success'),
        description: "Calendar integration deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "Failed to delete calendar integration",
        variant: "destructive",
      });
    },
  });

  const toggleSyncMutation = useMutation({
    mutationFn: async ({ id, syncEnabled }: { id: number; syncEnabled: boolean }) => {
      const response = await fetch(`/api/calendar/integrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ syncEnabled }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update sync status");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/integrations"] });
      toast({
        title: t('common.success'),
        description: "Sync settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "Failed to update sync settings",
        variant: "destructive",
      });
    },
  });

  const handleCreateIntegration = () => {
    if (!newIntegration.accountEmail) {
      toast({
        title: t('common.error'),
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    
    createIntegrationMutation.mutate({
      ...newIntegration,
      accountId: newIntegration.accountEmail, // Using email as account ID for simplicity
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google": return "📅";
      case "outlook": return "📊";
      case "ical": return "📋";
      default: return "📅";
    }
  };

  const getStatusColor = (isActive: boolean, syncEnabled: boolean) => {
    if (!isActive) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (!syncEnabled) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  };

  const getStatusText = (isActive: boolean, syncEnabled: boolean) => {
    if (!isActive) return "Inactive";
    if (!syncEnabled) return "Sync Disabled";
    return "Active";
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-dark dark:text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-500" />
              Calendar Integration
            </h1>
            <p className="text-neutral-medium dark:text-gray-400 mt-1">
              Manage calendar connections and deadline reminders
            </p>
          </div>
        </div>

        {/* Add New Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Calendar Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="provider">Calendar Provider</Label>
                <Select value={newIntegration.provider} onValueChange={(value) => 
                  setNewIntegration(prev => ({ ...prev, provider: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Calendar</SelectItem>
                    <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                    <SelectItem value="ical">iCal/CalDAV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">Account Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newIntegration.accountEmail}
                  onChange={(e) => setNewIntegration(prev => ({ ...prev, accountEmail: e.target.value }))}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleCreateIntegration}
                  disabled={createIntegrationMutation.isPending}
                  className="w-full"
                >
                  {createIntegrationMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Add Integration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {integrationsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-light" />
                <p className="text-neutral-medium">Loading integrations...</p>
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-neutral-light mx-auto mb-4" />
                <p className="text-neutral-medium text-lg mb-2">No calendar integrations</p>
                <p className="text-neutral-medium">Add a calendar integration to sync deadlines</p>
              </div>
            ) : (
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(integration.provider)}</span>
                      <div>
                        <h3 className="font-medium text-neutral-dark">
                          {integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)} Calendar
                        </h3>
                        <p className="text-sm text-neutral-medium">{integration.accountEmail}</p>
                        {integration.lastSync && (
                          <p className="text-xs text-neutral-light">
                            Last sync: {format(new Date(integration.lastSync), "MMM d, HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={getStatusColor(integration.isActive, integration.syncEnabled)}
                      >
                        {getStatusText(integration.isActive, integration.syncEnabled)}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={integration.syncEnabled}
                          onCheckedChange={(checked) => 
                            toggleSyncMutation.mutate({ id: integration.id, syncEnabled: checked })
                          }
                          disabled={!integration.isActive || toggleSyncMutation.isPending}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                          disabled={deleteIntegrationMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadline Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Upcoming Deadline Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {remindersLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-light" />
                <p className="text-neutral-medium">Loading reminders...</p>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-neutral-light mx-auto mb-4" />
                <p className="text-neutral-medium text-lg mb-2">No upcoming reminders</p>
                <p className="text-neutral-medium">Deadline reminders will appear here when tasks have due dates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {reminder.reminderType === 'email' ? (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Bell className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-dark">{reminder.message}</h3>
                        <p className="text-sm text-neutral-medium">
                          {format(new Date(reminder.reminderTime), "MMM d, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {reminder.reminderType}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Calendar Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-light" />
                <p className="text-neutral-medium">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-neutral-light mx-auto mb-4" />
                <p className="text-neutral-medium text-lg mb-2">No calendar events</p>
                <p className="text-neutral-medium">Calendar events from integrations will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-dark">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-neutral-medium mt-1">{event.description}</p>
                        )}
                        <p className="text-sm text-neutral-light mt-2">
                          {format(new Date(event.startTime), "MMM d, HH:mm")} - {format(new Date(event.endTime), "HH:mm")}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {event.eventType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}