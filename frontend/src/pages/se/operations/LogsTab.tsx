import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText, Save, History, MessageSquare, AlertTriangle } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

interface LogsTabProps {
  projectId: number;
  readOnly?: boolean;
  onActionComplete?: () => void;
  defaultPhaseId?: number;
}

export function LogsTab({ projectId, readOnly, onActionComplete, defaultPhaseId }: LogsTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [issues, setIssues] = useState('');
  const [notes, setNotes] = useState('');
  const [phaseId, setPhaseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [markedToday, setMarkedToday] = useState(false);
  const [phases, setPhases] = useState<any[]>([]);

  const fetchInitialData = async () => {
    try {
      const [logsRes, phasesRes] = await Promise.all([
        api.get(`/projects/${projectId}/daily-logs`),
        api.get(`/projects/${projectId}/phases`)
      ]);
      setLogs(logsRes.data);
      const today = format(new Date(), 'yyyy-MM-dd');
      setMarkedToday(logsRes.data.some((l: any) => l.date === today));
      
      const activePhases = phasesRes.data.filter((p: any) => p.status !== 'completed');
      setPhases(activePhases);
      
      if (defaultPhaseId) {
        setPhaseId(defaultPhaseId.toString());
      } else if (activePhases.length > 0) {
        const inProgress = activePhases.find((p: any) => p.status === 'in_progress');
        if (inProgress) setPhaseId(inProgress.id.toString());
      }
    } catch (err) {
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [projectId]);

  const handleSubmit = async () => {
    if (!summary) {
      toast.error('Please provide a summary of today\'s activities');
      return;
    }
    try {
      await api.post(`/projects/${projectId}/daily-logs`, { 
        date: format(new Date(), 'yyyy-MM-dd'),
        summary, 
        issues, 
        notes,
        phase_id: phaseId ? parseInt(phaseId) : null
      });
      toast.success('Daily log saved');
      setSummary('');
      setIssues('');
      setNotes('');
      fetchInitialData();
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = Array.isArray(errorDetail) 
        ? errorDetail.map(d => d.msg).join(', ') 
        : errorDetail || 'Failed to save log';
      toast.error(errorMessage);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading logs...</div>;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        {!markedToday && !readOnly ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Record Daily Activity
              </CardTitle>
              <CardDescription>What was accomplished on site today?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phase" className="font-bold flex items-center gap-2">
                  Project Phase <span className="text-destructive">*</span>
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
                {phases.length > 0 && !phases.find(p => p.id.toString() === phaseId)?.status.includes('progress') && (
                  <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Selected phase has not started execution.
                  </p>
                )}
                {phases.length === 0 && (
                  <p className="text-[10px] text-destructive font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> CRITICAL: No phases are currently active for this project.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary" className="font-bold">Daily Summary *</Label>
                <Textarea
                  id="summary"
                  placeholder="Summarize main tasks completed, workforce status, etc."
                  className="min-h-[120px] rounded-xl"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="issues" className="font-bold flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500" /> Obstacles & Issues
                  </Label>
                  <Textarea
                    id="issues"
                    placeholder="Any delays, accidents, or resource shortages?"
                    className="min-h-[80px] rounded-xl"
                    value={issues}
                    onChange={(e) => setIssues(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="font-bold flex items-center gap-2">
                    <MessageSquare className="h-3 w-3 text-blue-500" /> Additional Notes
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any other observations for the Project Manager?"
                    className="min-h-[80px] rounded-xl"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4">
              <Button onClick={handleSubmit} className="ml-auto">
                <Save className="h-4 w-4 mr-2" /> Save Daily Log
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className={`${markedToday ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${markedToday ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {markedToday ? <Save className="h-6 w-6" /> : <History className="h-6 w-6" />}
              </div>
              <h3 className={`text-lg font-bold ${markedToday ? 'text-emerald-900' : 'text-blue-900'}`}>
                {markedToday ? "Today's Activity Log Saved" : "Project Completed"}
              </h3>
              <p className={`text-sm max-w-xs mt-1 ${markedToday ? 'text-emerald-700' : 'text-blue-700'}`}>
                {markedToday 
                  ? "You have already recorded the site activity for today. You can view it in the history."
                  : "This project is marked as completed. Daily logs are now closed."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> Log History
          </CardTitle>
          <CardDescription>Last 5 days of activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase">
                    {format(new Date(log.date), 'MMM d')}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-2">{log.summary}</p>
                {log.issues && (
                  <p className="text-[10px] text-destructive font-bold mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-2 w-2" /> Issue reported
                  </p>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground italic text-sm">
                No logs recorded yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
