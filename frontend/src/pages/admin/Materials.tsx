import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Package, Trash2 } from 'lucide-react';
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

interface Material {
  id: number;
  name: string;
  unit: string;
  unit_price: number;
  category: string;
}

const materialSchema = z.object({
  name: z.string().min(2),
  unit: z.string().min(1),
  unit_price: z.number().min(0.01),
  category: z.string().min(2),
});

type MaterialForm = z.infer<typeof materialSchema>;

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MaterialForm>({
    resolver: zodResolver(materialSchema),
  });

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/material-catalog${search ? `?search=${search}` : ''}`);
      setMaterials(res.data);
    } catch (err) {
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchMaterials, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const onSubmit = async (data: MaterialForm) => {
    try {
      await api.post('/material-catalog', data);
      toast.success('Material added to catalog');
      setIsAddOpen(false);
      reset();
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add material');
    }
  };

  const deleteMaterial = async (id: number) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await api.delete(`/material-catalog/${id}`);
      toast.success('Material deleted');
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete material');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Catalog</h1>
          <p className="text-muted-foreground">Standardized materials and pricing</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog Items</CardTitle>
          <CardDescription>Master list of materials used across all projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Material Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Unit Price (₹)</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : materials.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No materials found.</td></tr>
                ) : (
                  materials.map(m => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {m.name}
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline">{m.category}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{m.unit}</td>
                      <td className="px-4 py-3 font-medium text-emerald-600">₹{m.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteMaterial(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
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
            <DialogTitle>Add Catalog Item</DialogTitle>
            <DialogDescription>Add a new material to the central catalog.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Material Name</Label>
              <Input placeholder="e.g. Portland Cement 53 Grade" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input placeholder="e.g. Cement" {...register('category')} />
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit of Measure</Label>
                <Input placeholder="e.g. bags" {...register('unit')} />
                {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Unit Price (₹)</Label>
                <Input type="number" step="0.01" placeholder="450.00" {...register('unit_price', { valueAsNumber: true })} />
                {errors.unit_price && <p className="text-xs text-destructive">{errors.unit_price.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Save Material</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
