import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { LowStimulusProvider } from "@/contexts/LowStimulusContext";
import { errorReporter } from "@/utils/errorReporter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
  },
});

// Initialize error reporting
errorReporter.init();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <OnboardingProvider>
      <LowStimulusProvider>
        <App />
        <Toaster />
      </LowStimulusProvider>
    </OnboardingProvider>
  </QueryClientProvider>
);