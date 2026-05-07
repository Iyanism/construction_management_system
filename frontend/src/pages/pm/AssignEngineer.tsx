import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

export default function AssignEngineer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const res = await api.get('/users?role=site_engineer');
        setEngineers(res.data);
      } catch (err) {
        toast.error('Failed to load engineers');
      } finally {
        setLoading(false);
      }
    };
    fetchEngineers();
  }, []);

  const handleAssign = async (engineerId: number) => {
    try {
      setSubmitting(true);
      await api.post(`/projects/${id}/assign-engineer`, { site_engineer_id: engineerId });
      toast.success('Site Engineer assigned successfully');
      navigate(`/projects/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEngineers = engineers.filter(e => 
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assign Site Engineer</h1>
          <p className="text-muted-foreground text-sm">Select an engineer to oversee daily site operations.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading engineer list...</div>
          ) : filteredEngineers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground italic">No engineers found.</div>
          ) : (
            <div className="space-y-2">
              {filteredEngineers.map((engineer) => (
                <div key={engineer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {engineer.full_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{engineer.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{engineer.username}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={submitting}
                    onClick={() => handleAssign(engineer.id)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
