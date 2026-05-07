import { useEffect, useState } from 'react';
import { Activity, DollarSign, Users, AlertCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { differenceInDays } from 'date-fns';
import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function Monitoring() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMonitoring = async () => {
      try {
        setLoading(true);
        const res = await api.get('/pm/monitoring-summary');
        
        // Enrich and Sort projects by priority
        const enrichedProjects = res.data.projects.map((p: any) => {
          const startDate = new Date(p.start_date);
          const endDate = new Date(p.end_date);
          const today = new Date();
          
          const totalDays = differenceInDays(endDate, startDate) || 1;
          const elapsedDays = Math.max(0, differenceInDays(today, startDate));
          const expectedProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
          const actualProgress = p.progress_percentage || 0;
          
          const delayDiff = expectedProgress - actualProgress;
          const isDelayed = delayDiff > 5;
          const isOverBudget = p.total_spent > p.budget;
          
          let health = 'ON TRACK';
          let priority = 3; // Normal
          
          if (isDelayed && isOverBudget) {
            health = 'CRITICAL';
            priority = 1;
          } else if (isDelayed || isOverBudget) {
            health = 'AT RISK';
            priority = 2;
          }
          
          return {
            ...p,
            expectedProgress,
            delayDiff,
            health,
            priority,
            isDelayed,
            isOverBudget
          };
        }).sort((a: any, b: any) => a.priority - b.priority);

        setData({ ...res.data, projects: enrichedProjects });
      } catch (err) {
        toast.error('Failed to load monitoring summary');
      } finally {
        setLoading(false);
      }
    };
    fetchMonitoring();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground text-lg">Analyzing performance data...</div>;

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Monitoring</h1>
        <p className="text-muted-foreground">High-level performance tracking across all your active sites.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.projects.map((p: any) => {
          const budgetUtil = p.budget > 0 ? (p.total_spent / p.budget) * 100 : 0;
          const healthColor = p.health === 'CRITICAL' ? 'border-t-destructive' : (p.health === 'AT RISK' ? 'border-t-amber-500' : 'border-t-emerald-500');
          const healthBadge = p.health === 'CRITICAL' ? 'destructive' : (p.health === 'AT RISK' ? 'secondary' : 'outline');

          return (
            <Card key={p.id} className={`overflow-hidden border-t-4 ${healthColor}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{p.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={healthBadge as any} className="uppercase text-[10px]">
                        {p.health}
                      </Badge>
                      {p.delayDiff > 5 && (
                        <span className="text-[10px] text-destructive font-bold flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" /> {p.delayDiff.toFixed(0)}% BEHIND
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {p.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Comparison */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Actual Progress</span>
                      <span>{p.progress_percentage}%</span>
                    </div>
                    <Progress value={p.progress_percentage} className="h-2 [&>div]:bg-primary" />
                  </div>
                  <div className="space-y-1 opacity-60">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Expected Progress</span>
                      <span>{p.expectedProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={p.expectedProgress} className="h-1 bg-slate-100" />
                  </div>
                </div>

                {/* Financials */}
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                    <span>Budget Utilization</span>
                    <span className={p.isOverBudget ? 'text-destructive' : 'text-emerald-600'}>
                      {budgetUtil.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, budgetUtil)} 
                    className={`h-1.5 ${p.isOverBudget ? 'bg-destructive/20 [&>div]:bg-destructive' : 'bg-emerald-100 [&>div]:bg-emerald-500'}`} 
                  />
                  <div className="flex justify-between text-xs font-semibold">
                    <span>₹{p.total_spent.toLocaleString()} spent</span>
                    <span className="text-muted-foreground">of ₹{p.budget.toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold">{p.worker_count} Workers</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-primary hover:text-primary hover:bg-primary/5 p-0 h-auto font-bold text-xs"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    DETAILED CONTROL
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data?.projects.length === 0 && (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h2 className="text-xl font-bold">No active projects to monitor</h2>
          <p className="text-muted-foreground">Start or assign projects to see performance tracking.</p>
        </Card>
      )}
    </div>
  );
}
