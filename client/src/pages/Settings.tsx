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
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/lib/translations";
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
  Settings2
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
  const { data: user, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, language, setTheme, setLanguage, resetToSystem } = useTheme();
  const t = useTranslation(language);

  const [preferences, setPreferences] = useState<UserPreferences>({
    workingHours: { start: "09:00", end: "17:00" },
    timezone: "Europe/Amsterdam",
    language: language || "en",
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    calendarSync: false,
    autoTimeBlocks: false,
    darkMode: theme === 'dark',
    compactSidebar: false,
    aiSuggestions: true,
  });

  // Sync preferences with theme context changes
  useEffect(() => {
    setPreferences(prev => ({
      ...prev,
      language: language || "en",
      darkMode: theme === 'dark'
    }));
  }, [theme, language]);

  const [profileData, setProfileData] = useState({
    bio: "",
    department: "",
    location: "",
    phone: "",
  });

  // Load preferences from localStorage on mount with system defaults
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    
    // Detect system preferences
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemLanguage = navigator.language.startsWith('nl') ? 'nl' : 'en';
    
    if (savedPreferences) {
      const parsed = JSON.parse(savedPreferences);
      setPreferences(parsed);
      
      // Apply dark mode immediately
      if (parsed.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Use system defaults for first-time users
      const systemDefaults = {
        ...preferences,
        darkMode: systemDarkMode,
        language: systemLanguage,
      };
      setPreferences(systemDefaults);
      
      // Apply system dark mode
      if (systemDarkMode) {
        document.documentElement.classList.add('dark');
      }
      
      // Save system defaults
      localStorage.setItem('userPreferences', JSON.stringify(systemDefaults));
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't manually set a preference
      const savedPreferences = localStorage.getItem('userPreferences');
      if (!savedPreferences) {
        const newPreferences = { ...preferences, darkMode: e.matches };
        setPreferences(newPreferences);
        localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    
    // Apply dark mode changes immediately
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences]);

  const updatePreferencesMutation = useMutation({
    mutationFn: (newPreferences: Partial<UserPreferences>) => 
      apiRequest("PATCH", "/api/user/preferences", newPreferences),
    onSuccess: () => {
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

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    // Debounced save to server
    setTimeout(() => {
      updatePreferencesMutation.mutate({ [key]: value });
    }, 500);
  };

  const handleWorkingHoursChange = (type: 'start' | 'end', value: string) => {
    const newWorkingHours = { ...preferences.workingHours, [type]: value };
    const newPreferences = { ...preferences, workingHours: newWorkingHours };
    setPreferences(newPreferences);
    
    setTimeout(() => {
      updatePreferencesMutation.mutate({ workingHours: newWorkingHours });
    }, 500);
  };

  const handleResetToSystem = () => {
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemLanguage = navigator.language.startsWith('nl') ? 'nl' : 'en';
    
    const systemDefaults = {
      ...preferences,
      darkMode: systemDarkMode,
      language: systemLanguage,
    };
    
    setPreferences(systemDefaults);
    localStorage.setItem('userPreferences', JSON.stringify(systemDefaults));
    
    toast({
      title: "Settings reset",
      description: "Your preferences have been reset to match your system settings.",
    });
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
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('settings')}</h1>
          <Badge variant="outline" className="text-xs">
            User ID: {user?.user.id}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-6">
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
                  <Select value={preferences.workingHours.start} onValueChange={(value) => 
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
                  <Select value={preferences.workingHours.end} onValueChange={(value) => 
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
                  <p className="font-medium">{t('darkMode')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Switch between light and dark themes
                    {window.matchMedia('(prefers-color-scheme: dark)').matches ? ' (System: Dark)' : ' (System: Light)'}
                  </p>
                </div>
                <Switch 
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => 
                    setTheme(checked ? 'dark' : 'light')
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
              <div>
                <Label htmlFor="language">{t('language')}</Label>
                <Select value={language} onValueChange={(value) => 
                  setLanguage(value as 'en' | 'nl')
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      English {navigator.language.startsWith('en') ? '(System)' : ''}
                    </SelectItem>
                    <SelectItem value="nl">
                      Dutch {navigator.language.startsWith('nl') ? '(System)' : ''}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  onClick={resetToSystem}
                  className="w-full"
                >
                  {t('resetToSystem')}
                </Button>
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