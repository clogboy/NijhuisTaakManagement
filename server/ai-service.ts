import OpenAI from "openai";
import { Activity, WeeklyEthos, Subtask } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let usingBackupKey = false;

// Function to get current key status
export function getKeyStatus() {
  return {
    usingBackupKey,
    hasBackupKey: !!process.env.OPENAI_API_KEY_BACKUP,
    hasPrimaryKey: !!process.env.OPENAI_API_KEY
  };
}

// Automatic key switching function
async function getWorkingOpenAI(): Promise<OpenAI> {
  try {
    // Test current key with a simple request
    await openai.models.list();
    return openai;
  } catch (error: any) {
    // Check if it's a quota/auth error
    if (error?.status === 429 || error?.status === 401 || error?.status === 403) {
      if (!usingBackupKey && process.env.OPENAI_API_KEY_BACKUP) {
        console.log('Primary OpenAI key failed, switching to backup key');
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_BACKUP });
        usingBackupKey = true;
        
        // Test backup key
        try {
          await openai.models.list();
          console.log('Successfully switched to backup OpenAI key');
          return openai;
        } catch (backupError) {
          console.error('Backup OpenAI key also failed:', backupError);
          throw new Error('Both primary and backup OpenAI keys are unavailable');
        }
      } else if (usingBackupKey && process.env.OPENAI_API_KEY) {
        // Try switching back to primary key
        console.log('Backup key failed, trying primary key again');
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        usingBackupKey = false;
        
        try {
          await openai.models.list();
          console.log('Successfully switched back to primary OpenAI key');
          return openai;
        } catch (primaryError) {
          // Switch back to backup if available
          if (process.env.OPENAI_API_KEY_BACKUP) {
            openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_BACKUP });
            usingBackupKey = true;
          } else {
            throw new Error('Both OpenAI keys are currently unavailable');
          }
        }
      } else {
        throw new Error('OpenAI API key quota exceeded and no backup key available');
      }
    }
    throw error;
  }
}

interface EisenhowerMatrix {
  urgentImportant: Activity[];
  importantNotUrgent: Activity[];
  urgentNotImportant: Activity[];
  neitherUrgentNorImportant: Activity[];
}

interface AgendaSuggestion {
  scheduledActivities: number[];
  eisenhowerMatrix: EisenhowerMatrix;
  suggestions: string;
  taskSwitchOptimization: string;
  estimatedTaskSwitches: number;
}

