import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, HardHat } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';


export default function AssignWorkers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/worker-roles');
        setRoles(res.data);
      } catch (err) {
        toast.error('Failed to load worker roles');
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const updateCount = (roleId: number, delta: number) => {
    setAssignments(prev => {
      const current = prev[roleId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [roleId]: next };
    });
  };

  const handleBulkAssign = async () => {
    const payload = Object.entries(assignments)
      .filter(([_, count]) => count > 0)
      .map(([roleId, count]) => ({
        worker_role_id: parseInt(roleId),
        count
      }));

    if (payload.length === 0) {
      toast.error('Select at least one worker to assign');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/projects/${id}/assign-workers`, { assignments: payload });
      toast.success('Workers assigned successfully');
      navigate(`/projects/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalWorkers = Object.values(assignments).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Worker Assignment</h1>
          <p className="text-muted-foreground text-sm">Select required quantities per role from the available pool.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading available workforce roles...</div>
        ) : roles.map((role) => (
          <Card key={role.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <HardHat className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">{role.name}</p>
                  <p className="text-xs text-muted-foreground">Daily Rate: ₹{(role.base_rate || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={() => updateCount(role.id, -1)}
                  disabled={!assignments[role.id]}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold text-lg">{assignments[role.id] || 0}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={() => updateCount(role.id, 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="sticky bottom-6 shadow-lg border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Total Selection</p>
            <p className="text-2xl font-black text-primary">{totalWorkers} Workers</p>
          </div>
          <Button 
            size="lg" 
            className="px-10" 
            disabled={totalWorkers === 0 || submitting}
            onClick={handleBulkAssign}
          >
            {submitting ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
