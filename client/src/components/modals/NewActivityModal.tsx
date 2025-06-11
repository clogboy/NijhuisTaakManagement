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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
      return apiRequest("POST", "/api/activities", activityData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Activity created successfully",
      });
      form.reset();
      setStatusTags([]);
      setNewTag("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create activity",
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
            Create New Activity
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
                    <FormLabel>Activity Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter activity title" {...field} />
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
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the activity..." 
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
                Status Tags
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
                    <FormLabel>Participants</FormLabel>
                    <div className="space-y-2">
                      {contacts?.map((contact) => (
                        <div key={contact.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`contact-${contact.id}`}
                            checked={field.value?.includes(contact.id) || false}
                            onCheckedChange={(checked) => {
                              const currentParticipants = field.value || [];
                              if (checked) {
                                field.onChange([...currentParticipants, contact.id]);
                              } else {
                                field.onChange(currentParticipants.filter(id => id !== contact.id));
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

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createActivityMutation.isPending}
                className="bg-ms-blue hover:bg-ms-blue-dark text-white"
              >
                {createActivityMutation.isPending ? "Creating..." : "Create Activity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