export async function categorizeActivitiesWithEisenhower(
  activities: Activity[], 
  ethos?: WeeklyEthos
): Promise<EisenhowerMatrix> {
  try {
    const activitiesData = activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      priority: activity.priority,
      dueDate: activity.dueDate,
      status: activity.status,
      statusTags: activity.statusTags
    }));

    const ethosContext = ethos ? 
      `Today's ethos: "${ethos.ethos}" - ${ethos.description}. Focus areas: ${ethos.focusAreas?.join(', ')}` : 
      'No specific ethos defined for today';

    const prompt = `
You are a productivity expert using the Eisenhower Matrix to categorize tasks. Analyze these activities and categorize them into four quadrants:

1. Urgent & Important (Do First)
2. Important but Not Urgent (Schedule)
3. Urgent but Not Important (Delegate if possible)
4. Neither Urgent nor Important (Eliminate if possible)

Context: ${ethosContext}

Activities to categorize:
${JSON.stringify(activitiesData, null, 2)}

Consider:
- Due dates (closer = more urgent)
- Priority levels (urgent, normal, low)
- Status tags and current status
- Alignment with today's ethos and focus areas

Return a JSON object with this exact structure:
{
  "urgentImportant": [activity_ids],
  "importantNotUrgent": [activity_ids], 
  "urgentNotImportant": [activity_ids],
  "neitherUrgentNorImportant": [activity_ids],
  "reasoning": "Brief explanation of categorization logic"
}
`;

    const workingOpenAI = await getWorkingOpenAI();
    const response = await workingOpenAI.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a productivity expert specializing in the Eisenhower Matrix for task prioritization. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Map activity IDs back to full activity objects
    const getActivitiesByIds = (ids: number[]) => 
      activities.filter(activity => ids.includes(activity.id));

    return {
      urgentImportant: getActivitiesByIds(result.urgentImportant || []),
      importantNotUrgent: getActivitiesByIds(result.importantNotUrgent || []),
      urgentNotImportant: getActivitiesByIds(result.urgentNotImportant || []),
      neitherUrgentNorImportant: getActivitiesByIds(result.neitherUrgentNorImportant || [])
    };

  } catch (error) {
    console.error('Error categorizing activities:', error);
    
    // Check if this is a quota error that should trigger key switching
    if ((error as any)?.status === 429 || (error as any)?.status === 401 || (error as any)?.status === 403) {
      try {
        // Force key switching by trying again
        const workingOpenAI = await getWorkingOpenAI();
        
        const ethosContext = ethos ? 
          `Today's ethos: "${ethos.ethos}" - ${ethos.description}. Focus areas: ${ethos.focusAreas?.join(', ')}` : 
          'No specific ethos defined for today';

        const activitiesData = activities.map(activity => ({
          id: activity.id,
          title: activity.title,
          description: activity.description,
          priority: activity.priority,
          dueDate: activity.dueDate,
          status: activity.status,
          statusTags: activity.statusTags
        }));
        
        const retryPrompt = `
You are a productivity expert using the Eisenhower Matrix to categorize tasks. Analyze these activities and categorize them into four quadrants:

1. Urgent & Important (Do First)
2. Important but Not Urgent (Schedule)
3. Urgent but Not Important (Delegate if possible)
4. Neither Urgent nor Important (Eliminate if possible)

Context: ${ethosContext}

Activities to categorize:
${JSON.stringify(activitiesData, null, 2)}

Consider:
- Due dates (closer = more urgent)
- Priority levels (urgent, normal, low)
- Status tags and current status
- Alignment with today's ethos and focus areas

Return a JSON object with this exact structure:
{
  "urgentImportant": [activity_ids],
  "importantNotUrgent": [activity_ids], 
  "urgentNotImportant": [activity_ids],
  "neitherUrgentNorImportant": [activity_ids],
  "reasoning": "Brief explanation of categorization logic"
}
`;
        
        const response = await workingOpenAI.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a productivity expert specializing in the Eisenhower Matrix for task prioritization. Always respond with valid JSON."
            },
            {
              role: "user",
              content: retryPrompt
            }
          ],
          response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        
        // Map activity IDs back to full activity objects
        const getActivitiesByIds = (ids: number[]) => 
          activities.filter(activity => ids.includes(activity.id));

        return {
          urgentImportant: getActivitiesByIds(result.urgentImportant || []),
          importantNotUrgent: getActivitiesByIds(result.importantNotUrgent || []),
          urgentNotImportant: getActivitiesByIds(result.urgentNotImportant || []),
          neitherUrgentNorImportant: getActivitiesByIds(result.neitherUrgentNorImportant || [])
        };
      } catch (retryError) {
        console.error('Retry with backup key also failed:', retryError);
      }
    }
    
    // Fallback to simple categorization
    return simpleEisenhowerCategorization(activities);
  }
}

export async function generateDailyAgenda(
  activities: Activity[],
  subtasks?: Subtask[],
  participantEmail?: string,
  ethos?: WeeklyEthos,
  maxTaskSwitches: number = 3
): Promise<AgendaSuggestion> {
  try {
    const eisenhowerMatrix = await categorizeActivitiesWithEisenhower(activities, ethos);
    
    const ethosContext = ethos ? 
      `Today's ethos: "${ethos.ethos}" - ${ethos.description}. Focus areas: ${ethos.focusAreas?.join(', ')}. Preferred work blocks: ${ethos.preferredWorkBlocks}` : 
      'No specific ethos defined for today';

    // Filter subtasks for the participant and categorize by their preferred types
    const participantSubtasks = subtasks?.filter(subtask => 
      participantEmail && subtask.participants.includes(participantEmail)
    ) || [];

    const subtasksByType = participantSubtasks.reduce((acc, subtask) => {
      const participantTypes = subtask.participantTypes as Record<string, string> || {};
      const taskType = participantTypes[participantEmail || ''] || subtask.type;
      
      if (!acc[taskType]) acc[taskType] = [];
      acc[taskType].push(subtask);
      return acc;
    }, {} as Record<string, Subtask[]>);

    const subtaskContext = participantSubtasks.length > 0 ? `
Participant Subtasks (${participantEmail}):
- Quick Wins: ${(subtasksByType.quick_win || []).map(s => `${s.id}: ${s.title}`).join(', ') || 'None'}
- Roadblocks: ${(subtasksByType.roadblock || []).map(s => `${s.id}: ${s.title}`).join(', ') || 'None'}  
- Regular Tasks: ${(subtasksByType.task || []).map(s => `${s.id}: ${s.title}`).join(', ') || 'None'}
` : '';

    const prompt = `
You are an AI productivity assistant. Create an optimal daily agenda that minimizes task switching and maximizes focus.

Context: ${ethosContext}
Maximum allowed task switches: ${maxTaskSwitches}
${subtaskContext}

Eisenhower Matrix Categories:
- Urgent & Important: ${eisenhowerMatrix.urgentImportant.map(a => `${a.id}: ${a.title}`).join(', ')}
- Important but Not Urgent: ${eisenhowerMatrix.importantNotUrgent.map(a => `${a.id}: ${a.title}`).join(', ')}
- Urgent but Not Important: ${eisenhowerMatrix.urgentNotImportant.map(a => `${a.id}: ${a.title}`).join(', ')}
- Neither: ${eisenhowerMatrix.neitherUrgentNorImportant.map(a => `${a.id}: ${a.title}`).join(', ')}

Create a daily schedule that:
1. Prioritizes urgent & important tasks first
2. Groups similar tasks together to minimize context switching
3. Respects the maximum task switch limit
4. Aligns with the daily ethos and focus areas
5. Considers energy levels throughout the day

Return JSON with this structure:
{
  "scheduledActivities": [ordered_activity_ids_for_the_day],
  "suggestions": "Detailed explanation of the schedule and rationale",
  "taskSwitchOptimization": "Explanation of how task switching was minimized",
  "estimatedTaskSwitches": number_of_expected_switches,
  "timeBlocks": [
    {
      "startTime": "09:00",
      "endTime": "11:00", 
      "activityIds": [ids],
      "blockType": "deep_focus|admin|communication",
      "description": "What to focus on during this block"
    }
  ]
}
`;

    const workingOpenAI = await getWorkingOpenAI();
    const response = await workingOpenAI.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert productivity coach specializing in task scheduling and focus optimization. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      scheduledActivities: result.scheduledActivities || [],
      eisenhowerMatrix,
      suggestions: result.suggestions || 'Schedule optimized for productivity',
      taskSwitchOptimization: result.taskSwitchOptimization || 'Tasks grouped by context',
      estimatedTaskSwitches: result.estimatedTaskSwitches || maxTaskSwitches
    };

  } catch (error) {
    console.error('Error generating daily agenda:', error);
    // Fallback to simple scheduling
    const fallbackMatrix = simpleEisenhowerCategorization(activities);
    return generateFallbackAgenda(activities, fallbackMatrix, maxTaskSwitches);
  }
}

