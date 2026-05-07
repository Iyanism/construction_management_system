import { useEffect, useState } from 'react';
import { 
  ShieldCheck, AlertCircle, Clock, 
  BarChart3, RefreshCcw, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';

export default function Reconciliation() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/reconciliation');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Performing operational audit...</div>;
  if (!data) return null;

  const processedPercentage = data.total_operational_records > 0 
    ? (data.total_processed_records / data.total_operational_records) * 100 
    : 100;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Financial Reconciliation</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] uppercase font-black tracking-widest px-2 py-0 h-5">System Integrity</Badge>
            <span>Audit operational fields against the financial ledger.</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
          <RefreshCcw className="h-3 w-3 mr-2" /> Refresh Audit
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2 shadow-sm bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary/70">Processed Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{data.total_processed_records}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Operational entries in ledger</p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-sm bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700/70">Pending Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-amber-600">{data.total_pending_records}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Awaiting accountant validation</p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-sm bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Audit Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-600">{Math.round(processedPercentage)}%</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Validation throughput</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Operational vs. Processed
            </CardTitle>
            <CardDescription className="text-[11px]">Gap analysis between site activity and ledger transactions.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Record Reconciliation</span>
                <span className="text-xs font-black">{data.total_processed_records} / {data.total_operational_records}</span>
              </div>
              <Progress value={processedPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Processed Amount</p>
                <p className="text-xl font-black text-foreground">₹{data.total_processed_amount.toLocaleString()}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Secure in Ledger</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pending Exposure</p>
                <p className="text-xl font-black text-amber-600">₹{data.total_pending_amount.toLocaleString()}</p>
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">Unvalidated Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-sm border-dashed bg-muted/5">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Integrity Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                <span className="font-black uppercase tracking-tighter block mb-0.5">Immutable Ledger</span>
                Validated transactions cannot be modified directly. Any corrections require adjustment entries to preserve the audit trail.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-3 w-3 text-amber-600" />
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                <span className="font-black uppercase tracking-tighter block mb-0.5">Unprocessed Exposure</span>
                Pending items represent site activity that has occurred but hasn't been financially recognized. High pending load indicates a validation bottleneck.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Clock className="h-3 w-3 text-blue-600" />
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                <span className="font-black uppercase tracking-tighter block mb-0.5">Daily Reconciliation</span>
                Site attendance and material usage should ideally be processed within 24 hours of recording to maintain real-time budget accuracy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
