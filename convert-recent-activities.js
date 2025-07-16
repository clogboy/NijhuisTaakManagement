
import fetch from 'node-fetch';

async function convertRecentActivitiesToSubtasks() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Get activities
    const activitiesResponse = await fetch(`${baseUrl}/api/activities`, {
      headers: { 'Cookie': 'session=demo' }
    });
    const activities = await activitiesResponse.json();
    
    // Get the 3 most recent activities (by ID - highest IDs are most recent)
    const recentActivities = activities
      .sort((a, b) => b.id - a.id)
      .slice(0, 3);
    
    console.log('Converting these activities to subtasks:');
    recentActivities.forEach(activity => {
      console.log(`- ${activity.title} (ID: ${activity.id})`);
    });
    
    // Convert each to a subtask
    for (const activity of recentActivities) {
      try {
        const response = await fetch(`${baseUrl}/api/subtasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'session=demo'
          },
          body: JSON.stringify({
            title: activity.title,
            description: activity.description,
            type: "task",
            status: activity.status === "completed" ? "completed" : "pending", 
            priority: activity.priority || "medium",
            dueDate: activity.dueDate,
            participants: activity.participants || [],
            linkedActivityId: activity.id,
          })
        });
        
        if (response.ok) {
          const subtask = await response.json();
          console.log(`✓ Created subtask: ${subtask.title}`);
        } else {
          const error = await response.text();
          console.error(`✗ Failed to create subtask for: ${activity.title} - ${error}`);
        }
      } catch (error) {
        console.error(`✗ Error converting ${activity.title}:`, error.message);
      }
    }
    
    console.log('Conversion complete!');
  } catch (error) {
    console.error('Error fetching activities:', error.message);
  }
}

convertRecentActivitiesToSubtasks().catch(console.error);
