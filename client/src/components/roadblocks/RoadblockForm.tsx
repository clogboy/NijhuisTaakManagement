import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertRoadblockSchema, OORZAAK_CATEGORIES, OORZAAK_FACTORS, Activity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface RoadblockFormProps {
  activities: Activity[];
  onSuccess?: () => void;
}

export default function RoadblockForm({ activities, onSuccess }: RoadblockFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  const form = useForm({
    resolver: zodResolver(insertRoadblockSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "medium",
      assignedTo: "",
      oorzaakCategory: OORZAAK_CATEGORIES.UNCLEAR,
      oorzaakFactor: "",
      departmentImpact: [],
      linkedActivityId: undefined,
      reportedDate: new Date().toISOString(),
    },
  });

  const createRoadblockMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/roadblocks", {
        ...data,
        departmentImpact: selectedDepartments,
        linkedActivityId: parseInt(data.linkedActivityId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Roadblock created successfully",
      });
      form.reset();
      setSelectedDepartments([]);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create roadblock",
        variant: "destructive",
      });
    },
  });

  const selectedCategory = form.watch("oorzaakCategory");
  const availableFactors = selectedCategory ? OORZAAK_FACTORS[selectedCategory as keyof typeof OORZAAK_FACTORS] || [] : [];

  const departmentOptions = [
    "Engineering", "Design", "Product", "Operations", "Sales", "Marketing", 
    "Finance", "HR", "Legal", "IT", "Customer Support", "Quality Assurance"
  ];

  const addDepartment = (dept: string) => {
    if (!selectedDepartments.includes(dept)) {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  const removeDepartment = (dept: string) => {
    setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
  };

  const onSubmit = (data: any) => {
    createRoadblockMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report New Roadblock</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the roadblock" {...field} />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select related activity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activities.map((activity) => (
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of what's blocking progress"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">🟢 Low</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="high">⚠️ High</SelectItem>
                        <SelectItem value="critical">🚨 Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Person or team responsible" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Root Cause Analysis Section */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Root Cause Analysis</h3>
              <p className="text-sm text-neutral-medium mb-4">
                Help identify systemic patterns by categorizing the underlying cause of this roadblock.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="blameCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Root Cause Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={BLAME_CATEGORIES.PROCESS}>⚙️ Process Issues</SelectItem>
                          <SelectItem value={BLAME_CATEGORIES.RESOURCES}>💰 Resource Constraints</SelectItem>
                          <SelectItem value={BLAME_CATEGORIES.COMMUNICATION}>💬 Communication Problems</SelectItem>
                          <SelectItem value={BLAME_CATEGORIES.EXTERNAL}>🌐 External Dependencies</SelectItem>
                          <SelectItem value={BLAME_CATEGORIES.TECHNICAL}>🔧 Technical Limitations</SelectItem>
                          <SelectItem value={BLAME_CATEGORIES.PLANNING}>📋 Planning Issues</SelectItem>
                          <SelectItem value={BLAME_CATEGORIES.SKILLS}>🎓 Skills/Knowledge Gap</SelectItem>
                          <SelectItem value={BLAME_CATEGORIES.UNCLEAR}>❓ Root Cause Unclear</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="blameFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Factor (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory || selectedCategory === BLAME_CATEGORIES.UNCLEAR}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specific factor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableFactors.map((factor) => (
                            <SelectItem key={factor} value={factor}>
                              {factor.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Department Impact */}
            <div className="space-y-4">
              <FormLabel>Affected Departments</FormLabel>
              <Select onValueChange={addDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Add affected department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions
                    .filter(dept => !selectedDepartments.includes(dept))
                    .map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              {selectedDepartments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map((dept) => (
                    <Badge key={dept} variant="secondary" className="flex items-center gap-1">
                      {dept}
                      <button
                        type="button"
                        onClick={() => removeDepartment(dept)}
                        className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={createRoadblockMutation.isPending}
              className="w-full md:w-auto"
            >
              {createRoadblockMutation.isPending ? "Creating..." : "Create Roadblock"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}