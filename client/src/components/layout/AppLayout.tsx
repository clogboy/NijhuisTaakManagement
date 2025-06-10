import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  FolderOpen, 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Trophy, 
  BarChart3, 
  LogOut,
  Filter,
  Plus,
  User as UserIcon,
  Settings,
  Menu,
  X,
  Calendar,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenFilterPanel?: () => void;
  onCreateActivity?: () => void;
  showFilterButton?: boolean;
  showCreateButton?: boolean;
  title?: string;
  subtitle?: string;
}

export default function AppLayout({ 
  children, 
  onOpenFilterPanel, 
  onCreateActivity,
  showFilterButton = false,
  showCreateButton = false,
  title = "Activity Dashboard",
  subtitle = "Manage your dossiers and track progress"
}: AppLayoutProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/activities", icon: CheckSquare, label: "Activities" },
    { path: "/contacts", icon: Users, label: "Contacts" },
    { path: "/quickwins", icon: Trophy, label: "Quick Wins" },
    { path: "/roadblocks", icon: AlertTriangle, label: "Roadblocks" },
    { path: "/agenda", icon: Calendar, label: "AI Agenda" },
    { path: "/reports", icon: BarChart3, label: "Reports" },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-ms-blue rounded-lg flex items-center justify-center">
              <FolderOpen className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-dark">Dossier Manager</h1>
              <p className="text-xs text-neutral-medium">Activity Management</p>
            </div>
          </div>
        </div>



        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              
              return (
                <li key={item.path}>
                  <Link href={item.path}>
                    <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive 
                        ? "text-white bg-ms-blue" 
                        : "text-neutral-medium hover:text-neutral-dark hover:bg-gray-100"
                    }`}>
                      <Icon size={16} className="mr-3" />
                      {item.label}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>


      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-dark">{title}</h2>
              <p className="text-sm text-neutral-medium">{subtitle}</p>
            </div>
            <div className="flex items-center space-x-3">
              {showFilterButton && (
                <Button
                  variant="outline"
                  onClick={onOpenFilterPanel}
                  className="text-neutral-dark border-gray-300 hover:bg-gray-50"
                >
                  <Filter size={16} className="mr-2" />
                  Filters
                </Button>
              )}
              {showCreateButton && (
                <Button
                  onClick={onCreateActivity}
                  className="bg-ms-blue hover:bg-ms-blue-dark text-white"
                >
                  <Plus size={16} className="mr-2" />
                  New Activity
                </Button>
              )}
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-ms-blue text-white">
                        {getInitials(user.user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.user.email}
                      </p>
                      <Badge 
                        variant={user.user.role === "admin" ? "default" : "secondary"} 
                        className="text-xs w-fit"
                      >
                        {user.user.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Signing out..." : "Sign out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
