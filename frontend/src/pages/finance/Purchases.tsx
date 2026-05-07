import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Package, ShoppingCart, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';

interface Purchase {
  id: number;
  project_name: string;
  material_name: string;
  material_unit: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  date: string;
  payment_status: string;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form State
  const [projectId, setProjectId] = useState<string>('');
  const [materialId, setMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('paid');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchData = async () => {
    try {
      const [purRes, projRes, catRes] = await Promise.all([
        api.get('/finance/material-purchases'),
        api.get('/projects'),
        api.get('/material-catalog')
      ]);
      setPurchases(purRes.data);
      setProjects(projRes.data);
      setCatalog(catRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!projectId || !materialId || !quantity || !unitPrice) {
      toast.error('All fields are required');
      return;
    }
    try {
      await api.post('/finance/material-purchases', {
        project_id: parseInt(projectId),
        material_id: parseInt(materialId),
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        payment_status: paymentStatus,
        date: dateStr
      });
      toast.success('Purchase recorded and inventory updated');
      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record purchase');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Purchases</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest px-2 py-0 h-5">Operational Data</Badge>
            <span>Log of all material inventory acquisitions.</span>
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Record Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Material Purchase</DialogTitle>
              <DialogDescription>
                Recording a purchase will <span className="font-bold text-primary underline underline-offset-4 decoration-2">automatically create a transaction</span> and update site stock.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="project" className="rounded-xl">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="material">Material</Label>
                <Select value={materialId} onValueChange={setMaterialId}>
                  <SelectTrigger id="material" className="rounded-xl">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    placeholder="0.00"
                    className="rounded-xl"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Unit Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    className="rounded-xl"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger id="status" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Purchase Date</Label>
                  <Input
                    id="date"
                    type="date"
                    className="rounded-xl"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} className="w-full rounded-xl">
                <Send className="h-4 w-4 mr-2" /> Record & Record Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Purchases Ledger</CardTitle>
          <CardDescription>
            <Badge variant="secondary" className="text-[10px] uppercase font-black mr-2">Creates Transaction + Updates Stock</Badge>
            Each entry represents a confirmed material acquisition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="w-full overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Material</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                    <th className="px-4 py-3 font-medium text-right">Total Cost (₹)</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading purchases...</td></tr>
                  ) : purchases.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No purchases found.</td></tr>
                  ) : (
                    purchases.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 font-medium">{p.project_name || 'N/A'}</td>
                        <td className="px-4 py-3 flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{p.material_name}</td>
                        <td className="px-4 py-3 text-right">{p.quantity} <span className="text-muted-foreground text-xs">{p.material_unit}</span></td>
                        <td className="px-4 py-3 text-right font-medium text-destructive">
                          - ₹{p.total_cost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={p.payment_status === 'paid' ? 'default' : 'outline'} className="text-[10px] uppercase h-5">
                            {p.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
