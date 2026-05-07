import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Users, FileOutput, Plus } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';

interface LaborCost {
  id: number;
  project_name: string;
  date: string;
  total_workers: number;
  total_amount: number;
}

export default function LaborCosts() {
  const [costs, setCosts] = useState<LaborCost[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [projectId, setProjectId] = useState<string>('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchData = async () => {
    try {
      const [costRes, projRes] = await Promise.all([
        api.get('/finance/labor-costs'),
        api.get('/projects')
      ]);
      setCosts(costRes.data);
      setProjects(projRes.data);
    } catch (err) {
      toast.error('Failed to load labor data');
    } finally {
      setLoadingPreview(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!projectId || !dateStr) {
        setPreview(null);
        return;
      }
      setLoadingPreview(true);
      try {
        const res = await api.get('/finance/labor-costs/preview', {
          params: { project_id: projectId, date: dateStr }
        });
        setPreview(res.data);
      } catch (err) {
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };
    fetchPreview();
  }, [projectId, dateStr]);

  const handleGenerate = async () => {
    if (!projectId || !dateStr) {
      toast.error('Project and date are required');
      return;
    }
    try {
      await api.post('/finance/labor-costs/generate', {
        project_id: parseInt(projectId),
        date: dateStr
      });
      toast.success('Labor costs calculated and transactions created');
      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate costs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Labor Costs</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest px-2 py-0 h-5">Operational Data</Badge>
            <span>Generated daily labor cost payouts.</span>
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Generate New
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Generate Labor Costs</DialogTitle>
              <DialogDescription>
                This will read today's attendance and <span className="font-bold text-primary underline underline-offset-4 decoration-2">record daily payouts</span>.
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
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  className="rounded-xl"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>

              {preview && (
                <div className="mt-2 p-3 rounded-xl bg-muted/50 border border-dashed border-primary/20 space-y-2">
                  <p className="text-[10px] uppercase font-black tracking-tighter text-muted-foreground">Calculation Preview</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Workers Present:</span>
                    <span className="font-bold">{preview.total_workers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Est. Payout:</span>
                    <span className="font-bold text-destructive">₹{preview.estimated_amount.toLocaleString()}</span>
                  </div>
                  {preview.is_already_generated && (
                    <Badge variant="destructive" className="w-full justify-center text-[10px] uppercase h-5">Already Generated</Badge>
                  )}
                </div>
              )}
              {loadingPreview && <div className="text-[10px] text-center italic text-muted-foreground">Calculating preview...</div>}
            </div>
            <DialogFooter>
              <Button
                onClick={handleGenerate}
                className="w-full rounded-xl"
                disabled={!preview || preview.is_already_generated || preview.total_workers === 0}
              >
                <FileOutput className="h-4 w-4 mr-2" /> Calculate & Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Daily Labor Calculations</CardTitle>
          <CardDescription>Costs generated based on site attendance and master wage rates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="w-full overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Record ID</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium text-right">Total Workers Paid</th>
                    <th className="px-4 py-3 font-medium text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading labor costs...</td></tr>
                  ) : costs.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No labor cost records found.</td></tr>
                  ) : (
                    costs.map(c => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-muted-foreground text-xs">LBR-{c.id.toString().padStart(4, '0')}</td>
                        <td className="px-4 py-3 font-medium">{format(new Date(c.date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3">{c.project_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-right">{c.total_workers}</td>
                        <td className="px-4 py-3 text-right font-medium text-destructive">
                          - ₹{c.total_amount.toLocaleString()}
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
