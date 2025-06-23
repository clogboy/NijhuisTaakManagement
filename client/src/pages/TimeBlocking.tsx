import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import { Calendar, Clock, Focus, Plus, Edit, Trash2, Play, Pause } from "lucide-react";
import { format, addDays, startOfWeek, isToday, isSameDay, parseISO } from "date-fns";
import type { DeepFocusBlock, Activity } from "@shared/schema";

export default function TimeBlocking() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isNewBlockModalOpen, setIsNewBlockModalOpen] = useState(false);
  const [newBlockData, setNewBlockData] = useState({
    title: "",
    scheduledStart: "",
    scheduledEnd: "",
    focusType: "deep",
    lowStimulusMode: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get week range for calendar view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get focus blocks for the selected week
  const { data: focusBlocks = [] } = useQuery<DeepFocusBlock[]>({
    queryKey: ["/api/deep-focus", weekStart.toISOString()],
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 7);
      const response = await apiRequest(`/api/deep-focus?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`, "GET");
      return await response.json();
    },
  });

  // Get activities for task linking
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Create new focus block
  const createBlockMutation = useMutation({
    mutationFn: async (blockData: any) => {
      const response = await apiRequest("POST", "/api/deep-focus", blockData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus"] });
      setIsNewBlockModalOpen(false);
      setNewBlockData({
        title: "",
        scheduledStart: "",
        scheduledEnd: "",
        focusType: "deep",
        lowStimulusMode: true,
      });
      toast({
        title: "Focus blok aangemaakt",
        description: "Je nieuwe deep focus sessie is ingepland.",
      });
    },
    onError: () => {
      toast({
        title: "Fout bij aanmaken",
        description: "Kon focus blok niet aanmaken.",
        variant: "destructive",
      });
    },
  });

  // Delete focus block
  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      await apiRequest("DELETE", `/api/deep-focus/${blockId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus"] });
      toast({
        title: "Focus blok verwijderd",
        description: "Het focus blok is succesvol verwijderd.",
      });
    },
    onError: () => {
      toast({
        title: "Fout bij verwijderen",
        description: "Kon focus blok niet verwijderen.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBlock = () => {
    if (!newBlockData.title || !newBlockData.scheduledStart || !newBlockData.scheduledEnd) {
      toast({
        title: "Ontbrekende gegevens",
        description: "Vul alle vereiste velden in.",
        variant: "destructive",
      });
      return;
    }

    createBlockMutation.mutate({
      ...newBlockData,
      scheduledStart: new Date(newBlockData.scheduledStart),
      scheduledEnd: new Date(newBlockData.scheduledEnd),
    });
  };

  const getBlocksForDate = (date: Date) => {
    return focusBlocks.filter(block => 
      isSameDay(new Date(block.scheduledStart), date)
    ).sort((a, b) => 
      new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actief';
      case 'completed': return 'Voltooid';
      case 'cancelled': return 'Geannuleerd';
      default: return 'Gepland';
    }
  };

  const quickFocusPresets = [
    { title: "Quick Focus", duration: 25, type: "shallow" },
    { title: "Deep Work", duration: 90, type: "deep" },
    { title: "Creative Session", duration: 120, type: "creative" },
  ];

  const handleQuickCreate = (preset: any) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + preset.duration * 60000);
    
    createBlockMutation.mutate({
      title: preset.title,
      scheduledStart: now,
      scheduledEnd: endTime,
      focusType: preset.type,
      lowStimulusMode: true,
    });
  };

  return (
    <AppLayout title="Time Blocking" subtitle="Plan en beheer je deep focus sessies">
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Focus size={20} />
              Quick Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickFocusPresets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCreate(preset)}
                  disabled={createBlockMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Play size={14} />
                  {preset.title} ({preset.duration}m)
                </Button>
              ))}
              <Dialog open={isNewBlockModalOpen} onOpenChange={setIsNewBlockModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus size={14} />
                    Custom Block
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuw Focus Blok</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Titel</Label>
                      <Input
                        id="title"
                        value={newBlockData.title}
                        onChange={(e) => setNewBlockData({ ...newBlockData, title: e.target.value })}
                        placeholder="Bijv. Backend API development"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start">Start tijd</Label>
                        <Input
                          id="start"
                          type="datetime-local"
                          value={newBlockData.scheduledStart}
                          onChange={(e) => setNewBlockData({ ...newBlockData, scheduledStart: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end">Eind tijd</Label>
                        <Input
                          id="end"
                          type="datetime-local"
                          value={newBlockData.scheduledEnd}
                          onChange={(e) => setNewBlockData({ ...newBlockData, scheduledEnd: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="type">Focus Type</Label>
                      <Select
                        value={newBlockData.focusType}
                        onValueChange={(value) => setNewBlockData({ ...newBlockData, focusType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deep">Deep Work</SelectItem>
                          <SelectItem value="shallow">Shallow Tasks</SelectItem>
                          <SelectItem value="creative">Creative Work</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateBlock}
                        disabled={createBlockMutation.isPending}
                        className="flex-1"
                      >
                        Aanmaken
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsNewBlockModalOpen(false)}
                        className="flex-1"
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                Week van {format(weekStart, "d MMM")} - {format(addDays(weekStart, 6), "d MMM")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                >
                  Vorige
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Vandaag
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                >
                  Volgende
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((date) => {
                const dayBlocks = getBlocksForDate(date);
                const isCurrentDay = isToday(date);
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-32 p-2 border rounded-lg ${
                      isCurrentDay ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isCurrentDay ? 'text-blue-900' : 'text-gray-700'
                    }`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayBlocks.map((block) => (
                        <div
                          key={block.id}
                          className={`text-xs p-1 rounded border-l-2 ${getStatusColor(block.status)} bg-white hover:bg-gray-100 cursor-pointer`}
                          onClick={() => {
                            // Could open edit modal here
                          }}
                        >
                          <div className="font-medium truncate">{block.title}</div>
                          <div className="text-gray-500">
                            {format(new Date(block.scheduledStart), 'HH:mm')} - 
                            {format(new Date(block.scheduledEnd), 'HH:mm')}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {getStatusText(block.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's Focus Blocks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Vandaag's Focus Blokken
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getBlocksForDate(new Date()).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Geen focus blokken gepland voor vandaag.
              </p>
            ) : (
              <div className="space-y-3">
                {getBlocksForDate(new Date()).map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{block.title}</h4>
                        <Badge variant="secondary" className={`text-white ${getStatusColor(block.status)}`}>
                          {getStatusText(block.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span>
                          {format(new Date(block.scheduledStart), 'HH:mm')} - 
                          {format(new Date(block.scheduledEnd), 'HH:mm')}
                        </span>
                        <span className="capitalize">{block.focusType}</span>
                        {block.selectedActivityId && (
                          <span>
                            Taak: {activities.find(a => a.id === block.selectedActivityId)?.title || 'Onbekend'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {block.status === 'scheduled' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBlockMutation.mutate(block.id)}
                            disabled={deleteBlockMutation.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
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