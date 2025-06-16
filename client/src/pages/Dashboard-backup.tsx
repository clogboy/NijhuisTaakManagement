// Backup of working Dashboard component structure
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";

export default function DashboardPage() {
  const [lowStimulusMode, setLowStimulusMode] = useState(false);

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Activity overview and quick access"
      hideSidebar={lowStimulusMode}
    >
      <Dashboard 
        lowStimulusMode={lowStimulusMode} 
        setLowStimulusMode={setLowStimulusMode} 
      />
    </AppLayout>
  );
}