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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { insertRoadblockSchema } from "@shared/schema";
import { Activity } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertRoadblockSchema.extend({
  reportedDate: z.string().optional(),
});

interface NewRoadblockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedActivityId?: number;
}

export default function NewRoadblockModal({ open, onOpenChange, linkedActivityId }: NewRoadblockModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "medium",
      status: "open",
      linkedActivityId: linkedActivityId || undefined,
      reportedDate: new Date().toISOString().split('T')[0],
    },
  });

  const createRoadblockMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      const roadblockData = {
        ...data,
        reportedDate: data.reportedDate ? new Date(data.reportedDate) : new Date(),
        resolvedDate: null,
      };
      return apiRequest("POST", "/api/roadblocks", roadblockData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      toast({
        title: "Success",
        description: "Roadblock reported successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to report roadblock",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createRoadblockMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report Roadblock</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide more details about the roadblock..." 
                      rows={4}
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedActivityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Activity</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No linked activity</SelectItem>
                        {activities?.map((activity) => (
                          <SelectItem key={activity.id} value={activity.id.toString()}>
                            {activity.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reportedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reported Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRoadblockMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {createRoadblockMutation.isPending ? "Reporting..." : "Report Roadblock"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}