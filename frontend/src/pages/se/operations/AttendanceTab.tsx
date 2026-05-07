import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Check, X, Clock, Save, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

interface AttendanceTabProps {
  projectId: number;
  readOnly?: boolean;
  onActionComplete?: () => void;
}

export function AttendanceTab({ projectId, readOnly, onActionComplete }: AttendanceTabProps) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workersRes, attRes] = await Promise.all([
          api.get(`/projects/${projectId}/workers`),
          api.get(`/projects/${projectId}/attendance`)
        ]);
        setWorkers(workersRes.data);
        
        if (attRes.data && attRes.data.length > 0) {
          const mapped = attRes.data.reduce((acc: any, curr: any) => {
            acc[curr.worker_id] = curr.status;
            return acc;
          }, {});
          setAttendance(mapped);
          setMarked(true);
        } else {
          // Default to present
          const defaults = workersRes.data.reduce((acc: any, curr: any) => {
            acc[curr.worker_id] = 'present';
            return acc;
          }, {});
          setAttendance(defaults);
        }
      } catch (err: any) {
        const errorDetail = err.response?.data?.detail;
        const errorMessage = Array.isArray(errorDetail) 
          ? errorDetail.map(d => d.msg).join(', ') 
          : errorDetail || 'Failed to load workers';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const handleStatusChange = (workerId: number, status: string) => {
    if (marked || readOnly) return;
    setAttendance(prev => ({ ...prev, [workerId]: status }));
  };

  const handleSubmit = async () => {
    try {
      const entries = Object.entries(attendance).map(([id, status]) => ({
        worker_id: parseInt(id),
        status
      }));
      await api.post(`/projects/${projectId}/attendance`, { 
        date: format(new Date(), 'yyyy-MM-dd'),
        entries 
      });
      setMarked(true);
      toast.success('Attendance marked successfully');
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = Array.isArray(errorDetail) 
        ? errorDetail.map(d => d.msg).join(', ') 
        : errorDetail || 'Failed to mark attendance';
      toast.error(errorMessage);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading workers...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Worker Attendance</CardTitle>
          <CardDescription>Daily presence tracking for site staff</CardDescription>
        </div>
        {marked && (
          <Badge className="bg-emerald-500">
            <Check className="h-3 w-3 mr-1" /> Marked for Today
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-bold">Worker</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead className="text-right font-bold w-[300px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <UserIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-bold">{w.worker_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">ID: {w.worker_id}</p>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-medium">
                        {w.worker_role_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {[
                        { id: 'present', label: 'Present', color: 'emerald', icon: Check },
                        { id: 'half_day', label: 'Half Day', color: 'amber', icon: Clock },
                        { id: 'absent', label: 'Absent', color: 'destructive', icon: X }
                      ].map((s) => (
                        <Button
                          key={s.id}
                          size="sm"
                          variant={attendance[w.worker_id] === s.id ? 'default' : 'outline'}
                          className={`h-8 px-3 rounded-full text-[10px] uppercase font-bold transition-all ${
                            attendance[w.worker_id] === s.id 
                              ? (s.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : s.color === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-destructive hover:bg-destructive/90')
                              : (s.color === 'emerald' ? 'hover:text-emerald-600 hover:bg-emerald-50' : s.color === 'amber' ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-destructive hover:bg-destructive/5')
                          }`}
                          onClick={() => handleStatusChange(w.worker_id, s.id)}
                          disabled={marked || readOnly}
                        >
                          <s.icon className="h-3 w-3 mr-1" /> {s.label}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                    No workers assigned to this project.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {!marked && !readOnly && workers.length > 0 && (
        <CardFooter className="bg-muted/30 border-t py-4">
          <Button className="w-full sm:w-auto ml-auto" onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" /> Mark Attendance for {workers.length} Workers
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
