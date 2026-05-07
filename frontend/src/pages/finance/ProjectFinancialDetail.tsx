import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Wallet, TrendingUp, CheckCircle2, 
  AlertTriangle, Clock, Receipt, Users, Package, Zap 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';

export default function ProjectFinancialDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/finance/projects/${id}/drilldown`);
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load project financial details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading financial drilldown...</div>;
  if (!data) return <div className="p-8 text-center">Project not found</div>;

  const { summary } = data;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/finance/overview"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">{summary.project_name}</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest flex items-center gap-2">
            Financial Operational Audit • ID: {summary.project_id}
          </p>
        </div>
      </div>

      {/* Header Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Budget</CardTitle>
            <Wallet className="h-4 w-4 text-primary opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{summary.budget.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Planned allocation</p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{summary.total_spent.toLocaleString()}</div>
            <Progress value={summary.budget_utilization_percentage} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Remaining</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">₹{summary.budget_remaining.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{100 - summary.budget_utilization_percentage}% liquidity left</p>
          </CardContent>
        </Card>

        <Card className={`border-2 shadow-sm ${summary.budget_warning ? "bg-destructive/5 border-destructive/20" : "bg-emerald-50/30 border-emerald-100"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</CardTitle>
            {summary.budget_warning ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-black uppercase tracking-tighter ${summary.budget_warning ? "text-destructive" : "text-emerald-600"}`}>
              {summary.budget_warning ? "Budget Alert" : "Healthy"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{summary.budget_utilization_percentage}% utilization</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12 w-full justify-start border overflow-x-auto">
          <TabsTrigger value="transactions" className="rounded-lg px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:shadow-sm">
            <Receipt className="h-3 w-3 mr-2" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="labor" className="rounded-lg px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:shadow-sm">
            <Users className="h-3 w-3 mr-2" /> Labor Costs
          </TabsTrigger>
          <TabsTrigger value="purchases" className="rounded-lg px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:shadow-sm">
            <Package className="h-3 w-3 mr-2" /> Purchases
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:shadow-sm">
            <Clock className="h-3 w-3 mr-2" /> Pending {data.pending_items.length > 0 && `(${data.pending_items.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-black uppercase tracking-tight">Financial Ledger</CardTitle>
              <CardDescription className="text-[11px]">Audit trail of all validated expenditures for this project.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-bold text-xs whitespace-nowrap">{format(new Date(tx.date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-xs font-medium">{tx.description}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest py-0 h-4">{tx.category.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[9px] font-black uppercase tracking-widest py-0 h-4 ${
                            tx.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                            tx.payment_status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                            'bg-blue-500/10 text-blue-600 border-blue-200'
                          }`}>
                            {tx.payment_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-destructive">₹{tx.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.transactions.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground italic">No transactions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor" className="mt-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-black uppercase tracking-tight">Labor Cost Entries</CardTitle>
              <CardDescription className="text-[11px]">Daily aggregated labor costs derived from worker attendance.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Workers</th>
                      <th className="px-4 py-3">Generated At</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.labor_costs.map((lc: any) => (
                      <tr key={lc.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-bold text-xs">{format(new Date(lc.date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-xs font-medium">{lc.total_workers} workers</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(lc.created_at), 'MMM d, HH:mm')}</td>
                        <td className="px-4 py-3 text-right font-black">₹{lc.total_amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.labor_costs.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground italic">No labor cost entries found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="mt-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-black uppercase tracking-tight">Material Purchases</CardTitle>
              <CardDescription className="text-[11px]">Direct records of material acquisition for this project.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.material_purchases.map((mp: any) => (
                      <tr key={mp.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-bold text-xs">{format(new Date(mp.date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-xs font-medium">{mp.material_name}</td>
                        <td className="px-4 py-3 text-xs">{mp.quantity} {mp.material_unit}</td>
                        <td className="px-4 py-3 text-xs">₹{mp.unit_price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black">₹{mp.total_cost.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.material_purchases.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground italic">No material purchases found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid gap-4">
            {data.pending_items.map((item: any) => (
              <Card key={item.id} className="border-2 border-amber-100 bg-amber-50/10 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                      {item.type === 'labor_cost' ? <Users className="h-5 w-5" /> : item.type === 'material_usage' ? <Zap className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{item.description}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Exposure</p>
                    <p className="text-sm font-black">₹{item.amount.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {data.pending_items.length === 0 && (
              <Card className="border-2 border-dashed bg-muted/5">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20 text-emerald-500" />
                  <p className="text-xs font-black uppercase tracking-widest">No pending items for this project</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
