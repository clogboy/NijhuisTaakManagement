import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Edit,
  Mail,
  Trophy,
  Filter,
  X,
  Download
} from "lucide-react";
import { Activity, Contact, QuickWin } from "@shared/schema";
import NewActivityModal from "@/components/modals/NewActivityModal";
import EditActivityModal from "@/components/modals/EditActivityModal";
import EmailModal from "@/components/modals/EmailModal";
import { format } from "date-fns";

interface DashboardStats {
  urgentCount: number;
  dueThisWeek: number;
  completedCount: number;
  activeContacts: number;
}

export default function Dashboard() {
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [sortBy, setSortBy] = useState<string>("priority");
  const [priorityFilters, setPriorityFilters] = useState<string[]>(["urgent", "normal", "low"]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: quickWins, isLoading: quickWinsLoading } = useQuery<QuickWin[]>({
    queryKey: ["/api/quickwins"],
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "normal": return "bg-orange-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "normal": return "bg-orange-100 text-orange-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "planned": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredActivities = activities?.filter(activity => {
    // Priority filter
    if (!priorityFilters.includes(activity.priority)) return false;
    
    // Contact filter
    if (selectedContacts.length > 0 && activity.assignedTo && !selectedContacts.includes(activity.assignedTo)) {
      return false;
    }
    
    // Date range filter
    if (dateRange.from && activity.dueDate) {
      const activityDate = new Date(activity.dueDate);
      const fromDate = new Date(dateRange.from);
      if (activityDate < fromDate) return false;
    }
    
    if (dateRange.to && activity.dueDate) {
      const activityDate = new Date(activity.dueDate);
      const toDate = new Date(dateRange.to);
      if (activityDate > toDate) return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { urgent: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    } else if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsEditActivityModalOpen(true);
  };

  const handleSendEmail = () => {
    setIsEmailModalOpen(true);
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilters(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleContactFilter = (contactId: number) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const getContactName = (contactId: number) => {
    return contacts?.find(c => c.id === contactId)?.name || "Unknown";
  };

  const getLinkedActivityTitle = (activityId: number | null) => {
    if (!activityId) return null;
    return activities?.find(a => a.id === activityId)?.title || "Unknown Activity";
  };

  if (statsLoading || activitiesLoading || contactsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="text-white" size={16} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-medium">Urgent Activities</p>
                  <p className="text-2xl font-semibold text-neutral-dark">{stats?.urgentCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Clock className="text-white" size={16} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-medium">Due This Week</p>
                  <p className="text-2xl font-semibold text-neutral-dark">{stats?.dueThisWeek || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-white" size={16} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-medium">Completed</p>
                  <p className="text-2xl font-semibold text-neutral-dark">{stats?.completedCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-ms-blue rounded-lg flex items-center justify-center">
                    <Users className="text-white" size={16} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-medium">Active Contacts</p>
                  <p className="text-2xl font-semibold text-neutral-dark">{stats?.activeContacts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities Table */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-dark">Recent Activities</h3>
              <div className="flex items-center space-x-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Sort by Priority</SelectItem>
                    <SelectItem value="dueDate">Sort by Due Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setIsFilterPanelOpen(true)}
                  className="text-neutral-dark border-gray-300 hover:bg-gray-50"
                >
                  <Filter size={16} className="mr-2" />
                  Filters
                </Button>
                <Button
                  onClick={() => setIsNewActivityModalOpen(true)}
                  className="bg-ms-blue hover:bg-ms-blue-dark text-white"
                >
                  New Activity
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivities?.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 ${getPriorityColor(activity.priority)} rounded-full mr-3`}></div>
                        <div>
                          <div className="text-sm font-medium text-neutral-dark">{activity.title}</div>
                          <div className="text-sm text-neutral-medium">{activity.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getPriorityBadgeColor(activity.priority)}>
                        {activity.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-dark">
                      {activity.dueDate ? format(new Date(activity.dueDate), "MMM dd, yyyy") : "No due date"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-300 rounded-full mr-2"></div>
                        <span className="text-sm text-neutral-dark">
                          {activity.assignedTo ? getContactName(activity.assignedTo) : "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusBadgeColor(activity.status)}>
                        {activity.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditActivity(activity)}
                          className="text-ms-blue hover:text-ms-blue-dark"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSendEmail}
                          className="text-neutral-medium hover:text-neutral-dark"
                        >
                          <Mail size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredActivities?.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-medium">
                      No activities found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Wins Section */}
        <Card className="mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-dark">Recent Quick Wins</h3>
              <Button variant="ghost" className="text-sm text-ms-blue hover:text-ms-blue-dark font-medium">
                View All
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickWins?.slice(0, 6).map((win) => (
                <div
                  key={win.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-neutral-dark">{win.title}</h4>
                      <p className="text-xs text-neutral-medium mt-1">{win.description}</p>
                      {win.linkedActivityId && (
                        <div className="flex items-center mt-2">
                          <span className="text-xs text-neutral-medium">Linked to:</span>
                          <span className="text-xs text-ms-blue ml-1">
                            {getLinkedActivityTitle(win.linkedActivityId)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-2">
                      <Trophy className="text-yellow-500" size={16} />
                    </div>
                  </div>
                </div>
              ))}
              {!quickWins?.length && (
                <div className="col-span-full text-center text-neutral-medium py-8">
                  No quick wins created yet
                </div>
              )}
            </div>
          </div>
        </Card>
      </main>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <aside className="w-80 bg-white shadow-sm border-l border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-dark">Filters & Contacts</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-neutral-medium hover:text-neutral-dark"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Priority Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Priority</h4>
            <div className="space-y-2">
              {["urgent", "normal", "low"].map((priority) => (
                <label key={priority} className="flex items-center">
                  <Checkbox
                    checked={priorityFilters.includes(priority)}
                    onCheckedChange={() => togglePriorityFilter(priority)}
                  />
                  <span className="ml-2 text-sm text-neutral-dark capitalize">{priority}</span>
                  <div className={`w-3 h-3 ${getPriorityColor(priority)} rounded-full ml-auto`}></div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Due Date</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-medium mb-1">From</label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-medium mb-1">To</label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Contact Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Filter by Contacts</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {contacts?.map((contact) => (
                <label key={contact.id} className="flex items-start space-x-2">
                  <Checkbox
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={() => toggleContactFilter(contact.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-dark">{contact.name}</div>
                    <div className="text-xs text-neutral-medium truncate">{contact.company}</div>
                    <div className="text-xs text-neutral-medium">{contact.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium text-neutral-dark mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button
                onClick={handleSendEmail}
                className="w-full bg-ms-blue hover:bg-ms-blue-dark text-white"
              >
                <Mail size={16} className="mr-2" />
                Send Email to Selected
              </Button>
              <Button
                variant="outline"
                className="w-full text-neutral-dark border-gray-300 hover:bg-gray-50"
              >
                <Download size={16} className="mr-2" />
                Export Filtered Data
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Modals */}
      <NewActivityModal
        open={isNewActivityModalOpen}
        onOpenChange={setIsNewActivityModalOpen}
      />

      <EditActivityModal
        open={isEditActivityModalOpen}
        onOpenChange={setIsEditActivityModalOpen}
        activity={selectedActivity}
      />

      {contacts && (
        <EmailModal
          open={isEmailModalOpen}
          onOpenChange={setIsEmailModalOpen}
          contacts={contacts}
        />
      )}
    </div>
  );
}
