import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations } from "@/hooks/useTranslations";
import TutorialButton from "@/components/onboarding/TutorialButton";
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
  Clock,
  ListChecks
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
import { AIKeyWarning } from "@/components/ui/ai-key-warning";

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
  const { t } = useTranslations();
  const { data: userPreferences } = useQuery<any>({
    queryKey: ["/api/user/preferences"],
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [submenuClickedRecently, setSubmenuClickedRecently] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    mutationFn: () => apiRequest("/api/auth/logout", "POST"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
    { 
      path: "/activities", 
      icon: CheckSquare, 
      label: t("nav.activities"),
      subItems: [
        { path: "/subtasks", icon: ListChecks, label: t("subtasks") },
        { path: "/quickwins", icon: Trophy, label: t("nav.quickWins") },
        { path: "/roadblocks", icon: AlertTriangle, label: t("nav.roadblocks") },
      ]
    },
    { path: "/contacts", icon: Users, label: t("nav.contacts") },
    { path: "/agenda", icon: Calendar, label: t("nav.agenda") },
    // { path: "/timeblocking", icon: Clock, label: t("nav.timeBlocking") }, // Temporarily disabled
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
      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 
          `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }` : 
          `${isSidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`
        } 
        shadow-2xl border-r border-sidebar-border flex flex-col
        ${isMobile ? 'bg-white dark:bg-gray-900' : 'bg-sidebar-background'}
        ${!isMobile ? 'shadow-[4px_0_20px_rgba(0,0,0,0.1)]' : ''}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-ms-blue rounded-lg flex items-center justify-center">
                  <FolderOpen className="text-white" size={16} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-sidebar-foreground">NijFlow</h1>
                  <p className="text-xs text-muted-foreground">Smart Productivity Platform</p>
                </div>
              </div>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 h-8 w-8 hover:bg-sidebar-accent ml-auto text-sidebar-foreground"
              >
                {isSidebarCollapsed ? <Pin size={16} /> : <PinOff size={16} />}
              </Button>
            )}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 h-8 w-8 hover:bg-sidebar-accent ml-auto text-sidebar-foreground"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>



        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              
              return (
                <li key={item.path} className="relative group">
                  {/* Main menu item */}
                  <Link href={item.path}>
                    <div 
                      className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer micro-nav-item micro-button-press ${
                        isActive 
                          ? "text-sidebar-primary-foreground bg-sidebar-primary active" 
                          : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                      }`}
                      title={isSidebarCollapsed ? item.label : undefined}
                      onClick={() => {
                        if (isMobile) {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                    >
                      <Icon size={16} className={isSidebarCollapsed ? "" : "mr-3"} />
                      {!isSidebarCollapsed && item.label}
                    </div>
                  </Link>
                  
                  {/* Sub-items - normal view when expanded */}
                  {item.subItems && !isSidebarCollapsed && (
                    <ul className="mt-1 ml-6 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = location === subItem.path;
                        const SubIcon = subItem.icon;
                        
                        return (
                          <li key={subItem.path}>
                            <Link href={subItem.path}>
                              <div 
                                className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer micro-nav-item micro-button-press ${
                                  isSubActive 
                                    ? "text-sidebar-primary-foreground bg-sidebar-primary active" 
                                    : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
                                }`}
                                onClick={() => {
                                  if (isMobile) {
                                    setIsMobileMenuOpen(false);
                                  }
                                }}
                              >
                                <SubIcon size={14} className="mr-2" />
                                {subItem.label}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Sub-items popover for collapsed sidebar */}
                  {item.subItems && isSidebarCollapsed && !submenuClickedRecently && (
                    <div className="absolute left-full top-0 ml-2 z-50 group/submenu">
                      <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover/submenu:opacity-100 group-hover/submenu:visible transition-all duration-300 delay-75 bg-popover border border-border rounded-lg shadow-lg py-2 min-w-[180px] transform scale-95 group-hover:scale-100 group-hover/submenu:scale-100">
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
                          {item.label}
                        </div>
                        {item.subItems.map((subItem) => {
                          const isSubActive = location === subItem.path;
                          const SubIcon = subItem.icon;
                          
                          return (
                            <Link key={subItem.path} href={subItem.path}>
                              <div 
                                className={`flex items-center px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                                  isSubActive 
                                    ? "text-primary bg-accent" 
                                    : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                                onClick={() => {
                                  if (isMobile) {
                                    setIsMobileMenuOpen(false);
                                  }
                                  // Mark that submenu was clicked to prevent it from showing again
                                  setSubmenuClickedRecently(true);
                                  // Reset the flag after a delay to allow normal hover behavior later
                                  setTimeout(() => setSubmenuClickedRecently(false), 2000);
                                }}
                              >
                                <SubIcon size={16} className="mr-3" />
                                {subItem.label}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>


      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-background shadow-sm border-b border-border px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 h-8 w-8 hover:bg-gray-100 micro-button-press micro-scaleIn"
                >
                  <Menu size={16} />
                </Button>
              )}
              <div className="min-w-0">
                <h2 className="text-lg md:text-2xl font-semibold text-foreground truncate">{title}</h2>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              {showFilterButton && (
                <Button
                  variant="outline"
                  onClick={onOpenFilterPanel}
                  className="text-neutral-dark border-gray-300 hover:bg-gray-50 micro-button-press micro-ripple"
                  size={isMobile ? "sm" : "default"}
                >
                  <Filter size={16} className={isMobile ? "" : "mr-2"} />
                  {!isMobile && "Filters"}
                </Button>
              )}
              {showCreateButton && (
                <Button
                  onClick={onCreateActivity}
                  className="bg-ms-blue hover:bg-ms-blue-dark text-white micro-button-press micro-ripple micro-hover-lift"
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus size={16} className={isMobile ? "" : "mr-2"} />
                  {!isMobile && "New Activity"}
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
          <div className="h-full overflow-auto">
            <div className="p-4 md:p-6">
              <AIKeyWarning />
            </div>
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Tutorial Button - Always Available */}
      <TutorialButton />
    </div>
  );
}
