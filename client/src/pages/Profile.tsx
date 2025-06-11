import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Calendar } from "lucide-react";
import { User as UserType } from "@shared/schema";
import { useTranslations } from "@/hooks/useTranslations";

export default function Profile() {
  const { t } = useTranslations();
  const { data: user, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Unable to load profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-dark mb-6">Profile</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 p-3 border border-gray-200 rounded-md bg-gray-50">
                  {user.user.name}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="mt-1 p-3 border border-gray-200 rounded-md bg-gray-50 flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-gray-500" />
                  {user.user.email}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <div className="mt-1">
                  <Badge 
                    variant={user.user.role === "admin" ? "default" : "secondary"}
                    className="flex items-center w-fit"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {user.user.role === "admin" ? "Administrator" : "User"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Member Since</label>
                <div className="mt-1 p-3 border border-gray-200 rounded-md bg-gray-50 flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                  {new Date(user.user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button variant="outline" disabled>
                Edit Profile
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Profile editing is currently managed through Microsoft SSO
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}