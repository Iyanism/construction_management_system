import { useEffect, useState } from 'react';
import { PieChart, TrendingUp, Wallet, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface ProjectFinanceSummary {
  project_id: number;
  project_name: string;
  budget: number;
  total_spent: number;
  budget_remaining: number;
  budget_utilization_percentage: number;
  budget_warning: boolean;
}

interface FinanceOverviewData {
  total_projects: number;
  total_active_projects: number;
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  global_by_category: Record<string, number>;
  projects: ProjectFinanceSummary[];
  pending_items_count: number;
  recent_transactions: any[];
}

export default function FinanceOverview() {
  const [data, setData] = useState<FinanceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get('/finance/overview');
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load financial overview');
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading financial data...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No data available.</div>;


  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary uppercase">Global Financial Monitor</h1>
          <p className="text-muted-foreground font-medium">Strategic snapshot of system-wide financial health and project burn rates.</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 h-6">
            Read-Only Analytics
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Global Budget</CardTitle>
            <Wallet className="h-4 w-4 text-primary opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{data.total_budget.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">Across {data.total_projects} projects</p>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Global Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{data.total_spent.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">Confirmed expenditures</p>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Liquidity</CardTitle>
            <PieChart className="h-4 w-4 text-emerald-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{data.total_remaining.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">Unallocated funds</p>
          </CardContent>
        </Card>
        <Card className={`border-2 shadow-sm ${data.pending_items_count > 0 ? "border-amber-500/50 bg-amber-50/10" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Action</CardTitle>
            <Clock className={`h-4 w-4 ${data.pending_items_count > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${data.pending_items_count > 0 ? 'text-amber-600' : ''}`}>{data.pending_items_count}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">Awaiting validation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Global Cost Breakdown */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Global Breakdown</CardTitle>
            <CardDescription className="text-[11px]">Aggregate spending by operational category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {Object.entries(data.global_by_category).map(([cat, amount]) => {
              const percentage = (amount / (data.total_spent || 1)) * 100;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                    <span className="opacity-70">{cat.replace('_', ' ')}</span>
                    <span className="text-foreground">₹{amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">Recent Activity</CardTitle>
              <CardDescription className="text-[11px]">Latest ledger entries across all projects</CardDescription>
            </div>
            <Button variant="ghost" size="xs" asChild className="h-7 text-[10px] font-black uppercase tracking-widest">
              <Link to="/finance/transactions">Full Ledger</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/50">
              {data.recent_transactions.map((tx: any) => (
                <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-muted/5 transition-colors">
                  <div className="space-y-0.5 overflow-hidden">
                    <p className="text-xs font-black truncate">{tx.description}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{tx.project_name} • {format(new Date(tx.date), 'MMM d')}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs font-black text-destructive">-₹{tx.amount.toLocaleString()}</p>
                    <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-black py-0 border-muted-foreground/30 opacity-60">{tx.category.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
              {data.recent_transactions.length === 0 && (
                <div className="p-12 text-center text-muted-foreground text-xs italic">No transactions in the ledger.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black uppercase tracking-tighter">High Budget Utilization</h2>
          <Badge variant="destructive" className="h-5 text-[9px] font-black tracking-widest uppercase animate-pulse">Critical Observation</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.projects
            .sort((a, b) => b.budget_utilization_percentage - a.budget_utilization_percentage)
            .slice(0, 3)
            .map(p => (
              <Card key={p.project_id} className={`overflow-hidden border-2 shadow-sm ${p.budget_warning ? 'border-destructive' : 'border-amber-500'}`}>
                <CardHeader className="pb-2 bg-muted/5">
                  <CardTitle className="text-xs font-black flex justify-between uppercase tracking-tight">
                    {p.project_name}
                    <span className={p.budget_warning ? 'text-destructive' : 'text-amber-600'}>
                      {p.budget_utilization_percentage}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Progress value={p.budget_utilization_percentage} className="h-2 mb-3" />
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground font-bold italic uppercase">
                      {p.budget_warning ? 'Project over budget.' : 'Approaching threshold.'}
                    </p>
                    <Button variant="link" size="xs" asChild className="h-auto p-0 text-[10px] font-black uppercase tracking-widest">
                      <Link to={`/finance/projects/${p.project_id}`}>Drilldown</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tighter text-muted-foreground">System Project Portfolio</h2>
        <div className="grid gap-4">
          {data.projects.map(p => (
            <Card key={p.project_id} className={`overflow-hidden border shadow-sm ${p.budget_warning ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-primary'}`}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row justify-between gap-6 md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black uppercase tracking-tight text-sm">{p.project_name}</h3>
                      {p.budget_warning && <Badge variant="destructive" className="text-[9px] h-4 font-black uppercase px-1.5 tracking-tighter">OVER BUDGET</Badge>}
                    </div>
                    <div className="flex gap-4 text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">
                      <span>Allocated: ₹{p.budget.toLocaleString()}</span>
                      <span className="text-foreground">Burn: ₹{p.total_spent.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="w-full md:w-64">
                    <div className="flex justify-between text-[10px] mb-1.5 font-black uppercase tracking-widest opacity-60">
                      <span>Utilization</span>
                      <span className={p.budget_warning ? 'text-destructive' : ''}>{p.budget_utilization_percentage}%</span>
                    </div>
                    <Progress value={p.budget_utilization_percentage} className="h-1.5" />
                  </div>

                  <Button variant="outline" size="sm" asChild className="h-9 text-[10px] font-black uppercase tracking-widest rounded-xl px-5 border-2">
                    <Link to={`/finance/projects/${p.project_id}`}>
                      Financial Drilldown <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
