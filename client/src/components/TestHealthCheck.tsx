import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Play, RefreshCw } from 'lucide-react';

interface TestHealthData {
  status: 'healthy' | 'unhealthy' | 'error' | 'timeout';
  timestamp: string;
  testSummary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    duration: number;
    success: boolean;
  };
  testFiles: Array<{
    name: string;
    status: string;
    duration: number;
    numTests: number;
    numPassed: number;
    numFailed: number;
    failures: string[];
  }>;
  exitCode: number;
  hasErrors: boolean;
  errors: string[];
}

export default function TestHealthCheck() {
  const [testData, setTestData] = useState<TestHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/health/tests');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to run tests');
      }

      setTestData(data);
    } catch (err) {
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
            {/* Test Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {testData.testSummary.totalTests}
                </div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {testData.testSummary.passedTests}
                </div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {testData.testSummary.failedTests}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {testData.testSummary.skippedTests}
                </div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>
            </div>

            {/* Test Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(testData.status)}>
                  {testData.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-600">
                  Duration: {testData.testSummary.duration}ms
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(testData.timestamp).toLocaleString()}
              </div>
            </div>

            {/* Test Files */}
            {testData.testFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Test Files</h4>
                <div className="space-y-2">
                  {testData.testFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(file.status)} variant="outline">
                          {file.status}
                        </Badge>
                        <span className="font-mono text-sm">{file.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {file.numTests > 0 
                        ? `${file.numPassed}/${file.numTests} passed • ${Math.round(file.duration)}ms`
                        : `${file.status} • ${Math.round(file.duration)}ms`
                      }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Tests Detail */}
            {testData.testSummary.failedTests > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">Failed Tests</h4>
                <div className="space-y-2">
                  {testData.testFiles
                    .filter(file => file.status === 'failed' || file.numFailed > 0)
                    .map((file, index) => (
                      <div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-medium text-red-800">{file.name}</span>
                          <Badge className="bg-red-100 text-red-800" variant="outline">
                            {file.numFailed} failed
                          </Badge>
                        </div>
                        <div className="text-sm text-red-700">
                          <div className="font-medium">{file.numFailed} failed out of {file.numTests} tests</div>
                          {file.failures && file.failures.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {file.failures.map((failure, failIndex) => (
                                <div key={failIndex} className="text-xs bg-red-100 p-2 rounded border-l-2 border-red-300">
                                  {failure}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Error Details */}
            {testData.hasErrors && testData.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">Error Details</h4>
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <pre className="text-sm text-red-700 whitespace-pre-wrap overflow-x-auto">
                    {testData.errors.slice(0, 3).join('\n')}
                    {testData.errors.length > 3 && '\n... and more errors'}
                  </pre>
                </div>
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