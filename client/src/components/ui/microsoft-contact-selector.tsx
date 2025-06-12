import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, Mail, Building, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicrosoftContact {
  id: string;
  displayName: string;
  emailAddresses: Array<{
    address: string;
    name?: string;
  }>;
  businessPhones: string[];
  mobilePhone?: string;
  jobTitle?: string;
  companyName?: string;
  department?: string;
}

interface MicrosoftContactSelectorProps {
  selectedContacts: MicrosoftContact[];
  onContactsChange: (contacts: MicrosoftContact[]) => void;
  className?: string;
  placeholder?: string;
}

export function MicrosoftContactSelector({
  selectedContacts,
  onContactsChange,
  className,
  placeholder = "Search Microsoft contacts..."
}: MicrosoftContactSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { data: contacts = [], isLoading } = useQuery<MicrosoftContact[]>({
    queryKey: ["/api/microsoft/contacts", searchQuery],
    queryFn: () => {
      const url = new URL("/api/microsoft/contacts", window.location.origin);
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }
      return fetch(url.toString(), { credentials: "include" }).then(res => res.json());
    },
    enabled: searchQuery.length >= 2 || searchQuery.length === 0,
  });

  const addContact = (contact: MicrosoftContact) => {
    const isAlreadySelected = selectedContacts.some(c => c.id === contact.id);
    if (!isAlreadySelected) {
      onContactsChange([...selectedContacts, contact]);
    }
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const removeContact = (contactId: string) => {
    onContactsChange(selectedContacts.filter(c => c.id !== contactId));
  };

  const filteredContacts = contacts.filter(contact =>
    !selectedContacts.some(selected => selected.id === contact.id)
  );

  const getPrimaryEmail = (contact: MicrosoftContact) => {
    return contact.emailAddresses?.[0]?.address || "";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected Contacts */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map((contact) => (
            <Badge
              key={contact.id}
              variant="secondary"
              className="flex items-center gap-2 px-3 py-1"
            >
              <User className="h-3 w-3" />
              <span className="text-sm">{contact.displayName}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeContact(contact.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="pl-10"
          />
        </div>

        {/* Search Results Dropdown */}
        {isSearchFocused && searchQuery.length >= 2 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
            <CardContent className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Searching contacts...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  No contacts found matching "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredContacts.slice(0, 8).map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => addContact(contact)}
                      className="w-full text-left p-3 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {contact.displayName}
                          </div>
                          {getPrimaryEmail(contact) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{getPrimaryEmail(contact)}</span>
                            </div>
                          )}
                          {contact.jobTitle && contact.companyName && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Building className="h-3 w-3" />
                              <span className="truncate">
                                {contact.jobTitle} at {contact.companyName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      {selectedContacts.length === 0 && !isSearchFocused && (
        <p className="text-xs text-gray-500">
          Type at least 2 characters to search your Microsoft contacts
        </p>
      )}
    </div>
  );
}