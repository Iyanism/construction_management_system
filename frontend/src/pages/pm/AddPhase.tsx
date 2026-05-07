import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';

export default function AddPhase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`/projects/${id}/phases`, formData);
      toast.success('Phase added successfully');
      navigate(`/projects/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add phase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Project Phase</h1>
          <p className="text-muted-foreground text-sm">Define a new execution step for the project roadmap.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase Details</CardTitle>
          <CardDescription>Enter the name and sequence for this work phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Phase Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Foundation Work, Electrical Rough-in" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Execution Order</Label>
              <Input 
                id="order" 
                type="number" 
                min="1" 
                required 
                value={formData.order}
                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
              />
              <p className="text-[10px] text-muted-foreground">Lower numbers execute first.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Briefly describe the scope of this phase..." 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Adding...' : 'Add Phase'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
