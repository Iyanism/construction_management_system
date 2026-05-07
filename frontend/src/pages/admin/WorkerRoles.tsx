import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';

interface WorkerRole {
  id: number;
  name: string;
  description: string;
}

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

type RoleForm = z.infer<typeof roleSchema>;

export default function WorkerRoles() {
  const [roles, setRoles] = useState<WorkerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
  });

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/worker-roles');
      setRoles(res.data);
    } catch (err) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const onSubmit = async (data: RoleForm) => {
    try {
      await api.post('/worker-roles', data);
      toast.success('Worker role created');
      setIsAddOpen(false);
      reset();
      fetchRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create role');
    }
  };

  const deleteRole = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/worker-roles/${id}`);
      toast.success('Role deleted');
      fetchRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worker Roles</h1>
          <p className="text-muted-foreground">Manage types of site workers</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground p-4">Loading...</p>
        ) : roles.length === 0 ? (
          <p className="text-muted-foreground p-4 col-span-full border border-dashed rounded-lg text-center bg-muted/20">No roles configured yet.</p>
        ) : (
          roles.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle>{r.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteRole(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{r.description || 'No description provided'}</CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Worker Role</DialogTitle>
            <DialogDescription>Define a new type of worker available for projects.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input placeholder="e.g. Master Mason" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Optional description..." {...register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
