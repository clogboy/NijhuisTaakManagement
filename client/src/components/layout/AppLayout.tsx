import { useState, useEffect } from "react";
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
  AlertTriangle,
  Pin,
  PinOff,
  Clock
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
  const { data: userPreferences } = useQuery<any>({
    queryKey: ["/api/user/preferences"],
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Sync sidebar state and theme with user preferences when preferences load
  useEffect(() => {
    if (userPreferences) {
      if (userPreferences.compactSidebar !== undefined) {
        setIsSidebarCollapsed(userPreferences.compactSidebar);
      }
      
      if (userPreferences.darkMode !== undefined) {
        if (userPreferences.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, [userPreferences]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

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
    // { path: "/timeblocking", icon: Clock, label: "Time Blocking" }, // Temporarily disabled
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-sidebar-background shadow-sm border-r border-sidebar-border flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-ms-blue rounded-lg flex items-center justify-center">
                  <FolderOpen className="text-white" size={16} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-sidebar-foreground">Dossier Manager</h1>
                  <p className="text-xs text-muted-foreground">Activity Management</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 h-8 w-8 hover:bg-sidebar-accent ml-auto text-sidebar-foreground"
            >
              {isSidebarCollapsed ? <Pin size={16} /> : <PinOff size={16} />}
            </Button>
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
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive 
                        ? "text-sidebar-primary-foreground bg-sidebar-primary" 
                        : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}>
                      <Icon size={16} className={isSidebarCollapsed ? "" : "mr-3"} />
                      {!isSidebarCollapsed && item.label}
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
        <header className="bg-background shadow-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
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
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
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
