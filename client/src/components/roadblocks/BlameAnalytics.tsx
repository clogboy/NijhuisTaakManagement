import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { BLAME_CATEGORIES, BLAME_FACTORS, Roadblock } from "@shared/schema";

interface BlameAnalyticsProps {
  roadblocks: Roadblock[];
  className?: string;
}

export default function BlameAnalytics({ roadblocks, className }: BlameAnalyticsProps) {
  // Analyze blame patterns
  const blameAnalysis = roadblocks.reduce((acc, roadblock) => {
    const category = roadblock.blameCategory || 'unclear';
    if (!acc[category]) {
      acc[category] = {
        count: 0,
        factors: {} as Record<string, number>,
        departments: {} as Record<string, number>,
        severity: {} as Record<string, number>
      };
    }
    
    acc[category].count++;
    
    // Track blame factors
    if (roadblock.blameFactor) {
      acc[category].factors[roadblock.blameFactor] = (acc[category].factors[roadblock.blameFactor] || 0) + 1;
    }
    
    // Track department impact
    if (roadblock.departmentImpact) {
      roadblock.departmentImpact.forEach(dept => {
        acc[category].departments[dept] = (acc[category].departments[dept] || 0) + 1;
      });
    }
    
    // Track severity distribution
    acc[category].severity[roadblock.severity] = (acc[category].severity[roadblock.severity] || 0) + 1;
    
    return acc;
  }, {} as Record<string, any>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'process': return '⚙️';
      case 'resources': return '💰';
      case 'communication': return '💬';
      case 'external': return '🌐';
      case 'technical': return '🔧';
      case 'planning': return '📋';
      case 'skills': return '🎓';
      default: return '❓';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'process': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'resources': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'communication': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'external': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'technical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'planning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'skills': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const totalRoadblocks = roadblocks.length;
  const topCategories = Object.entries(blameAnalysis)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 3);

  if (totalRoadblocks === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Systemic Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-medium dark:text-gray-400 text-center py-6">
            No roadblocks to analyze yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-medium">Total Roadblocks</p>
                <p className="text-2xl font-bold text-neutral-dark dark:text-white">{totalRoadblocks}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-medium">Top Issue Category</p>
                <p className="text-2xl font-bold text-neutral-dark dark:text-white">
                  {topCategories[0] ? `${getCategoryIcon(topCategories[0][0])} ${topCategories[0][0]}` : 'None'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-medium">Pattern Strength</p>
                <p className="text-2xl font-bold text-neutral-dark dark:text-white">
                  {topCategories[0] ? `${Math.round((topCategories[0][1].count / totalRoadblocks) * 100)}%` : '0%'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Root Cause Analysis
          </CardTitle>
          <p className="text-sm text-neutral-medium">
            Identify systemic patterns to address underlying issues
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(blameAnalysis)
              .sort(([,a], [,b]) => b.count - a.count)
              .map(([category, data]) => (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(category)}</span>
                      <div>
                        <h3 className="font-semibold text-neutral-dark dark:text-white capitalize">
                          {category.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-neutral-medium">
                          {data.count} roadblock{data.count !== 1 ? 's' : ''} ({Math.round((data.count / totalRoadblocks) * 100)}%)
                        </p>
                      </div>
                    </div>
                    <Badge className={getCategoryColor(category)}>
                      {category}
                    </Badge>
                  </div>
                  
                  {/* Top factors for this category */}
                  {Object.keys(data.factors).length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-neutral-dark dark:text-white mb-2">
                        Common Factors:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(data.factors)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 3)
                          .map(([factor, count]) => (
                            <Badge key={factor} variant="outline" className="text-xs">
                              {factor.replace('_', ' ')} ({count})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Department impact */}
                  {Object.keys(data.departments).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-dark dark:text-white mb-2 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Affected Departments:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(data.departments)
                          .sort(([,a], [,b]) => b - a)
                          .map(([dept, count]) => (
                            <Badge key={dept} variant="secondary" className="text-xs">
                              {dept} ({count})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCategories.slice(0, 2).map(([category, data]) => (
                <div key={category} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-neutral-dark dark:text-white mb-1">
                    {getCategoryIcon(category)} Address {category} issues
                  </h4>
                  <p className="text-sm text-neutral-medium">
                    {getRecommendation(category, data)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getRecommendation(category: string, data: any): string {
  const topFactor = Object.entries(data.factors)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];
  
  switch (category) {
    case 'process':
      return `Review and update workflows. Primary issue: ${topFactor?.[0]?.replace('_', ' ') || 'process inefficiencies'}.`;
    case 'resources':
      return `Evaluate resource allocation and budgets. Main concern: ${topFactor?.[0]?.replace('_', ' ') || 'resource constraints'}.`;
    case 'communication':
      return `Improve documentation and stakeholder coordination. Focus on: ${topFactor?.[0]?.replace('_', ' ') || 'communication clarity'}.`;
    case 'external':
      return `Strengthen vendor relationships and external dependencies. Address: ${topFactor?.[0]?.replace('_', ' ') || 'external coordination'}.`;
    case 'technical':
      return `Invest in technical infrastructure and debt reduction. Priority: ${topFactor?.[0]?.replace('_', ' ') || 'technical limitations'}.`;
    case 'planning':
      return `Refine project planning and scope management. Improve: ${topFactor?.[0]?.replace('_', ' ') || 'planning accuracy'}.`;
    case 'skills':
      return `Develop training programs and knowledge sharing. Target: ${topFactor?.[0]?.replace('_', ' ') || 'skill development'}.`;
    default:
      return 'Conduct detailed root cause analysis to identify specific improvement areas.';
  }
}