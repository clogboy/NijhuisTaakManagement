import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/auth";
import { useTranslations } from "@/hooks/useTranslations";

interface Activity {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'not_started' | 'in_progress' | 'completed';
  location?: string;
  participants?: string[];
  category?: string;
  estimatedHours?: number;
}

interface TimeBlock {
  id: string;
  activityId: string;
  startTime: string;
  endTime: string;
  date: string;
  title: string;
  activity?: Activity;
}

export default function Agenda() {
  const translations = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch activities
  const activitiesQuery = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => apiRequest('GET', '/activities'),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch time blocks for the selected date
  const timeBlocksQuery = useQuery<TimeBlock[]>({
    queryKey: ['timeblocks', selectedDate],
    queryFn: () => apiRequest('GET', `/timeblocks?date=${selectedDate}`),
    staleTime: 5 * 60 * 1000,
  });

  const activities = activitiesQuery.data || [];
  const timeBlocks = timeBlocksQuery.data || [];

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || activity.status === filterStatus;
    const matchesPriority = filterPriority === "all" || activity.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
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
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "not_started": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{translations.agenda.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {translations.agenda.description}
          </p>
        </div>

        {/* Date Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {translations.agenda.selectDate}
          </label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(selectedDate)}
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={translations.agenda.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder={translations.agenda.filterByStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translations.activities.allStatuses}</SelectItem>
              <SelectItem value="not_started">{translations.activities.notStarted}</SelectItem>
              <SelectItem value="in_progress">{translations.activities.inProgress}</SelectItem>
              <SelectItem value="completed">{translations.activities.completed}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger>
              <SelectValue placeholder={translations.agenda.filterByPriority} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translations.activities.allPriorities}</SelectItem>
              <SelectItem value="high">{translations.activities.high}</SelectItem>
              <SelectItem value="normal">{translations.activities.normal}</SelectItem>
              <SelectItem value="low">{translations.activities.low}</SelectItem>
            </SelectContent>
          </Select>

          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {translations.agenda.addTimeBlock}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Blocks for Selected Date */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {translations.agenda.scheduledItems}
            </h2>

            {timeBlocksQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : timeBlocks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">{translations.agenda.noScheduledItems}</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    {translations.agenda.addTimeBlock}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {timeBlocks.map((timeBlock) => (
                  <Card key={timeBlock.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{timeBlock.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTime(timeBlock.startTime)} - {formatTime(timeBlock.endTime)}
                            </div>
                          </div>
                          {timeBlock.activity && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={getPriorityColor(timeBlock.activity.priority)}>
                                {translations.activities[timeBlock.activity.priority as keyof typeof translations.activities]}
                              </Badge>
                              <Badge className={getStatusColor(timeBlock.activity.status)}>
                                {translations.activities[timeBlock.activity.status as keyof typeof translations.activities]}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available Activities */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {translations.agenda.availableActivities}
            </h2>

            {activitiesQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredActivities.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || filterStatus !== "all" || filterPriority !== "all" 
                      ? translations.agenda.noMatchingActivities
                      : translations.agenda.noActivities
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredActivities.map((activity) => (
                  <Card key={activity.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{activity.title}</h3>
                          {activity.description && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                              {activity.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {activity.deadline && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(activity.deadline).toLocaleDateString('nl-NL')}
                              </div>
                            )}
                            {activity.estimatedHours && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {activity.estimatedHours}h
                              </div>
                            )}
                            {activity.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {activity.location}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <Badge className={getPriorityColor(activity.priority)}>
                              {translations.activities[activity.priority as keyof typeof translations.activities]}
                            </Badge>
                            <Badge className={getStatusColor(activity.status)}>
                              {translations.activities[activity.status as keyof typeof translations.activities]}
                            </Badge>
                          </div>
                        </div>

                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}