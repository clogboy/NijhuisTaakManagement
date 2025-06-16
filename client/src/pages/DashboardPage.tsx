import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";

export default function DashboardPage() {
  const [lowStimulusMode, setLowStimulusMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleModeToggle = (checked: boolean) => {
    setIsTransitioning(true);
    
    // Wait for full fade to white, then switch modes
    setTimeout(() => {
      setLowStimulusMode(checked);
      
      // Wait a moment for layout changes, then fade out
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 500);
  };

  return (
    <div className="relative">
      {/* Transition overlay */}
      <div 
        className="fixed inset-0 bg-white z-50 transition-opacity duration-500 ease-in-out"
        style={{ 
          opacity: isTransitioning ? 1 : 0,
          pointerEvents: isTransitioning ? 'auto' : 'none'
        }}
      />
      
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