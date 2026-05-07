import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, IndianRupee, Calendar, History } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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

interface WorkerRole {
  id: number;
  name: string;
}

interface WageRate {
  id: number;
  worker_role_id: number;
  worker_role_name: string;
  daily_rate: number;
  effective_from: string;
}

const wageRateSchema = z.object({
  worker_role_id: z.coerce.number().min(1, "Required"),
  daily_rate: z.coerce.number().min(1, "Required"),
  effective_from: z.string().min(1, "Required"),
});

type WageRateForm = z.infer<typeof wageRateSchema>;

export default function WageRates() {
  const [rates, setRates] = useState<WageRate[]>([]);
  const [roles, setRoles] = useState<WorkerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<WageRateForm>({
    resolver: zodResolver(wageRateSchema),
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ratesRes, rolesRes] = await Promise.all([
        api.get('/wage-rates'),
        api.get('/worker-roles')
      ]);
      setRates(ratesRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      toast.error('Failed to load wage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: WageRateForm) => {
    try {
      await api.post('/wage-rates', data);
      toast.success('Wage rate created');
      setIsAddOpen(false);
      reset();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create rate');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wage Rate Cards</h1>
          <p className="text-muted-foreground">Standard daily rates for different worker roles</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Rate Card
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground p-4">Loading...</p>
        ) : rates.length === 0 ? (
          <p className="text-muted-foreground p-4 col-span-full border border-dashed rounded-lg text-center bg-muted/20">No rates defined yet.</p>
        ) : (
          rates.map(r => (
            <Card key={r.id} className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                <History className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-semibold tracking-wider">{r.worker_role_name}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-1 text-primary">
                  <IndianRupee className="h-5 w-5" />
                  {r.daily_rate.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ day</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Effective: {format(new Date(r.effective_from), 'MMM dd, yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Wage Rate</DialogTitle>
            <DialogDescription>Define a new daily rate for a specific role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Worker Role</Label>
              <Select onValueChange={(val) => setValue('worker_role_id', parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.worker_role_id && <p className="text-xs text-destructive">{errors.worker_role_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Daily Rate (₹)</Label>
              <Input type="number" placeholder="500" {...register('daily_rate')} />
              {errors.daily_rate && <p className="text-xs text-destructive">{errors.daily_rate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input type="date" {...register('effective_from')} defaultValue={format(new Date(), 'yyyy-MM-dd')} />
              {errors.effective_from && <p className="text-xs text-destructive">{errors.effective_from.message}</p>}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Save Rate Card</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
