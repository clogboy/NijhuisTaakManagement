import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

const rescueFormSchema = z.object({
  oorzaakCategory: z.string().min(1, "Selecteer een oorzaak categorie"),
  oorzaakFactor: z.string().optional(),
  resolution: z.string().min(10, "Oplossing moet minimaal 10 karakters bevatten"),
  newDeadline: z.string().min(1, "Nieuwe deadline is verplicht"),
});

interface TaskData {
  id: number;
  title: string;
  description: string;
  linkedActivityId: number;
  dueDate: string;
  priority: string;
}

interface StreamlinedRoadblockFormProps {
  taskData: TaskData;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const oorzaakCategories = [
  { value: "process", label: "Proces", icon: "⚙️", description: "Workflow of procedureproblemen" },
  { value: "resources", label: "Middelen", icon: "💰", description: "Gebrek aan middelen of budget" },
  { value: "communication", label: "Communicatie", icon: "💬", description: "Miscommunicatie of onduidelijkheid" },
  { value: "external", label: "Extern", icon: "🌐", description: "Externe partijen of dependencies" },
  { value: "technical", label: "Technisch", icon: "🔧", description: "Technische problemen of bugs" },
  { value: "planning", label: "Planning", icon: "📋", description: "Planningsproblemen of deadlines" },
  { value: "skills", label: "Vaardigheden", icon: "🎓", description: "Kennis of vaardigheden tekort" },
];

const oorzaakFactors: Record<string, string[]> = {
  process: ["onduidelijke_workflow", "gebrek_aan_standaarden", "inefficiënte_processen", "goedkeuringsvertragingen"],
  resources: ["budget_tekort", "personeelstekort", "materiaal_niet_beschikbaar", "tool_licenties"],
  communication: ["miscommunicatie", "onduidelijke_requirements", "feedback_vertraging", "stakeholder_alignment"],
  external: ["leverancier_vertraging", "client_feedback", "derde_partij_dependency", "externe_goedkeuring"],
  technical: ["software_bugs", "hardware_problemen", "integratie_issues", "performance_problemen"],
  planning: ["unrealistische_deadlines", "resource_planning", "priority_conflicten", "scope_creep"],
  skills: ["training_nodig", "expertise_tekort", "nieuwe_technologie", "kennisoverdracht"],
};

export default function StreamlinedRoadblockForm({ 
  taskData, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: StreamlinedRoadblockFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showResolutionFields, setShowResolutionFields] = useState(false);

  const form = useForm<z.infer<typeof rescueFormSchema>>({
    resolver: zodResolver(rescueFormSchema),
    defaultValues: {
      oorzaakCategory: "",
      oorzaakFactor: "",
      resolution: "",
      newDeadline: "",
    },
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setShowResolutionFields(true);
    form.setValue("oorzaakCategory", category);
    form.setValue("oorzaakFactor", ""); // Reset factor when category changes
  };

  const handleSubmit = (data: z.infer<typeof rescueFormSchema>) => {
    const roadblockData = {
      // Inherited from task
      title: taskData.title,
      description: taskData.description,
      linkedActivityId: taskData.linkedActivityId,
      
      // New roadblock-specific data
      oorzaakCategory: data.oorzaakCategory,
      oorzaakFactor: data.oorzaakFactor,
      resolution: data.resolution,
      newDeadline: data.newDeadline,
      
      // Metadata
      severity: "medium",
      status: "pending",
      reportedDate: new Date().toISOString(),
      assignedTo: "",
      departmentImpact: [],
      
      // Rescue mode flags
      isRescueMode: true,
      linkedTaskId: taskData.id,
    };

    onSubmit(roadblockData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isOverdue = new Date(taskData.dueDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Task Information Display */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Wegversperring Rescue voor Taak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-lg">{taskData.title}</h4>
            <p className="text-sm text-neutral-medium mt-1">{taskData.description}</p>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Oorspronkelijke deadline: {formatDate(taskData.dueDate)}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Achterstallig
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {taskData.priority}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Rescue Form */}
      <Card>
        <CardHeader>
          <CardTitle>Wat is de oorzaak van deze wegversperring?</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Category Selection */}
              <FormField
                control={form.control}
                name="oorzaakCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oorzaak Categorie</FormLabel>
                    <Select onValueChange={handleCategoryChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer de hoofdoorzaak..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {oorzaakCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <div>
                                <div className="font-medium">{category.label}</div>
                                <div className="text-xs text-neutral-medium">{category.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Factor Selection (appears after category) */}
              {selectedCategory && (
                <FormField
                  control={form.control}
                  name="oorzaakFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specifieke Factor (optioneel)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Kies een specifieke factor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {oorzaakFactors[selectedCategory]?.map((factor) => (
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
              )}

              {/* Resolution Fields (appear after category selection) */}
              {showResolutionFields && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Oplossing & Nieuwe Planning
                  </h4>
                  
                  <FormField
                    control={form.control}
                    name="resolution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oplossing</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Beschrijf de voorgestelde oplossing om dit knelpunt op te lossen..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nieuwe Deadline</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Annuleren
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !showResolutionFields}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? "Rescue uitvoeren..." : "Taak Rescuen"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}