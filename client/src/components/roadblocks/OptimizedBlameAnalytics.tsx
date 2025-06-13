import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, Users } from "lucide-react";

interface RoadblockData {
  id: number;
  oorzaakCategory: string;
  oorzaakFactor?: string;
  departmentImpact?: string[];
  severity: string;
  status: string;
}

interface AnalyticsData {
  count: number;
  factors: Record<string, number>;
  departments: string[];
}

interface OorzaakAnalyticsProps {
  roadblocks: RoadblockData[];
  className?: string;
}

export default function OorzaakAnalytics({ roadblocks, className }: OorzaakAnalyticsProps) {
  const { oorzaakAnalysis, totalRoadblocks, topCategories } = useMemo(() => {
    const analysis = roadblocks.reduce((acc: Record<string, AnalyticsData>, roadblock) => {
      const category = roadblock.oorzaakCategory || 'unclear';
      
      if (!acc[category]) {
        acc[category] = { count: 0, factors: {}, departments: [] };
      }
      
      acc[category].count++;
      
      if (roadblock.oorzaakFactor) {
        acc[category].factors[roadblock.oorzaakFactor] = (acc[category].factors[roadblock.oorzaakFactor] || 0) + 1;
      }
      
      if (roadblock.departmentImpact) {
        roadblock.departmentImpact.forEach(dept => {
          if (!acc[category].departments.includes(dept)) {
            acc[category].departments.push(dept);
          }
        });
      }
      
      return acc;
    }, {});

    const total = roadblocks.length;
    const topCats = Object.entries(analysis)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 3);

    return { oorzaakAnalysis: analysis, totalRoadblocks: total, topCategories: topCats };
  }, [roadblocks]);

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'process': '⚙️',
      'resources': '💰',
      'communication': '💬',
      'external': '🌐',
      'technical': '🔧',
      'planning': '📋',
      'skills': '🎓',
      'unclear': '❓'
    };
    return icons[category] || '❓';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'process': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'resources': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'communication': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'external': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'technical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'planning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'skills': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'unclear': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (totalRoadblocks === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-neutral-medium">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Geen knelpunten gevonden voor analyse</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-neutral-medium">Totaal Knelpunten</p>
                <p className="text-2xl font-bold text-neutral-dark">{totalRoadblocks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-neutral-medium">Categorieën</p>
                <p className="text-2xl font-bold text-neutral-dark">{Object.keys(oorzaakAnalysis).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-neutral-medium">Afdelingen Getroffen</p>
                <p className="text-2xl font-bold text-neutral-dark">
                  {new Set(Object.values(oorzaakAnalysis).flatMap(data => data.departments)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Oorzaak Categorieën
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCategories.map(([category, data]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    <div>
                      <h4 className="font-medium capitalize">{category.replace('_', ' ')}</h4>
                      <p className="text-sm text-neutral-medium">{data.count} knelpunten</p>
                    </div>
                  </div>
                  <Badge className={getCategoryColor(category)}>
                    {Math.round((data.count / totalRoadblocks) * 100)}%
                  </Badge>
                </div>
                
                <Progress value={(data.count / totalRoadblocks) * 100} className="mb-3" />
                
                {data.departments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {data.departments.slice(0, 3).map(dept => (
                      <Badge key={dept} variant="outline" className="text-xs">
                        {dept}
                      </Badge>
                    ))}
                    {data.departments.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{data.departments.length - 3} meer
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Gedetailleerde Oorzaak Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(oorzaakAnalysis)
              .sort(([,a], [,b]) => b.count - a.count)
              .map(([category, data]) => (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCategoryIcon(category)}</span>
                      <h4 className="font-medium capitalize">{category.replace('_', ' ')}</h4>
                    </div>
                    <Badge className={getCategoryColor(category)}>
                      {data.count} knelpunten
                    </Badge>
                  </div>
                  
                  {Object.keys(data.factors).length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Specifieke Factoren:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(data.factors)
                          .sort(([,a], [,b]) => b - a)
                          .map(([factor, count]) => (
                            <Badge key={factor} variant="secondary" className="text-xs">
                              {factor.replace('_', ' ')}: {count}
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
    </div>
  );
}