import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CulturalDateInput } from "@/components/ui/cultural-date-input";
import { MicrosoftContactSelector } from "@/components/ui/microsoft-contact-selector";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertActivitySchema } from "@shared/schema";
import { Contact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";

const formSchema = insertActivitySchema.extend({
  dueDate: z.string().optional(),
  isPublic: z.boolean().optional(),
  collaborators: z.array(z.string()).optional(),
});

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewActivityModal({ open, onOpenChange }: NewActivityModalProps) {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusTags, setStatusTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const [selectedMsContacts, setSelectedMsContacts] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      status: "planned",
      statusTags: [],
      dueDate: "",
      participants: [],
      isPublic: false,
      collaborators: [],
    },
  });

  const addTag = () => {
    if (newTag.trim() && !statusTags.includes(newTag.trim())) {
      const updatedTags = [...statusTags, newTag.trim()];
      setStatusTags(updatedTags);
      form.setValue("statusTags", updatedTags);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = statusTags.filter(tag => tag !== tagToRemove);
    setStatusTags(updatedTags);
    form.setValue("statusTags", updatedTags);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const createActivityMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      const activityData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        statusTags: statusTags,
      };
      return apiRequest("/api/activities", "POST", activityData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: t('common.success'),
        description: t('activities.createSuccess'),
      });
      form.reset();
      setStatusTags([]);
      setNewTag("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('activities.createFailed'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createActivityMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen w-[95vw] sm:w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-semibold text-neutral-dark">
{t('activities.addNew')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('activities.formTitle')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('forms.enterText')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('activities.formPriority')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('forms.selectOption')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t('activities.priorityLow')}</SelectItem>
                        <SelectItem value="normal">{t('activities.priorityNormal')}</SelectItem>
                        <SelectItem value="urgent">{t('activities.priorityUrgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('activities.formDescription')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('forms.enterText')} 
                      rows={3}
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Tags */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-dark">
{t('activities.formStatusTags')}
              </label>
              
              {/* Current Tags */}
              {statusTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {statusTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Add New Tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add status tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTag}
                  disabled={!newTag.trim()}
                >
                  Add Tag
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? new Date(value).toISOString().split('T')[0] : '');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participants</FormLabel>
                    <div className="space-y-2">
                      {contacts?.map((contact) => (
                        <div key={contact.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`contact-${contact.id}`}
                            checked={field.value?.includes(contact.email) || false}
                            onChange={(e) => {
                              const currentParticipants = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentParticipants, contact.email]);
                              } else {
                                field.onChange(currentParticipants.filter(email => email !== contact.email));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`contact-${contact.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {contact.name} ({contact.email})
                          </label>
                        </div>
                      ))}
                      {!contacts?.length && (
                        <p className="text-sm text-muted-foreground">
                          No contacts available. Create contacts first to add participants.
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Collaboration Settings */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-neutral-dark">Collaboration Settings</h3>
              
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Make this activity public</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        All team members can view this activity
                      </div>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 text-ms-blue bg-gray-100 border-gray-300 rounded focus:ring-ms-blue"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collaborators"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collaborators (Email addresses)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter email addresses separated by commas (e.g., user1@nijhuis.nl, user2@nijhuis.nl)"
                        value={field.value?.join(', ') || ''}
                        onChange={(e) => {
                          const emails = e.target.value.split(',').map(email => email.trim()).filter(Boolean);
                          field.onChange(emails);
                        }}
                        className="min-h-[60px]"
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">
                      Collaborators can view the activity but only you can edit it
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
{t('activities.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createActivityMutation.isPending}
                className="bg-ms-blue hover:bg-ms-blue-dark text-white"
              >
{createActivityMutation.isPending ? t('common.loading') : t('activities.save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
