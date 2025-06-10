import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Contact } from "@shared/schema";
import { sendEmail } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
});

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
}

export default function EmailModal({ open, onOpenChange, contacts }: EmailModalProps) {
  const { toast } = useToast();
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      body: "",
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const emails = selectedContacts.map(contact => contact.email);
      await sendEmail(emails, data.subject, data.body);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email sent successfully",
      });
      form.reset();
      setSelectedContacts([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const toggleContact = (contact: Contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id);
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const removeContact = (contactId: number) => {
    setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one contact",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-dark">
            Send Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-3">
              Select Recipients
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
              {contacts.map((contact) => (
                <label key={contact.id} className="flex items-center space-x-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedContacts.some(c => c.id === contact.id)}
                    onChange={() => toggleContact(contact)}
                    className="rounded border-gray-300 text-ms-blue focus:ring-ms-blue"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-dark">{contact.name}</div>
                    <div className="text-xs text-neutral-medium truncate">{contact.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Selected Contacts */}
          {selectedContacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                Selected Recipients ({selectedContacts.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedContacts.map((contact) => (
                  <Badge key={contact.id} variant="secondary" className="flex items-center gap-1">
                    {contact.name}
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Email Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your message..." 
                        rows={8}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={sendEmailMutation.isPending || selectedContacts.length === 0}
                  className="bg-ms-blue hover:bg-ms-blue-dark text-white"
                >
                  {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
