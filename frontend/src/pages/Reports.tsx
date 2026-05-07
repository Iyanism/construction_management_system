import { useEffect, useState } from 'react';
import {
  FileText, BarChart3, Package, Download,
  TrendingUp, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';

export default function Reports() {
  const [financeReport, setFinanceReport] = useState<any[]>([]);
  const [performanceReport, setPerformanceReport] = useState<any[]>([]);
  const [materialReport, setMaterialReport] = useState<any[]>([]);
  const [spendingTrends, setSpendingTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [finRes, perfRes, matRes, trendRes] = await Promise.all([
          api.get('/reports/financial-status'),
          api.get('/reports/project-performance'),
          api.get('/reports/material-consumption'),
          api.get('/reports/spending-trends')
        ]);
        setFinanceReport(finRes.data);
        setPerformanceReport(perfRes.data);
        setMaterialReport(matRes.data);
        setSpendingTrends(trendRes.data);
      } catch (err) {
        toast.error('Failed to load system reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h])).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} exported successfully`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Structured Reports</h1>
          <p className="text-muted-foreground">High-level insights and decision-ready data</p>
        </div>
      </div>

      {/* Summary Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Completion</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {performanceReport.length > 0
                ? (performanceReport.reduce((acc, curr) => acc + curr.completion_percentage, 0) / performanceReport.length).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Financial Health</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {financeReport.filter(r => r.utilization < 90).length} / {financeReport.length}
              <span className="text-xs font-normal text-muted-foreground ml-2">Healthy</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Materials</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">
              {new Set(materialReport.map(m => m.material_name)).size}
              <span className="text-xs font-normal text-muted-foreground ml-2">SKUs tracked</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Elapsed Time</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {performanceReport.reduce((acc, curr) => acc + curr.days_elapsed, 0)}
              <span className="text-xs font-normal text-muted-foreground ml-2">Man-days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-muted p-1">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Project Performance
          </TabsTrigger>
          <TabsTrigger value="financials" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Financial Insights
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Resource Usage
          </TabsTrigger>
        </TabsList>

        {/* Project Performance Tab */}
        <TabsContent value="projects" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Progress Summary</CardTitle>
                <CardDescription>Completion percentages and timeline tracking.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadCSV(performanceReport, 'project_performance')}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loading ? (
                  <p className="text-center py-10 text-muted-foreground">Analyzing performance data...</p>
                ) : performanceReport.map((p, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{p.project_name}</span>
                        <Badge variant="outline" className="capitalize">{p.status}</Badge>
                      </div>
                      <div className="text-sm font-medium">
                        {p.completion_percentage}% Complete
                      </div>
                    </div>
                    <Progress value={p.completion_percentage} className="h-3 bg-muted" />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.days_elapsed} days elapsed</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {p.days_remaining} days remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Insights Tab */}
        <TabsContent value="financials" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Budget vs Actual</CardTitle>
                  <CardDescription>System-wide financial standing per project.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadCSV(financeReport, 'financial_insights')}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted border-b font-medium">
                      <tr>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3 text-right">Budget</th>
                        <th className="px-4 py-3 text-right">Spent</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeReport.map((r, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{r.project_name}</td>
                          <td className="px-4 py-3 text-right">₹{r.budget.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-destructive font-semibold">₹{r.spent.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            {r.utilization > 100 ? (
                              <Badge variant="destructive">OVER BUDGET</Badge>
                            ) : r.utilization > 80 ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-200">WARNING</Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200">HEALTHY</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending Trend</CardTitle>
                <CardDescription>Monthly expenditure (last 6 months)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-4">
                  {spendingTrends.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">No trend data available.</p>
                  ) : spendingTrends.map((t, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{t.month}</span>
                        <span>₹{t.amount.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(t.amount / Math.max(...spendingTrends.map(x => x.amount)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resource Tab */}
        <TabsContent value="resources" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Material Consumption & Resources</CardTitle>
                <CardDescription>Aggregated usage across all construction sites.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadCSV(materialReport, 'resource_usage')}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted border-b font-medium">
                    <tr>
                      <th className="px-4 py-3">Material SKU</th>
                      <th className="px-4 py-3">Project Site</th>
                      <th className="px-4 py-3 text-right">Quantity Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialReport.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold">{r.material_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.project_name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-primary">{r.total_quantity_used}</span>
                          <span className="text-[10px] ml-1 uppercase text-muted-foreground">{r.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
