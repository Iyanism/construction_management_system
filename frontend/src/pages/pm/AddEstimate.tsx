import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';

export default function AddEstimate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await api.get('/material-catalog');
        setCatalog(res.data);
      } catch (err) {
        toast.error('Failed to load material catalog');
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !quantity) return;

    try {
      setSubmitting(true);
      await api.post(`/projects/${id}/material-estimates`, {
        material_id: selectedMaterial.id,
        estimated_quantity: parseFloat(quantity)
      });
      toast.success('Material estimate added');
      navigate(`/projects/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add estimate');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalog = catalog.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Material Estimate</h1>
          <p className="text-muted-foreground text-sm">Define planned quantity for a project resource.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Material</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search catalog..."
                className="pl-9 h-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="h-[400px] overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading catalog...</div>
            ) : (
              <div className="space-y-1">
                {filteredCatalog.map((m) => (
                  <button
                    key={m.id}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedMaterial?.id === m.id 
                        ? 'bg-primary/5 border-primary ring-1 ring-primary' 
                        : 'hover:bg-muted border-transparent'
                    }`}
                    onClick={() => setSelectedMaterial(m)}
                  >
                    <p className="font-bold text-sm">{m.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <Badge variant="secondary" className="text-[10px] h-4">{m.category}</Badge>
                      <span className="text-xs text-muted-foreground">{m.unit}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Set Quantity</CardTitle>
            <CardDescription>Enter the planned amount for execution.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/30 border border-dashed flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Selected</p>
                  <p className="font-black">{selectedMaterial?.name || <span className="text-muted-foreground font-normal italic">None</span>}</p>
                </div>
                {selectedMaterial && <Badge variant="outline">{selectedMaterial.unit}</Badge>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty">Planned Quantity</Label>
                <div className="relative">
                  <Input 
                    id="qty"
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    required 
                    disabled={!selectedMaterial}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-lg font-bold"
                  />
                  {selectedMaterial && (
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm font-medium">
                      {selectedMaterial.unit}
                    </span>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={!selectedMaterial || !quantity || submitting}>
                {submitting ? 'Adding Estimate...' : 'Add to Planning'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
