import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Bell, Shield, Palette, Database } from "lucide-react";
import { User as UserType } from "@shared/schema";

export default function Settings() {
  const { data: user, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

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
        <h1 className="text-2xl font-bold text-neutral-dark mb-6">Settings</h1>
        
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-gray-500">Receive updates about activities and deadlines</p>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily agenda reminders</p>
                  <p className="text-sm text-gray-500">Get AI-generated agenda suggestions each morning</p>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Urgent activity alerts</p>
                  <p className="text-sm text-gray-500">Immediate notifications for high-priority items</p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark mode</p>
                  <p className="text-sm text-gray-500">Switch between light and dark themes</p>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact sidebar</p>
                  <p className="text-sm text-gray-500">Start with collapsed sidebar by default</p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>

          {/* Security & Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Role</p>
                  <p className="text-sm text-gray-500">Your access level in the system</p>
                </div>
                <Badge variant={user.user.role === "admin" ? "default" : "secondary"}>
                  {user.user.role === "admin" ? "Administrator" : "User"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-factor authentication</p>
                  <p className="text-sm text-gray-500">Managed through Microsoft SSO</p>
                </div>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session management</p>
                  <p className="text-sm text-gray-500">Automatic logout after inactivity</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Data & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Data export</p>
                  <p className="text-sm text-gray-500">Download your activities and contacts</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Export Data
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Activity analytics</p>
                  <p className="text-sm text-gray-500">Allow usage data collection for insights</p>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI suggestions</p>
                  <p className="text-sm text-gray-500">Use AI to enhance productivity recommendations</p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>

          <div className="pt-4 text-center">
            <p className="text-xs text-gray-500">
              Settings are currently in development. Contact your administrator for configuration changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}