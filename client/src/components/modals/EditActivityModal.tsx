import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { insertActivitySchema, Activity, Contact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";

const formSchema = insertActivitySchema.extend({
  dueDate: z.string().optional(),
});

interface EditActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
}

export default function EditActivityModal({ open, onOpenChange, activity }: EditActivityModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslations();

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      status: "planned",
      dueDate: "",
      participants: [],
    },
  });

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      form.reset({
        title: activity.title,
        description: activity.description || "",
        priority: activity.priority as "low" | "normal" | "urgent",
        status: activity.status as "planned" | "in_progress" | "completed",
        dueDate: activity.dueDate ? new Date(activity.dueDate).toISOString().split('T')[0] : "",
        participants: activity.participants || [],
      });
    }
  }, [activity, form]);

  const updateActivityMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      if (!activity) throw new Error("No activity to update");
      
      const activityData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      };
      return apiRequest(`/api/activities/${activity.id}`, "PUT", activityData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Activity updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update activity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateActivityMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-dark">
            {t('activities.editActivity')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('activities.formStatus')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('forms.selectOption')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">{t('activities.statusPlanned')}</SelectItem>
                        <SelectItem value="in_progress">{t('activities.statusInProgress')}</SelectItem>
                        <SelectItem value="completed">{t('activities.statusCompleted')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('activities.formDueDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>{t('activities.formParticipants')}</FormLabel>
                    <Select onValueChange={(value) => {
                      const participantId = parseInt(value);
                      const currentParticipants = field.value || [];
                      if (!currentParticipants.includes(participantId)) {
                        field.onChange([...currentParticipants, participantId]);
                      }
                    }}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('forms.selectOption')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts?.filter(contact => !(field.value || []).includes(contact.id)).map((contact) => (
                          <SelectItem key={contact.id} value={contact.id.toString()}>
                            {contact.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Show selected participants */}
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((participantId: number) => {
                          const contact = contacts?.find(c => c.id === participantId);
                          return contact ? (
                            <div key={participantId} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                              <span>{contact.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newParticipants = field.value.filter((id: number) => id !== participantId);
                                  field.onChange(newParticipants);
                                }}
                                className="ml-2 text-gray-500 hover:text-gray-700"
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
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
                disabled={updateActivityMutation.isPending}
                className="bg-ms-blue hover:bg-ms-blue-dark text-white"
              >
{updateActivityMutation.isPending ? t('common.loading') : t('activities.update')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
