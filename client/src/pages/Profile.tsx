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
          <p className="text-gray-500">{t('profile.errorLoading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-dark mb-6">{t('profile.title')}</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              {t('profile.personalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('profile.fullName')}</label>
                <div className="mt-1 p-3 border border-gray-200 rounded-md bg-gray-50">
                  {user.user?.name}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">{t('profile.email')}</label>
                <div className="mt-1 p-3 border border-gray-200 rounded-md bg-gray-50 flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-gray-500" />
                  {user.user?.email}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">{t('profile.role')}</label>
                <div className="mt-1">
                  <Badge 
                    variant={user.user?.role === "admin" ? "default" : "secondary"}
                    className="flex items-center w-fit"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {user.user?.role === "admin" ? t('profile.admin') : t('profile.user')}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">{t('profile.memberSince')}</label>
                <div className="mt-1 p-3 border border-gray-200 rounded-md bg-gray-50 flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                  {user.user?.createdAt ? new Date(user.user.createdAt).toLocaleDateString() : "Unknown"}
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button variant="outline" disabled>
{t('profile.updateProfile')}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
Profiel bewerken wordt momenteel beheerd via Microsoft SSO
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}