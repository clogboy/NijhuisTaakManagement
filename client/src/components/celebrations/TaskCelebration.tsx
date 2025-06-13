import { useEffect } from "react";
import { CheckCircle, Zap, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskCelebrationProps {
  isVisible: boolean;
  taskType: 'activity' | 'quickwin' | 'roadblock';
  taskTitle: string;
  onComplete: () => void;
}

const celebrationConfig = {
  activity: {
    icon: CheckCircle,
    message: "🎉 Activiteit voltooid!",
    description: "Geweldig werk!"
  },
  quickwin: {
    icon: Zap,
    message: "⚡ Quick Win behaald!",
    description: "Mooi zo!"
  },
  roadblock: {
    icon: Shield,
    message: "🛡️ Roadblock opgelost!",
    description: "Probleem opgelost!"
  }
};

export default function TaskCelebration({ 
  isVisible, 
  taskType, 
  taskTitle, 
  onComplete 
}: TaskCelebrationProps) {
  const { toast } = useToast();
  const config = celebrationConfig[taskType];

  useEffect(() => {
    if (isVisible) {
      toast({
        title: config.message,
        description: `${config.description} ${taskTitle}`,
        duration: 3000,
      });
      
      // Complete immediately since we're using toast
      onComplete();
    }
  }, [isVisible, config, taskTitle, toast, onComplete]);

  return null; // No visual component needed - using toast system
}