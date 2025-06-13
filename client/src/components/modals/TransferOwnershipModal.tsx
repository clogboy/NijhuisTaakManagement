import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, UserCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Activity, User } from "@shared/schema";

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity;
}

export function TransferOwnershipModal({ isOpen, onClose, activity }: TransferOwnershipModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async (newOwnerId: number) => {
      return apiRequest("POST", `/api/activities/${activity.id}/transfer-ownership`, {
        newOwnerId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Eigendom overgedragen",
        description: "De dossier eigendom is succesvol overgedragen.",
      });
      
      onClose();
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij overdracht",
        description: error.message || "Kon eigendom niet overdragen.",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    if (!selectedUserId) {
      toast({
        title: "Selecteer gebruiker",
        description: "Kies een nieuwe eigenaar voor dit dossier.",
        variant: "destructive",
      });
      return;
    }

    transferOwnershipMutation.mutate(parseInt(selectedUserId));
  };

  const availableUsers = users?.filter(user => user.id !== activity.createdBy) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Eigendom overdragen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Let op: Deze actie kan niet ongedaan worden gemaakt
                </p>
                <p className="text-amber-600 dark:text-amber-400 mt-1">
                  Je verliest alle toegang tot dit dossier na overdracht.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Huidig dossier</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {activity.title}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Nieuwe eigenaar</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecteer nieuwe eigenaar..." />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <SelectItem value="loading" disabled>
                      Gebruikers laden...
                    </SelectItem>
                  ) : availableUsers.length === 0 ? (
                    <SelectItem value="no-users" disabled>
                      Geen andere gebruikers beschikbaar
                    </SelectItem>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={transferOwnershipMutation.isPending}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedUserId || transferOwnershipMutation.isPending || availableUsers.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {transferOwnershipMutation.isPending ? "Overdragen..." : "Eigendom overdragen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}