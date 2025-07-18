import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Play, RefreshCw } from 'lucide-react';

class TestHealthErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TestHealthCheck error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Component Error</span>
          </div>
          <p className="text-red-700 mt-1">Test health check encountered an error: {this.state.error}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface TestHealthData {
  status: 'healthy' | 'unhealthy' | 'error' | 'timeout';
  timestamp: string;
  overall?: string;
  tests?: Array<{
    name: string;
    status: 'pass' | 'fail';
    timestamp: string;
  }>;
  testSummary?: {
    passedTests: number;
    failedTests: number;
  };
  hasErrors?: boolean;
  errors?: string[];
}

function TestHealthCheckInner() {
  const [testData, setTestData] = useState<TestHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/health/tests');

      if (!response.ok) {
        throw new Error('Failed to run tests');
      }

      const data = await response.json();

      // Ensure data has the expected structure
      const normalizedData = {
        status: data.status || 'healthy',
        timestamp: data.timestamp || new Date().toISOString(),
        overall: data.overall || 'pass',
        tests: Array.isArray(data.tests) ? data.tests : [],
        testSummary: data.testSummary || {passedTests: 0, failedTests: 0},
        hasErrors: data.hasErrors || false,
        errors: data.errors || []
      };

      setTestData(normalizedData);
    } catch (err) {
      console.error('Test health check error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'timeout':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'unhealthy':
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'timeout':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Unit Test Health Check
              {testData && getStatusIcon(testData.status)}
            </CardTitle>
            <CardDescription>
              Run and monitor the status of your unit tests
            </CardDescription>
          </div>
          <Button 
            onClick={runTests} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Running...' : 'Run Tests'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {testData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Overall Status:</span>
                <Badge className={getStatusColor(testData.status || 'healthy')}>
                  {(testData.status || 'healthy').toUpperCase()}
                </Badge>
              </div>
              <span className="text-sm text-gray-500">
                {testData.timestamp ? new Date(testData.timestamp).toLocaleString() : 'Just now'}
              </span>
            </div>

            {testData.testSummary && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{testData.testSummary.passedTests}</div>
                  <div className="text-xs text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{testData.testSummary.failedTests}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
            )}

            {testData.tests && Array.isArray(testData.tests) && testData.tests.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Test Details:</h4>
                {testData.tests.map((test: any, index: number) => (
                  test && (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm">{test.name}</span>
                      <Badge className={getStatusColor(test.status === 'pass' ? 'passed' : 'failed')}>
                        {test.status ? test.status.toUpperCase() : 'UNKNOWN'}
                      </Badge>
                    </div>
                  )
                ))}
              </div>
            )}

            {testData.hasErrors && testData.errors && Array.isArray(testData.errors) && testData.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-red-600">Errors:</h4>
                {testData.errors.map((error: any, index: number) => (
                  <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!testData && !isLoading && !error && (
          <div className="text-center py-8 text-gray-500">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Tests" to check the health of your unit tests</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TestHealthCheck() {
  return (
    <TestHealthErrorBoundary>
      <TestHealthCheckInner />
    </TestHealthErrorBoundary>
  );
}