import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslations } from "@/hooks/useTranslations";

import {
  User as UserIcon,
  Clock,
  Bell,
  Calendar,
  Palette,
  Shield,
  Download,
  Globe,
  Moon,
  Sun,
  Settings2,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { User as UserType } from "@shared/schema";

interface UserPreferences {
  workingHours: {
    start: string;
    end: string;
  };
  timezone: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  calendarSync: boolean;
  autoTimeBlocks: boolean;
  darkMode: boolean;
  compactSidebar: boolean;
  aiSuggestions: boolean;
}

export default function Settings() {
  const { t } = useTranslations();
  const { data: user, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: serverPreferences } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
  });

  // Scheduler status query
  const { data: schedulerStatus } = useQuery({
    queryKey: ["/api/scheduler/status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [preferences, setPreferences] = useState<UserPreferences>({
    workingHours: { start: "09:00", end: "17:00" },
    timezone: "Europe/Amsterdam",
    language: "en",
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    calendarSync: false,
    autoTimeBlocks: false,
    darkMode: false,
    compactSidebar: false,
    aiSuggestions: true,
  });

  // Load preferences from server when available
  useEffect(() => {
    if (serverPreferences) {
      setPreferences(serverPreferences);
      
      // Apply dark mode immediately when preferences load
      if (serverPreferences.darkMode !== undefined) {
        if (serverPreferences.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, [serverPreferences]);

  const [profileData, setProfileData] = useState({
    bio: "",
    department: "",
    location: "",
    phone: "",
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferencesMutation = useMutation({
    mutationFn: (newPreferences: Partial<UserPreferences>) => 
      apiRequest("PATCH", "/api/user/preferences", newPreferences),
    onSuccess: () => {
      // Invalidate and refetch preferences
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Scheduler trigger mutation
  const triggerSchedulerMutation = useMutation({
    mutationFn: () => apiRequest("/api/scheduler/trigger", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
      toast({
        title: "Scheduler triggered",
        description: "Daily sync has been initiated manually.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to trigger scheduler. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    // Apply immediate UI changes
    if (key === 'compactSidebar') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(value));
    }
    
    if (key === 'darkMode') {
      // Apply dark mode immediately to document
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    // Debounced save to server
    setTimeout(() => {
      updatePreferencesMutation.mutate({ [key]: value });
    }, 500);
  };

  const handleWorkingHoursChange = (type: 'start' | 'end', value: string) => {
    const currentWorkingHours = preferences.workingHours || { start: "09:00", end: "17:00" };
    const newWorkingHours = { ...currentWorkingHours, [type]: value };
    const newPreferences = { ...preferences, workingHours: newWorkingHours };
    setPreferences(newPreferences);
    
    setTimeout(() => {
      updatePreferencesMutation.mutate({ workingHours: newWorkingHours });
    }, 500);
  };



  const handleExportData = () => {
    // Export user data logic
    toast({
      title: "Export initiated",
      description: "Your data export will be ready shortly.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
          <Badge variant="outline" className="text-xs">
            User ID: {user?.user.id}
          </Badge>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={user?.user.name || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={user?.user.email || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    value={profileData.department}
                    onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Engineering, Sales, Marketing..."
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Amsterdam, Netherlands"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+31 6 1234 5678"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Hours & Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Working Hours & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Select value={preferences.workingHours?.start || "09:00"} onValueChange={(value) => 
                    handleWorkingHoursChange('start', value)
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="07:00">07:00</SelectItem>
                      <SelectItem value="08:00">08:00</SelectItem>
                      <SelectItem value="09:00">09:00</SelectItem>
                      <SelectItem value="10:00">10:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Select value={preferences.workingHours?.end || "17:00"} onValueChange={(value) => 
                    handleWorkingHoursChange('end', value)
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:00">16:00</SelectItem>
                      <SelectItem value="17:00">17:00</SelectItem>
                      <SelectItem value="18:00">18:00</SelectItem>
                      <SelectItem value="19:00">19:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={preferences.timezone} onValueChange={(value) => 
                  handlePreferenceChange('timezone', value)
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Amsterdam">Europe/Amsterdam (CET)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-gray-500">Receive email updates about activities and deadlines</p>
                </div>
                <Switch 
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('emailNotifications', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push notifications</p>
                  <p className="text-sm text-gray-500">Get browser notifications for urgent tasks</p>
                </div>
                <Switch 
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('pushNotifications', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly digest</p>
                  <p className="text-sm text-gray-500">Summary of your week's productivity and upcoming tasks</p>
                </div>
                <Switch 
                  checked={preferences.weeklyDigest}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('weeklyDigest', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Microsoft Calendar Sync</p>
                  <p className="text-sm text-gray-500">
                    Status: {user?.user.microsoftId ? "Connected" : "Not Connected"}
                  </p>
                </div>
                <Badge variant={user?.user.microsoftId ? "default" : "secondary"}>
                  {user?.user.microsoftId ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-sync time blocks</p>
                  <p className="text-sm text-gray-500">Automatically create calendar events for scheduled activities</p>
                </div>
                <Switch disabled={!user?.user.microsoftId} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Conflict detection</p>
                  <p className="text-sm text-gray-500">Check for scheduling conflicts with existing events</p>
                </div>
                <Switch disabled={!user?.user.microsoftId} />
              </div>
            </CardContent>
          </Card>

          {/* Interface Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Interface Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark mode</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Use dark theme across the application</p>
                </div>
                <Switch 
                  checked={preferences.darkMode}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('darkMode', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact sidebar</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start with collapsed sidebar by default</p>
                </div>
                <Switch 
                  checked={preferences.compactSidebar}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('compactSidebar', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>



          {/* Security & Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Role</p>
                  <p className="text-sm text-gray-500">Your access level in the system</p>
                </div>
                <Badge variant={user?.user.role === "admin" ? "default" : "secondary"}>
                  {user?.user.role === "admin" ? "Administrator" : "User"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-factor authentication</p>
                  <p className="text-sm text-gray-500">Enhanced security through Microsoft SSO</p>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Account created</p>
                  <p className="text-sm text-gray-500">
                    {user?.user.createdAt ? new Date(user.user.createdAt).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
                <Badge variant="outline">
                  {user?.user.createdAt ? 
                    Math.floor((Date.now() - new Date(user.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + " days ago" :
                    "Unknown"
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export your data</p>
                  <p className="text-sm text-gray-500">Download all your activities, contacts, and settings</p>
                </div>
                <Button onClick={handleExportData} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Smart suggestions</p>
                  <p className="text-sm text-gray-500">Enable intelligent productivity recommendations</p>
                </div>
                <Switch 
                  checked={preferences.aiSuggestions}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, aiSuggestions: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nijhuis Activity Management System v2.0
            </p>
            <p className="text-xs text-gray-500">
              Settings are automatically saved. Changes take effect immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}