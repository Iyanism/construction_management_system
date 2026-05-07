import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Package, Save, Box } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '@/components/ui/badge';

interface UsageTabProps {
  projectId: number;
  readOnly?: boolean;
  onActionComplete?: () => void;
  defaultPhaseId?: number;
}

export function UsageTab({ projectId, readOnly, onActionComplete, defaultPhaseId }: UsageTabProps) {
  const [stock, setStock] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for bulk usage entries: { materialId: quantity }
  const [usageEntries, setUsageEntries] = useState<Record<number, string>>({});
  const [phaseId, setPhaseId] = useState<string>('');
  const [phases, setPhases] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [stockRes, historyRes, phasesRes] = await Promise.all([
        api.get(`/projects/${projectId}/materials/stock`),
        api.get(`/projects/${projectId}/material-usage`),
        api.get(`/projects/${projectId}/phases`)
      ]);
      setStock(stockRes.data);
      setHistory(historyRes.data);
      
      const activePhases = phasesRes.data.filter((p: any) => p.status !== 'completed');
      setPhases(activePhases);
      
      if (defaultPhaseId) {
        setPhaseId(defaultPhaseId.toString());
      } else if (activePhases.length > 0) {
        const inProgress = activePhases.find((p: any) => p.status === 'in_progress');
        if (inProgress) setPhaseId(inProgress.id.toString());
      }
    } catch (err) {
      toast.error('Failed to load material data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleQuantityChange = (materialId: number, value: string) => {
    setUsageEntries(prev => ({
      ...prev,
      [materialId]: value
    }));
  };

  const handleSubmit = async () => {
    const entries = Object.entries(usageEntries)
      .filter(([_, qty]) => qty && parseFloat(qty) > 0)
      .map(([id, qty]) => ({
        material_id: parseInt(id),
        quantity_used: parseFloat(qty)
      }));

    if (entries.length === 0) {
      toast.error('Please enter usage for at least one material');
      return;
    }

    // Optional: Warn if any usage exceeds stock
    const overStock = entries.find(e => {
      const s = stock.find(item => item.material_id === e.material_id);
      return s && e.quantity_used > s.quantity_available;
    });
    if (overStock) {
      const mat = stock.find(item => item.material_id === overStock.material_id);
      toast.warning(`Note: ${mat?.material?.name} usage exceeds available stock`);
    }

    try {
      await api.post(`/projects/${projectId}/material-usage`, {
        date: format(new Date(), 'yyyy-MM-dd'),
        entries: entries,
        phase_id: phaseId ? parseInt(phaseId) : null
      });
      toast.success('Material consumption recorded');
      setUsageEntries({});
      fetchData();
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = Array.isArray(errorDetail) 
        ? errorDetail.map(d => d.msg).join(', ') 
        : errorDetail || 'Failed to record usage';
      toast.error(errorMessage);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading inventory...</div>;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        {/* Record Usage Form (Bulk) */}
        {!readOnly && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Daily Material Consumption
                </CardTitle>
                <CardDescription>Enter quantities used for materials on site today</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="px-6 space-y-2">
                <Label htmlFor="phase" className="font-bold flex items-center gap-2">
                  Active Execution Phase <span className="text-destructive">*</span>
                </Label>
                <Select value={phaseId} onValueChange={setPhaseId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select active phase" />
                  </SelectTrigger>
                  <SelectContent>
                    {phases.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} ({p.status.replace('_', ' ')})
                      </SelectItem>
                    ))}
                    {phases.length === 0 && <SelectItem value="none" disabled>No active phases found</SelectItem>}
                  </SelectContent>
                </Select>
                {phases.length === 0 && (
                  <p className="text-[10px] text-destructive font-bold">Execution context missing. Phase must be active.</p>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[40%]">Material Name</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="w-[30%]">Quantity Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((s) => (
                    <TableRow key={s.material_id}>
                      <TableCell>
                        <p className="font-bold text-sm">{s.material?.name || `Material #${s.material_id}`}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{s.material?.unit}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {s.quantity_available.toFixed(1)} {s.material?.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="0.0"
                          className="h-8 rounded-lg"
                          value={usageEntries[s.material_id] || ''}
                          onChange={(e) => handleQuantityChange(s.material_id, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {stock.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                        No materials available in site stock.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4">
              <Button onClick={handleSubmit} className="ml-auto" disabled={stock.length === 0}>
                <Save className="h-4 w-4 mr-2" /> Save Daily Consumption
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Usage History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Consumption History</CardTitle>
            <CardDescription>Historical record of site material usage</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 15).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs font-mono">{format(new Date(h.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <span className="font-medium">{h.material_name}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{h.quantity_used} {h.unit}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                      No material usage recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Current Site Inventory Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" /> Stock Overview
            </CardTitle>
            <CardDescription>Live quantities available on site</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {stock.map((s) => (
                <div key={s.material_id} className="p-4 hover:bg-muted/10 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold">{s.material?.name}</p>
                    <Badge variant={s.quantity_available < 10 ? 'destructive' : 'outline'} className="text-[9px] uppercase font-black">
                      {s.quantity_available < 10 ? 'Refill Needed' : 'Healthy'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Available:</span>
                    <span className={`font-mono font-bold ${s.quantity_available < 10 ? 'text-destructive' : ''}`}>
                      {s.quantity_available.toFixed(1)} {s.material?.unit}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${s.quantity_available < 10 ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, (s.quantity_available / (s.quantity_available + s.quantity_used) * 100)) || 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {stock.length === 0 && (
                <div className="p-8 text-center text-muted-foreground italic text-sm">
                  Inventory empty.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
