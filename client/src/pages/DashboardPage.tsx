import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";

export default function DashboardPage() {
  const [lowStimulusMode, setLowStimulusMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleModeToggle = (checked: boolean) => {
    setIsTransitioning(true);
    
    // Start transition overlay
    setTimeout(() => {
      setLowStimulusMode(checked);
      
      // End transition after mode change
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 200);
  };

  return (
    <div className="relative">
      {/* Transition overlay */}
      {isTransitioning && (
        <div 
          className="fixed inset-0 bg-white z-50 transition-opacity duration-300"
          style={{ 
            opacity: isTransitioning ? 0.8 : 0,
            pointerEvents: isTransitioning ? 'auto' : 'none'
          }}
        />
      )}
      
      <AppLayout
        title="Dashboard"
        subtitle="Activity overview and quick access"
        hideSidebar={lowStimulusMode}
      >
        <Dashboard 
          lowStimulusMode={lowStimulusMode} 
          setLowStimulusMode={handleModeToggle} 
        />
      </AppLayout>
    </div>
  );
}