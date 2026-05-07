import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, Clock, ArrowRight, ClipboardList, CheckCircle2, Zap, Users, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';

export default function AccountantDashboard() {
  const [data, setData] = useState<any>(null);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [overviewRes, pendingRes] = await Promise.all([
        api.get('/finance/overview'),
        api.get('/finance/pending-items')
      ]);
      setData(overviewRes.data);
      setPendingItems(pendingRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcess = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post('/finance/process-item', { item_id: id });
      toast.success('Item processed successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to process item');
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'material_request': return <Package className="h-3 w-3" />;
      case 'material_usage': return <Zap className="h-3 w-3" />;
      case 'labor_cost': return <Users className="h-3 w-3" />;
      default: return <ClipboardList className="h-3 w-3" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading operational snapshot...</div>;
  if (!data) return null;

  const totalPendingAmount = pendingItems.reduce((acc, item) => acc + item.amount, 0);
  const processedToday = data.recent_transactions.filter((tx: any) => 
    new Date(tx.date).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Row: Financial Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Total Budget</CardTitle>
            <Wallet className="h-4 w-4 text-primary opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{data.total_budget.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Global allocated capital</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{data.total_spent.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Confirmed expenditures</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Remaining Budget</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{data.total_remaining.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">System liquidity</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-2 ${data.pending_items_count > 0 ? "border-amber-500/50 bg-amber-50/20" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Pending Action</CardTitle>
            <Clock className={`h-4 w-4 ${data.pending_items_count > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{data.pending_items_count}</div>
            <p className="text-[10px] text-amber-700/80 mt-1 font-medium italic">₹{totalPendingAmount.toLocaleString()} exposure</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Action Center: Pending Financial Items */}
        <Card className="lg:col-span-2 border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b p-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">Financial Action Center</CardTitle>
              <CardDescription className="text-[11px] font-medium italic">Convert site operations into validated transactions</CardDescription>
            </div>
            <Button variant="outline" size="xs" asChild className="rounded-xl border-primary/30 h-7 text-[10px] font-black uppercase tracking-widest">
              <Link to="/finance/pending">Process All <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/50">
              {pendingItems.slice(0, 5).map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                  <div className="flex gap-4">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                      item.type === 'labor_cost' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      item.type === 'material_usage' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-tight">{item.project_name}</span>
                        <Badge variant="secondary" className="text-[9px] uppercase font-black py-0 h-4 border">
                          {item.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium truncate max-w-[300px]">{item.description}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-tighter opacity-70">
                        Recorded on {format(new Date(item.date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto">
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-black text-muted-foreground opacity-60">Impact</p>
                      <p className="text-sm font-black">₹{item.amount.toLocaleString()}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleProcess(item.id)} 
                      disabled={processingId === item.id}
                      className="rounded-xl px-4 h-8 text-[11px] font-black uppercase tracking-widest shadow-sm shadow-primary/20"
                    >
                      {processingId === item.id ? <Clock className="h-3 w-3 animate-spin" /> : "Process"}
                    </Button>
                  </div>
                </div>
              ))}
              {pendingItems.length === 0 && (
                <div className="p-16 text-center text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-4 opacity-20 text-emerald-500" />
                  <p className="text-sm font-black uppercase tracking-tight">All clear! No pending actions</p>
                  <p className="text-[11px] mt-1 italic">Everything is reconciled with the ledger.</p>
                </div>
              )}
            </div>
          </CardContent>
          {pendingItems.length > 5 && (
            <CardFooter className="bg-muted/5 justify-center py-2 border-t">
              <Link to="/finance/pending" className="text-[10px] uppercase font-black text-primary hover:underline tracking-widest">
                And {pendingItems.length - 5} more items requiring reconciliation
              </Link>
            </CardFooter>
          )}
        </Card>

        <div className="space-y-6">
          {/* Daily Throughput */}
          <Card className="bg-emerald-50/50 border-2 border-emerald-100 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-black text-emerald-700 tracking-widest opacity-70">Operational Throughput</p>
                  <p className="text-2xl font-black text-emerald-900">{processedToday}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">Transactions Processed Today</p>
                </div>
                <div className="h-12 w-12 bg-emerald-100/50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* High Budget Utilization Projects */}
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-3 border-b p-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">High Budget Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4 pt-5">
              {data.projects
                ?.sort((a: any, b: any) => b.budget_utilization_percentage - a.budget_utilization_percentage)
                .slice(0, 5).map((p: any) => (
                <div key={p.project_id} className="space-y-1.5 group">
                  <div className="flex justify-between items-center text-[11px]">
                    <Link to={`/finance/projects/${p.project_id}`} className="font-bold truncate max-w-[140px] group-hover:text-primary transition-colors uppercase tracking-tight">
                      {p.project_name}
                    </Link>
                    <span className={`font-black ${p.budget_warning ? "text-destructive" : "text-foreground"}`}>
                      {p.budget_utilization_percentage}%
                    </span>
                  </div>
                  <Progress value={p.budget_utilization_percentage} className="h-1.5" />
                </div>
              ))}
              {data.projects.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground py-4 italic">No project data available.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions (Short) */}
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-2 border-b p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Activity</CardTitle>
              <Link to="/finance/transactions" className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline opacity-80">Full Ledger</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-muted/50">
                {data.recent_transactions.slice(0, 5).map((tx: any) => (
                  <div key={tx.id} className="p-3.5 flex justify-between items-center hover:bg-muted/5 transition-colors">
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-[11px] font-bold truncate tracking-tight text-foreground/90">{tx.description}</p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter opacity-60">
                        {tx.project_name} • {format(new Date(tx.date), 'MMM d')}
                      </p>
                    </div>
                    <span className="text-[11px] font-black text-destructive shrink-0 ml-2">-₹{tx.amount.toLocaleString()}</span>
                  </div>
                ))}
                {data.recent_transactions.length === 0 && (
                  <p className="p-8 text-center text-[11px] text-muted-foreground italic">No recent transactions recorded.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
