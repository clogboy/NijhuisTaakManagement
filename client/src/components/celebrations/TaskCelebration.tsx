import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Zap, Shield, Trophy, Star, Sparkles } from "lucide-react";

interface TaskCelebrationProps {
  isVisible: boolean;
  taskType: 'activity' | 'quickwin' | 'roadblock';
  taskTitle: string;
  onComplete: () => void;
}

const celebrationConfig = {
  activity: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    message: "Activiteit voltooid!",
    particles: "🎉",
    animation: "bounce"
  },
  quickwin: {
    icon: Zap,
    color: "text-yellow-500", 
    bgColor: "bg-yellow-500/10",
    message: "Quick Win behaald!",
    particles: "⚡",
    animation: "pulse"
  },
  roadblock: {
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10", 
    message: "Roadblock opgelost!",
    particles: "🛡️",
    animation: "rotate"
  }
};

export default function TaskCelebration({ 
  isVisible, 
  taskType, 
  taskTitle, 
  onComplete 
}: TaskCelebrationProps) {
  const [showParticles, setShowParticles] = useState(false);
  const config = celebrationConfig[taskType];
  const Icon = config.icon;

  useEffect(() => {
    if (isVisible) {
      setShowParticles(true);
      const timer = setTimeout(() => {
        setShowParticles(false);
        onComplete();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const bounceAnimation = {
    initial: { scale: 0, rotate: 0 },
    animate: { 
      scale: [0, 1.2, 1],
      rotate: [0, 360, 0]
    },
    exit: { scale: 0, opacity: 0 }
  };

  const pulseAnimation = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: [0, 1.1, 1],
      opacity: 1,
      boxShadow: [
        "0 0 0 0 rgba(234, 179, 8, 0.7)",
        "0 0 0 10px rgba(234, 179, 8, 0)",
        "0 0 0 20px rgba(234, 179, 8, 0)"
      ]
    },
    exit: { scale: 0, opacity: 0 }
  };

  const rotateAnimation = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: [0, 1.1, 1],
      rotate: 0
    },
    exit: { scale: 0, opacity: 0 }
  };

  const getAnimation = () => {
    switch (config.animation) {
      case 'bounce': return bounceAnimation;
      case 'pulse': return pulseAnimation;
      case 'rotate': return rotateAnimation;
      default: return bounceAnimation;
    }
  };

  const ParticleEffect = ({ particle, index }: { particle: string; index: number }) => (
    <motion.div
      key={index}
      initial={{ 
        opacity: 0, 
        scale: 0,
        x: 0,
        y: 0
      }}
      animate={{ 
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
        rotate: Math.random() * 360
      }}
      transition={{ 
        duration: 2,
        delay: index * 0.1,
        ease: "easeOut"
      }}
      className="absolute text-2xl pointer-events-none"
      style={{
        left: '50%',
        top: '50%'
      }}
    >
      {particle}
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        >
          {/* Main celebration card */}
          <motion.div
            {...getAnimation()}
            transition={{ 
              duration: 0.6,
              ease: "easeOut"
            }}
            className={`relative ${config.bgColor} backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center shadow-2xl max-w-md mx-4`}
          >
            {/* Sparkles background effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    rotate: 360
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white/40" />
                </motion.div>
              ))}
            </div>

            {/* Main icon */}
            <motion.div
              animate={{ 
                rotate: taskType === 'quickwin' ? [0, 10, -10, 0] : 0,
                scale: taskType === 'activity' ? [1, 1.1, 1] : 1
              }}
              transition={{ 
                duration: 0.5,
                repeat: 2,
                repeatType: "reverse"
              }}
              className="relative z-10"
            >
              <Icon className={`w-16 h-16 mx-auto mb-4 ${config.color}`} />
            </motion.div>

            {/* Trophy for special achievements */}
            {taskType === 'roadblock' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute top-2 right-2"
              >
                <Trophy className="w-6 h-6 text-yellow-500" />
              </motion.div>
            )}

            <div className="relative z-10">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold text-gray-900 dark:text-white mb-2"
              >
                {config.message}
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-700 dark:text-gray-300 text-sm"
              >
                {taskTitle}
              </motion.p>

              {/* Star rating for quick wins */}
              {taskType === 'quickwin' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex justify-center mt-3 gap-1"
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ 
                        delay: i * 0.1,
                        duration: 0.5
                      }}
                    >
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Particle effects */}
            {showParticles && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <ParticleEffect 
                    key={i} 
                    particle={config.particles} 
                    index={i}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}