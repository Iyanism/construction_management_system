import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, HardHat, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

interface Worker {
  id: number;
  name: string;
  worker_role_id: number;
  status: string;
  worker_role_name: string;
}

interface WorkerRole {
  id: number;
  name: string;
}

const workerSchema = z.object({
  name: z.string().min(2),
  worker_role_id: z.coerce.number().min(1),
});

type WorkerForm = z.infer<typeof workerSchema>;

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [roles, setRoles] = useState<WorkerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<WorkerForm>({
    resolver: zodResolver(workerSchema),
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workersRes, rolesRes] = await Promise.all([
        api.get('/workers', {
          params: {
            search: search || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter
          }
        }),
        api.get('/worker-roles')
      ]);
      setWorkers(workersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchData, 300);
    return () => clearTimeout(delay);
  }, [search, statusFilter]);

  const onSubmit = async (data: WorkerForm) => {
    try {
      await api.post('/workers', data);
      toast.success('Worker added to pool');
      setIsAddOpen(false);
      reset();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add worker');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Available</Badge>;
      case 'assigned':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Assigned</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="text-muted-foreground">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worker Pool</h1>
          <p className="text-muted-foreground">Manage all construction workers</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Worker
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Workforce</CardTitle>
          <CardDescription>All registered workers and their current availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search worker name..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Worker ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Trade / Role</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : workers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>No workers found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  workers.map(w => (
                    <tr key={w.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">WRK-{w.id.toString().padStart(4, '0')}</td>
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <HardHat className="h-4 w-4 text-muted-foreground" />
                        {w.name}
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary">{w.worker_role_name}</Badge></td>
                      <td className="px-4 py-3 text-right">{getStatusBadge(w.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Worker</DialogTitle>
            <DialogDescription>Register a new worker into the global pool.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="e.g. Ramesh Kumar" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Trade / Role</Label>
              <Select onValueChange={(val) => setValue('worker_role_id', parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select worker role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.worker_role_id && <p className="text-xs text-destructive">{errors.worker_role_id.message}</p>}
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Register Worker</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
