import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Mail, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactEmail?: string;
  contactName?: string;
}

export function WorkspaceInviteModal({ 
  isOpen, 
  onClose, 
  contactEmail = "", 
  contactName = "" 
}: WorkspaceInviteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    inviteeEmail: contactEmail,
    inviteeName: contactName,
    accessLevel: "read_only",
    message: "",
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/workspace/invitations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace/invitations"] });
      toast({
        title: "Invitation Sent",
        description: `Workspace invitation sent to ${formData.inviteeEmail}`,
      });
      onClose();
      setFormData({
        inviteeEmail: "",
        inviteeName: "",
        accessLevel: "read_only",
        message: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send workspace invitation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.inviteeEmail.trim()) {
      inviteMutation.mutate(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite to Workspace
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="colleague@nijhuis.nl"
                value={formData.inviteeEmail}
                onChange={(e) => setFormData({ ...formData, inviteeEmail: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              placeholder="Colleague's name"
              value={formData.inviteeName}
              onChange={(e) => setFormData({ ...formData, inviteeName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access">Access Level</Label>
            <Select 
              value={formData.accessLevel} 
              onValueChange={(value) => setFormData({ ...formData, accessLevel: value })}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read_only">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Read Only</span>
                    <span className="text-xs text-gray-500">View activities, progress, and reports</span>
                  </div>
                </SelectItem>
                <SelectItem value="collaborator" disabled>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Collaborator (Coming Soon)</span>
                    <span className="text-xs text-gray-500">View and comment on activities</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Hi! I'd like to share my workspace progress with you..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="text-blue-800 font-medium mb-1">Read-Only Access Includes:</p>
            <ul className="text-blue-700 text-xs space-y-1">
              <li>• View your activities and progress</li>
              <li>• See completed tasks and achievements</li>
              <li>• Access daily/weekly summaries</li>
              <li>• View time blocking and schedules</li>
              <li>• No ability to edit or create content</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.inviteeEmail.trim() || inviteMutation.isPending}
              className="flex-1"
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}