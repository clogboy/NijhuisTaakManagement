import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslations } from "@/hooks/useTranslations";
import { downloadXMLFile } from "@/utils/xmlExport";
import TestHealthCheck from "@/components/TestHealthCheck";

import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Palette,
  Clock,
  RefreshCw,
  Calendar,
  Activity,
  Globe,
  Download
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

    // Error Reporting status query (dummy data for now)
    const errorReportingStatus = {
      isEnabled: true,
      errorCount: 42,
      reportEmail: user?.user?.email || "example@example.com",
      nextReport: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    };

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
      apiRequest("/api/user/preferences", "PATCH", newPreferences),
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

  // Convert overdue subtasks to roadblocks (admin only)
  const convertOverdueSubtasksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/convert-overdue-subtasks", "POST");
    },
    onSuccess: (data: any) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });

      toast({
        title: "Conversion Complete",
        description: `Converted ${data.totalConverted || 0} overdue subtasks to roadblocks to roadblocks across ${data.usersProcessed || 0} users`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert overdue subtasks",
        variant: "destructive",
      });
    },
  });

  // Get API usage statistics (admin only)
  const { data: apiUsageStats } = useQuery({
    queryKey: ["/api/admin/api-usage"],
    enabled: user?.user?.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('settings.title')}</h1>
          <Badge variant="outline" className="text-xs">
            User ID: {user?.user?.id}
          </Badge>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                {t('settings.profileInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{t('settings.fullName')}</Label>
                  <Input id="name" value={user?.user?.name || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="email">{t('settings.emailAddress')}</Label>
                  <Input id="email" value={user?.user?.email || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="department">{t('settings.department')}</Label>
                  <Input 
                    id="department" 
                    value={profileData.department}
                    onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Engineering, Sales, Marketing..."
                  />
                </div>
                <div>
                  <Label htmlFor="location">{t('settings.location')}</Label>
                  <Input 
                    id="location" 
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Amsterdam, Netherlands"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('settings.phoneNumber')}</Label>
                  <Input 
                    id="phone" 
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+31 6 1234 5678"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">{t('settings.bio')}</Label>
                <Textarea 
                  id="bio" 
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={t('settings.tellUsAboutYourself')}
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
                {t('settings.workingHoursSchedule')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">{t('settings.startTime')}</Label>
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
                  <Label htmlFor="end-time">{t('settings.endTime')}</Label>
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
                <Label htmlFor="timezone">{t('settings.timezone')}</Label>
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
                    Status: {user?.user?.microsoftId ? "Connected" : "Not Connected"}
                  </p>
                </div>
                <Badge variant={user?.user?.microsoftId ? "default" : "secondary"}>
                  {user?.user?.microsoftId ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-sync time blocks</p>
                  <p className="text-sm text-gray-500">Automatically create calendar events for scheduled activities</p>
                </div>
                <Switch disabled={!user?.user?.microsoftId} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Conflict detection</p>
                  <p className="text-sm text-gray-500">Check for scheduling conflicts with existing events</p>
                </div>
                <Switch disabled={!user?.user?.microsoftId} />
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
                <Badge variant={user?.user?.role === "admin" ? "default" : "secondary"}>
                  {user?.user?.role === "admin" ? "Administrator" : "User"}
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
                    {user?.user?.createdAt ? new Date(user.user?.createdAt).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
                <Badge variant="outline">
                  {user?.user?.createdAt ? 
                    Math.floor((Date.now() - new Date(user.user?.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + " days ago" :
                    "Unknown"
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Translation Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('settings.translationManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.currentLanguage')}</p>
                  <p className="text-sm text-gray-500">Nederlands (Dutch)</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.exportTranslations')}</p>
                  <p className="text-sm text-gray-500">Download vertalingen als XML-bestand voor handmatige bewerking</p>
                </div>
                <Button onClick={downloadXMLFile} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('settings.exportXML')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {t('settings.exportData')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Exporteer je gegevens</p>
                  <p className="text-sm text-gray-500">Download al je activiteiten, contacten en instellingen</p>
                </div>
                <Button onClick={handleExportData} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exporteren
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.aiSuggestions')}</p>
                  <p className="text-sm text-gray-500">Intelligente productiviteitsaanbevelingen inschakelen</p>
                </div>
                <Switch 
                  checked={preferences.aiSuggestions}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, aiSuggestions: checked }))
                  }
                />
              </div>

              {user?.user?.role === 'admin' && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium">Convert Overdue Subtasks</Label>
                    <p className="text-sm text-gray-500 mb-3">
                      Manually trigger conversion of overdue subtasks to roadblocks. This normally happens automatically at midnight.
                    </p>
                    <Button 
                      onClick={() => convertOverdueSubtasksMutation.mutate()}
                      disabled={convertOverdueSubtasksMutation.isPending}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {convertOverdueSubtasksMutation.isPending ? "Converting..." : "Convert Overdue Subtasks"}
                    </Button>
                  </div>

                  {apiUsageStats && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium">API Usage Statistics</Label>
                        <p className="text-sm text-gray-500 mb-3">
                          Monitor OpenAI API usage to manage costs effectively
                        </p>
                        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <div className="text-sm font-medium">Daily Requests</div>
                            <div className="text-lg">{(apiUsageStats as any)?.dailyCount || 0}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Total Tokens</div>
                            <div className="text-lg">{((apiUsageStats as any)?.totalTokens || 0).toLocaleString()}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-2">Request Types</div>
                            {Object.entries((apiUsageStats as any)?.requestTypes || {}).map(([type, count]) => (
                              <div key={type} className="flex justify-between text-xs">
                                <span>{type}</span>
                                <span>{String(count)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Monitor the health of your application's unit tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestHealthCheck />
            </CardContent>
          </Card>

                    {/* Scheduler Status */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('settings.schedulerStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>

            </CardContent>
          </Card> */}

          <Separator />

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              NijFlow Activity Management System v2.0
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
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/hooks/useTranslations";

export default function Settings() {
  const translations = useTranslations();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{translations.settings?.title || "Settings"}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your application preferences and account settings.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="nl">
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="notifications" />
                <Label htmlFor="notifications">Enable notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="dark-mode" />
                <Label htmlFor="dark-mode">Dark mode</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" placeholder="your@email.com" />
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="name">Display Name</Label>
                <Input type="text" id="name" placeholder="Your Name" />
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
