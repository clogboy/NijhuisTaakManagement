import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Bell, Shield, Palette, Database, Calendar, Clock, User as UserIcon, Download, Save } from "lucide-react";
import { User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Settings() {
  const { data: user, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // User preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: false,
    dailyReminders: true,
    urgentAlerts: true,
    darkMode: false,
    compactSidebar: false,
    analyticsEnabled: true,
    aiSuggestions: true,
    workingHours: {
      start: "09:00",
      end: "17:00"
    },
    timeZone: "UTC",
    language: "en"
  });
  
  // Profile update state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    bio: ""
  });

  // Initialize form data when user loads
  useState(() => {
    if (user?.user) {
      setProfileData({
        name: user.user.name || "",
        email: user.user.email || "",
        bio: ""
      });
    }
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<typeof profileData>) => {
      return apiRequest(`/api/users/${user?.user.id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/export", "GET");
      return response;
    },
    onSuccess: (data) => {
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed",
        description: "Your data has been exported successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleExportData = () => {
    exportDataMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Unable to load settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
          <Badge variant="outline" className="text-xs">
            User ID: {user?.user.id}
          </Badge>
        </div>
        
        <div className="space-y-6">
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
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio / Description</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* Working Hours & Time Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Working Hours & Time Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={preferences.workingHours.start}
                    onChange={(e) => setPreferences(prev => ({
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
                    value={preferences.workingHours.end}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      workingHours: { ...prev.workingHours, end: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Time Zone</Label>
                  <Select value={preferences.timeZone} onValueChange={(value) => 
                    setPreferences(prev => ({ ...prev, timeZone: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Europe/Amsterdam">Amsterdam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  <p className="text-sm text-gray-500">Receive updates about activities and deadlines</p>
                </div>
                <Switch 
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily agenda reminders</p>
                  <p className="text-sm text-gray-500">Get productivity suggestions each morning</p>
                </div>
                <Switch 
                  checked={preferences.dailyReminders}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, dailyReminders: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Urgent activity alerts</p>
                  <p className="text-sm text-gray-500">Immediate notifications for high-priority items</p>
                </div>
                <Switch 
                  checked={preferences.urgentAlerts}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, urgentAlerts: checked }))
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

          {/* Appearance & Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance & Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark mode</p>
                  <p className="text-sm text-gray-500">Switch between light and dark themes</p>
                </div>
                <Switch 
                  checked={preferences.darkMode}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, darkMode: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact sidebar</p>
                  <p className="text-sm text-gray-500">Start with collapsed sidebar by default</p>
                </div>
                <Switch 
                  checked={preferences.compactSidebar}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, compactSidebar: checked }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="language">Interface Language</Label>
                <Select value={preferences.language} onValueChange={(value) => 
                  setPreferences(prev => ({ ...prev, language: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="nl">Dutch</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
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
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export your data</p>
                  <p className="text-sm text-gray-500">Download all your activities, contacts, and settings</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportData}
                  disabled={exportDataMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportDataMutation.isPending ? "Exporting..." : "Export Data"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Activity analytics</p>
                  <p className="text-sm text-gray-500">Allow usage data collection for insights</p>
                </div>
                <Switch 
                  checked={preferences.analyticsEnabled}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, analyticsEnabled: checked }))
                  }
                />
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