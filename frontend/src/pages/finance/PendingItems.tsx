import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ClipboardList, CheckCircle2, Clock,
  AlertCircle, XCircle,
  Users, Package, Zap, ArrowRight,
  Info
} from 'lucide-react';

import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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

interface PendingItem {
  id: string;
  type: 'material_request' | 'material_usage' | 'labor_cost';
  project_id: number;
  project_name: string;
  description: string;
  amount: number;
  date: string;
}

export default function PendingItems() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [activeItem, setActiveItem] = useState<PendingItem | null>(null);
  const [overrideData, setOverrideData] = useState({
    amount: 0,
    quantity: 0,
    unitPrice: 0,
    reason: ''
  });

  const fetchData = async () => {
    try {
      const [itemsRes, projRes] = await Promise.all([
        api.get('/finance/pending-items'),
        api.get('/finance/projects/lite')
      ]);
      setItems(itemsRes.data);
      setProjects(projRes.data);
    } catch (err) {
      toast.error('Failed to load pending items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcess = async (item: PendingItem) => {
    // For material requests, show override modal instead of direct processing
    if (item.type === 'material_request') {
      setActiveItem(item);
      // We don't have easy access to quantity/unit_price here without another API call
      // or parsing the description. For now, we'll allow overriding the total amount
      // or we can implement a more detailed fetch if needed.
      setOverrideData({
        amount: item.amount,
        quantity: 0, // Placeholder
        unitPrice: 0, // Placeholder
        reason: ''
      });
      setShowOverrideModal(true);
      return;
    }

    // Direct process for others
    processAction(item.id, 'approve');
  };

  const processAction = async (id: string, action: 'approve' | 'reject', overrides?: any) => {
    if (action === 'approve') setProcessingId(id);
    else setRejectingId(id);

    try {
      await api.post('/finance/process-item', {
        item_id: id,
        action,
        ...overrides
      });
      toast.success(action === 'approve' ? 'Item processed and transaction recorded' : 'Item rejected');
      fetchData();
      setShowOverrideModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to ${action} item`);
    } finally {
      setProcessingId(null);
      setRejectingId(null);
    }
  };

  const submitOverride = () => {
    if (!activeItem) return;
    processAction(activeItem.id, 'approve', {
      override_amount: overrideData.amount,
      override_reason: overrideData.reason
    });
  };

  const getBudgetImpact = (projectId: number, amount: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.budget <= 0) return null;
    const percentage = (amount / project.budget) * 100;
    return percentage.toFixed(2);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'material_request': return <Package className="h-4 w-4 text-blue-500" />;
      case 'material_usage': return <Zap className="h-4 w-4 text-amber-500" />;
      case 'labor_cost': return <Users className="h-4 w-4 text-emerald-500" />;
      default: return <ClipboardList className="h-4 w-4" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Scanning for pending items...</div>;

  const totalPendingAmount = items.reduce((acc, item) => acc + item.amount, 0);

  const groupedItems = items.reduce((acc: any, item) => {
    if (!acc[item.project_name]) acc[item.project_name] = [];
    acc[item.project_name].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pending Financial Items</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest px-2 py-0 h-5">Decision Layer</Badge>
            <span>Review and validate site operational events into ledger transactions.</span>
          </p>
        </div>
        <Card className="bg-primary/5 border-primary/20 shadow-sm shrink-0">
          <CardContent className="py-2 px-6 flex flex-col items-end">
            <span className="text-[9px] uppercase font-black text-primary tracking-widest opacity-70">Pending Financial Load</span>
            <span className="text-xl font-black">₹{totalPendingAmount.toLocaleString()}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-10">
        {items.length === 0 ? (
          <Card className="bg-muted/10 border-dashed border-2">
            <CardContent className="py-24 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-black uppercase tracking-tight">Zero Pending Items</h3>
              <p className="text-muted-foreground text-sm font-medium">All site operations have been reconciled with the financial ledger.</p>
            </CardContent>
          </Card>
        ) : (
          Object.keys(groupedItems).map((projectName) => {
            const project = projects.find(p => p.name === projectName);
            return (
              <div key={projectName} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-foreground">{projectName}</h2>
                    {project && (
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Budget: ₹{project.budget.toLocaleString()} • Spent: ₹{project.total_spent.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-muted to-transparent"></div>
                  <Badge variant="secondary" className="font-black h-6">{groupedItems[projectName].length} PENDING</Badge>
                </div>

                <div className="grid gap-4">
                  {groupedItems[projectName].map((item: any) => {
                    const impact = getBudgetImpact(item.project_id, item.amount);
                    return (
                      <Card key={item.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-all group">
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row items-stretch md:items-center">
                            <div className="p-5 flex-1 flex gap-5">
                              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-2 ${item.type === 'labor_cost' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  item.type === 'material_usage' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                {getTypeIcon(item.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Badge variant="outline" className="text-[9px] uppercase font-black py-0 h-4 border-muted-foreground/30 opacity-70">
                                    {item.type.replace('_', ' ')}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                    {format(new Date(item.date), 'MMMM d, yyyy')}
                                  </span>
                                </div>
                                <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors leading-tight mb-1">{item.description}</p>
                                <p className="text-[11px] text-muted-foreground font-medium">Source ID: <span className="font-mono">{item.id}</span></p>
                              </div>
                            </div>

                            <div className="bg-muted/10 md:w-80 p-5 flex flex-col justify-center border-t md:border-t-0 md:border-l space-y-4">
                              <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Estimated Impact</span>
                                  <span className="text-xl font-black text-foreground tracking-tight">
                                    {item.amount > 0 ? `₹${item.amount.toLocaleString()}` : 'TBD'}
                                  </span>
                                </div>
                                {impact && (
                                  <div className="text-right">
                                    <span className="text-[9px] font-black text-primary uppercase block">Budget Impact</span>
                                    <span className="text-xs font-black">{impact}%</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => processAction(item.id, 'reject')}
                                  disabled={rejectingId === item.id || processingId === item.id}
                                  className="flex-1 rounded-xl h-10 text-[10px] font-black uppercase tracking-widest border-destructive/30 text-destructive hover:bg-destructive/5"
                                >
                                  {rejectingId === item.id ? (
                                    <Clock className="h-3 w-3 mr-2 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3 w-3 mr-2" />
                                  )}
                                  Reject
                                </Button>
                                <Button
                                  onClick={() => handleProcess(item)}
                                  disabled={processingId === item.id || rejectingId === item.id}
                                  className="flex-[2] rounded-xl shadow-sm hover:shadow-md h-10 text-[10px] font-black uppercase tracking-widest"
                                >
                                  {processingId === item.id ? (
                                    <Clock className="h-3 w-3 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 mr-2" />
                                  )}
                                  Validate & Record
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Override Modal */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Financial Validation</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Review and finalize the transaction details for this material request.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-2xl border border-dashed flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Original Total</p>
                  <p className="text-lg font-black line-through opacity-40">₹{activeItem?.amount.toLocaleString()}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Final Total</p>
                  <p className="text-lg font-black text-primary">₹{overrideData.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Final Amount (Override)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    value={overrideData.amount}
                    onChange={(e) => setOverrideData({ ...overrideData, amount: parseFloat(e.target.value) || 0 })}
                    className="pl-7 rounded-xl font-black h-11 border-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Override Reason</Label>
                <Input
                  id="reason"
                  placeholder="e.g. Bulk discount negotiated"
                  value={overrideData.reason}
                  onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
                  className="rounded-xl font-medium h-11 border-2"
                />
              </div>
            </div>

            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="p-3 flex gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-[10px] text-blue-800 font-medium leading-tight">
                  Applying an override will flag this transaction in the ledger for transparency. Original estimates are preserved for audit purposes.
                </p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowOverrideModal(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button onClick={submitOverride} className="rounded-xl px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Confirm & Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-amber-50/30 border-amber-200/50 border-2 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-amber-900/60">
            <AlertCircle className="h-3 w-3" /> Financial Decision Layer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-amber-800/70 font-medium leading-relaxed">
            As an accountant, your validation converts site events into immutable ledger transactions.
            This process is critical for budget accuracy, as it moves costs from "operational estimates" into "actual financial spent."
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
