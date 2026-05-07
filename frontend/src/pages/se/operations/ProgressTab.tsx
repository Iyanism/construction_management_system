import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { LayoutList, Save, CheckCircle2, Circle } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface ProgressTabProps {
  projectId: number;
  readOnly?: boolean;
  onActionComplete?: () => void;
}

export function ProgressTab({ projectId, readOnly, onActionComplete }: ProgressTabProps) {
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Local state for editing a phase
  const [editStatus, setEditStatus] = useState<string>('');
  const [editProgress, setEditProgress] = useState<number>(0);

  const fetchPhases = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/phases`);
      setPhases(res.data);
    } catch (err) {
      toast.error('Failed to load project phases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhases();
  }, [projectId]);

  const startEdit = (phase: any) => {
    setUpdatingId(phase.id);
    setEditStatus(phase.status);
    setEditProgress(phase.progress_percentage);
  };

  const cancelEdit = () => {
    setUpdatingId(null);
  };

  const handleUpdate = async (phaseId: number) => {
    try {
      await api.patch(`/projects/${projectId}/phases/${phaseId}/progress`, {
        status: editStatus,
        progress_percentage: editProgress
      });
      toast.success('Phase progress updated');
      setUpdatingId(null);
      fetchPhases();
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update progress');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading phases...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-primary" /> Phase Execution
          </CardTitle>
          <CardDescription>Track and update the progress of construction stages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {phases.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 italic text-muted-foreground text-sm">
              No phases defined for this project.
            </div>
          ) : (
            <div className="grid gap-4">
              {phases.map((p) => (
                <div key={p.id} className={`p-4 border rounded-xl transition-all ${updatingId === p.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
                        {p.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : p.order}
                      </div>
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <Badge variant="outline" className={`
                        ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          p.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-700'}
                        capitalize px-3 py-1 rounded-lg font-bold text-[10px]
                      `}>
                        {p.status.replace('_', ' ')}
                      </Badge>

                      {!readOnly && updatingId !== p.id && p.status !== 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => startEdit(p)} className="h-8 rounded-lg text-xs font-bold">
                          Update
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>Progress</span>
                      <span>{p.progress_percentage}%</span>
                    </div>
                    <Progress value={p.progress_percentage} className="h-2" />
                  </div>

                  {updatingId === p.id && (
                    <div className="mt-6 p-4 bg-background border rounded-xl space-y-4 shadow-inner">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground">Status</label>
                          <Select value={editStatus} onValueChange={setEditStatus}>
                            <SelectTrigger className="h-9 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-muted-foreground">Progress Percentage</label>
                            <span className="text-xs font-mono font-bold text-primary">{editProgress}%</span>
                          </div>
                          <div className="pt-2">
                            <Slider
                              value={[editProgress]}
                              onValueChange={(vals) => setEditProgress(vals[0])}
                              max={100}
                              step={5}
                              className="cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-8 text-xs">Cancel</Button>
                        <Button size="sm" onClick={() => handleUpdate(p.id)} className="h-8 text-xs gap-2">
                          <Save className="h-3 w-3" /> Save Changes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/30 border-t py-4 justify-center">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-2">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" /> Site Engineer Verification Required
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
