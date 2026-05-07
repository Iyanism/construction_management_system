import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownUp, Plus, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";

interface Transaction {
  id: number;
  project_name: string;
  project_id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_status: string;
  recorder_name: string;
  override_flag?: boolean;
  original_amount?: number;
  override_reason?: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTx, setNewTx] = useState({
    project_id: '',
    category: 'miscellaneous',
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_status: 'paid'
  });

  const fetchData = async () => {
    try {
      const [txRes, projRes] = await Promise.all([
        api.get('/finance/transactions'),
        api.get('/projects')
      ]);
      setTransactions(txRes.data);
      setProjects(projRes.data);
    } catch (err) {
      toast.error('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTransaction = async () => {
    if (!newTx.project_id || !newTx.description || !newTx.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/finance/transactions', {
        ...newTx,
        project_id: parseInt(newTx.project_id),
        amount: parseFloat(newTx.amount)
      });
      toast.success('Transaction recorded successfully');
      setShowAddModal(false);
      setNewTx({
        project_id: '',
        category: 'miscellaneous',
        description: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_status: 'paid'
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>;
      case 'pending': return <Badge variant="outline" className="text-amber-600 border-amber-500/30">Pending</Badge>;
      case 'partial': return <Badge variant="secondary" className="text-blue-600">Partial</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (projectFilter !== 'all' && t.project_name !== projectFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && t.payment_status !== statusFilter) return false;
    return true;
  });

  const totalAmount = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const pendingCount = filteredTransactions.filter(t => t.payment_status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions Ledger</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest px-2 py-0 h-5">Recorded Financial Entry</Badge>
            <span>Complete history of all validated project expenditures.</span>
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Record Direct Expense
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-black">₹{totalAmount.toLocaleString()}</div>
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Total Expenditure (Filtered)</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-black">{filteredTransactions.length}</div>
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Total Transactions</p>
          </CardContent>
        </Card>
        <Card className={pendingCount > 0 ? "border-l-4 border-l-amber-500 bg-amber-50/20" : "bg-muted/30"}>
          <CardContent className="pt-6">
            <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Pending Payments</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg"><ArrowDownUp className="h-4 w-4" /> Ledger History</CardTitle>
              <CardDescription className="text-xs">Master ledger for site expenditures and payouts.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-8 rounded-xl border border-input bg-background px-3 text-[11px] font-bold uppercase"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <select
                className="h-8 rounded-xl border border-input bg-background px-3 text-[11px] font-bold uppercase"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="material_purchase">Material Purchase</option>
                <option value="labor_cost">Labor Cost</option>
                <option value="material_usage">Material Usage</option>
                <option value="equipment">Equipment</option>
                <option value="transport">Transport</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
              <select
                className="h-8 rounded-xl border border-input bg-background px-3 text-[11px] font-bold uppercase"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Project / Recorder</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/50">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading transactions...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No transactions found matching your filters.</td></tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4 text-muted-foreground font-mono text-[11px]">{format(new Date(t.date), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm">{t.project_name || 'N/A'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">{t.recorder_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium max-w-[200px] truncate" title={t.description}>{t.description}</p>
                          {t.override_flag && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-amber-50 text-amber-900 border-amber-200">
                                  <div className="text-[10px] space-y-1">
                                    <p className="font-black uppercase">Accountant Override</p>
                                    <p>Original Amount: ₹{t.original_amount?.toLocaleString()}</p>
                                    {t.override_reason && <p>Reason: {t.override_reason}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={`text-[9px] uppercase font-black border h-5 ${
                          t.category === 'material_purchase' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          t.category === 'labor_cost' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          t.category === 'material_usage' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {t.category.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(t.payment_status)}</td>
                      <td className="px-6 py-4 text-right font-black text-sm text-destructive">
                        - ₹{t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Transaction Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Record Direct Expense</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Manually enter a financial transaction for costs not captured by site operations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Project</Label>
                <select
                  id="project"
                  className="w-full h-11 rounded-xl border-2 bg-background px-3 text-sm font-medium"
                  value={newTx.project_id}
                  onChange={(e) => setNewTx({...newTx, project_id: e.target.value})}
                >
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                <select
                  id="category"
                  className="w-full h-11 rounded-xl border-2 bg-background px-3 text-sm font-medium"
                  value={newTx.category}
                  onChange={(e) => setNewTx({...newTx, category: e.target.value})}
                >
                  <option value="equipment">Equipment</option>
                  <option value="transport">Transport</option>
                  <option value="miscellaneous">Miscellaneous</option>
                  <option value="material_purchase">Direct Material Purchase</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
              <Input
                id="description"
                placeholder="e.g. Crane rental for week 4"
                value={newTx.description}
                onChange={(e) => setNewTx({...newTx, description: e.target.value})}
                className="rounded-xl font-medium h-11 border-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({...newTx, amount: e.target.value})}
                  className="rounded-xl font-black h-11 border-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                  className="rounded-xl font-medium h-11 border-2 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Status</Label>
              <div className="flex gap-2">
                {['paid', 'pending', 'partial'].map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={newTx.payment_status === s ? 'default' : 'outline'}
                    onClick={() => setNewTx({...newTx, payment_status: s})}
                    className={`flex-1 rounded-xl h-10 text-[10px] font-black uppercase tracking-widest ${
                      newTx.payment_status === s ? '' : 'opacity-60'
                    }`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="p-3 flex gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-[10px] text-blue-800 font-medium leading-tight">
                  Recording a direct expense will immediately impact the project budget utilization. This transaction will be logged under your name as the recorder.
                </p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button onClick={handleAddTransaction} disabled={submitting} className="rounded-xl px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
              {submitting && <Plus className="h-3 w-3 mr-2 animate-spin" />}
              Save Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