function simpleEisenhowerCategorization(activities: Activity[]): EisenhowerMatrix {
  const now = new Date();
  const urgentThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    urgentImportant: activities.filter(a => 
      (a.priority === 'urgent' || (a.dueDate && new Date(a.dueDate) <= urgentThreshold)) &&
      (a.priority === 'urgent' || a.priority === 'normal')
    ),
    importantNotUrgent: activities.filter(a => 
      a.priority === 'normal' && 
      (!a.dueDate || new Date(a.dueDate) > urgentThreshold)
    ),
    urgentNotImportant: activities.filter(a => 
      (a.dueDate && new Date(a.dueDate) <= urgentThreshold) && 
      a.priority === 'low'
    ),
    neitherUrgentNorImportant: activities.filter(a => 
      a.priority === 'low' && 
      (!a.dueDate || new Date(a.dueDate) > urgentThreshold)
    )
  };
}

function generateFallbackAgenda(
  activities: Activity[], 
  eisenhowerMatrix: EisenhowerMatrix, 
  maxTaskSwitches: number
): AgendaSuggestion {
  // Simple fallback: prioritize urgent & important, then important
  const scheduledActivities = [
    ...eisenhowerMatrix.urgentImportant.map(a => a.id),
    ...eisenhowerMatrix.importantNotUrgent.slice(0, maxTaskSwitches).map(a => a.id)
  ];

  return {
    scheduledActivities,
    eisenhowerMatrix,
    suggestions: 'Focus on urgent and important tasks first, then move to important but not urgent items.',
    taskSwitchOptimization: 'Tasks ordered by priority to minimize context switching.',
    estimatedTaskSwitches: Math.min(scheduledActivities.length - 1, maxTaskSwitches)
  };
}

export async function analyzeDailyProductivity(
  completedActivities: Activity[],
  taskSwitchCount: number,
  ethos?: WeeklyEthos
): Promise<string> {
  try {
    const ethosContext = ethos ? 
      `Daily ethos was: "${ethos.ethos}" with focus areas: ${ethos.focusAreas?.join(', ')}` : 
      'No specific ethos was defined';

    const prompt = `
Analyze today's productivity performance:

${ethosContext}
Task switches: ${taskSwitchCount}
Completed activities: ${completedActivities.map(a => `- ${a.title} (${a.priority})`).join('\n')}

Provide insights on:
1. Alignment with daily ethos
2. Task switching efficiency 
3. Priority management
4. Suggestions for tomorrow

Keep response concise and actionable.
`;

    const workingOpenAI = await getWorkingOpenAI();
    const response = await workingOpenAI.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a productivity coach providing brief, actionable insights on daily performance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    return response.choices[0].message.content || 'Great work today! Keep focusing on your priorities.';

  } catch (error) {
    console.error('Error analyzing productivity:', error);
    return 'Analysis unavailable. Focus on completing high-priority tasks with minimal task switching.';
  }
}