import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { LowStimulusProvider } from "@/contexts/LowStimulusContext";
import { errorReporter } from "@/utils/errorReporter";
import { Component, ReactNode } from "react";

// Global error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Error type:', typeof event.reason);
  console.error('Error constructor:', event.reason?.constructor?.name);
  console.error('Full error details:', {
    name: event.reason?.name,
    message: event.reason?.message,
    stack: event.reason?.stack,
    code: event.reason?.code
  });

  // Handle DOMException specifically
  if (event.reason instanceof DOMException) {
    console.error('DOMException caught:', event.reason.name, event.reason.message, event.reason.code);
    event.preventDefault();
    return;
  }

  // Handle network/fetch errors
  if (event.reason instanceof TypeError && event.reason.message?.includes('fetch')) {
    console.error('Network error caught:', event.reason.message);
    event.preventDefault();
    return;
  }

  // Handle common authentication errors
  if (event.reason?.message?.includes('401') || event.reason?.message?.includes('Unauthorized')) {
    console.log('Authentication error detected, redirecting to login');
    window.location.href = '/login';
  }

  event.preventDefault(); // Prevent the error from crashing the app
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  event.preventDefault();
});

// Handle React errors
window.addEventListener('beforeunload', () => {
  // Clean up any pending promises
  console.log('Cleaning up before unload');
});

// React Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Error</h1>
            <p className="text-gray-600 mb-4">
              The application encountered an error and needs to restart.
            </p>
            {this.state.error && (
              <details className="text-left mb-4 p-2 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
              </details>
            )}
            <div className="space-x-2">
              <button 
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }} 
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error handlers
const handleGlobalError = (event: ErrorEvent) => {
  console.error('Global error:', event.error);
  event.preventDefault();
};

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
};

// Add global error listeners
window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleUnhandledRejection);

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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <OnboardingProvider>
        <LowStimulusProvider>
          <App />
          <Toaster />
        </LowStimulusProvider>
      </OnboardingProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);