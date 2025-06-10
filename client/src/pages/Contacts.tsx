import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Mail, Phone, Building } from "lucide-react";
import { Contact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NewContactModal from "@/components/modals/NewContactModal";
import EmailModal from "@/components/modals/EmailModal";

export default function Contacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const filteredContacts = contacts?.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendEmail = (contactsToEmail: Contact[]) => {
    setSelectedContacts(contactsToEmail);
    setIsEmailModalOpen(true);
  };

  const handleSendEmailToAll = () => {
    if (filteredContacts) {
      handleSendEmail(filteredContacts);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-semibold text-neutral-dark">Contacts</h2>
          <p className="text-xs md:text-sm text-neutral-medium">Manage your contact database</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button
            onClick={handleSendEmailToAll}
            variant="outline"
            disabled={!filteredContacts?.length}
            className="text-neutral-dark border-gray-300 hover:bg-gray-50 micro-button-press micro-ripple"
            size="sm"
          >
            <Mail size={16} className="mr-2" />
            <span className="hidden sm:inline">Email All</span> ({filteredContacts?.length || 0})
          </Button>
          <Button
            onClick={() => setIsNewContactModalOpen(true)}
            className="bg-ms-blue hover:bg-ms-blue-dark text-white micro-button-press micro-ripple micro-hover-lift"
            size="sm"
          >
            <Plus size={16} className="mr-2" />
            New Contact
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 md:mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium" size={16} />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {filteredContacts?.map((contact) => (
          <Card key={contact.id} className="micro-card micro-fadeIn">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg text-neutral-dark">{contact.name}</CardTitle>
                  {contact.company && (
                    <p className="text-sm text-neutral-medium mt-1 flex items-center">
                      <Building size={14} className="mr-1" />
                      {contact.company}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendEmail([contact])}
                    className="text-ms-blue hover:text-ms-blue-dark micro-button-press micro-scaleIn"
                  >
                    <Mail size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteContactMutation.mutate(contact.id)}
                    className="text-red-500 hover:text-red-700 micro-button-press micro-scaleIn"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-neutral-medium">
                  <Mail size={14} className="mr-2" />
                  <span className="truncate">{contact.email}</span>
                </div>
                {contact.phone && (
                  <div className="flex items-center text-sm text-neutral-medium">
                    <Phone size={14} className="mr-2" />
                    <span>{contact.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {!filteredContacts?.length && (
          <div className="col-span-full text-center py-12">
            {searchQuery ? (
              <div>
                <p className="text-neutral-medium">No contacts found matching "{searchQuery}"</p>
                <Button
                  onClick={() => setSearchQuery("")}
                  variant="ghost"
                  className="mt-2 text-ms-blue hover:text-ms-blue-dark"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-neutral-medium mb-4">No contacts found</p>
                <Button
                  onClick={() => setIsNewContactModalOpen(true)}
                  className="bg-ms-blue hover:bg-ms-blue-dark text-white"
                >
                  Create your first contact
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {contacts && contacts.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-neutral-medium">
            <span>Total Contacts: {contacts.length}</span>
            <span>
              Showing: {filteredContacts?.length || 0}
              {searchQuery && " (filtered)"}
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewContactModal
        open={isNewContactModalOpen}
        onOpenChange={setIsNewContactModalOpen}
      />

      <EmailModal
        open={isEmailModalOpen}
        onOpenChange={setIsEmailModalOpen}
        contacts={selectedContacts}
      />
    </div>
  );
}
