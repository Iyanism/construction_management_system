import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Calendar, MapPin, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

import api from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
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
import { Textarea } from '../../components/ui/textarea';

interface Project {
  id: number;
  name: string;
  client_name: string;
  location: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: string;
  project_manager_name: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects${search ? `?search=${search}` : ''}`);
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchProjects, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      client_name: formData.get('client_name'),
      location: formData.get('location'),
      description: formData.get('description'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      budget: parseFloat(formData.get('budget') as string) || 0,
    };
    
    try {
      const res = await api.post('/projects', data);
      setIsCreateOpen(false);
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'planning': return <Badge variant="outline" className="border-blue-500 text-blue-600">Planning</Badge>;
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case 'on_hold': return <Badge variant="destructive">On Hold</Badge>;
      case 'completed': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Completed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your construction sites</p>
        </div>
        {user?.role === 'project_manager' && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground border rounded-lg">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-sm">Create a new project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <Card key={p.id} className="flex flex-col hover:border-primary/50 transition-colors cursor-pointer shadow-sm hover:shadow-md" onClick={() => navigate(`/projects/${p.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-background">{p.client_name}</Badge>
                  {getStatusBadge(p.status)}
                </div>
                <CardTitle className="text-xl">{p.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {p.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Duration</span>
                    <span className="font-medium">
                      {p.start_date ? format(new Date(p.start_date), 'MMM d, yyyy') : 'TBD'} - 
                      {p.end_date ? format(new Date(p.end_date), 'MMM d, yyyy') : 'TBD'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Budget</span>
                    <span className="font-medium text-emerald-600">₹{(p.budget || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Setup a new construction project workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input name="name" required placeholder="e.g. Green Valley Heights" />
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input name="client_name" required placeholder="e.g. EcoBuilders Inc." />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input name="location" required placeholder="e.g. Plot 42, North City" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" placeholder="Project overview and details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input name="end_date" type="date" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial Budget (₹)</Label>
              <Input name="budget" type="number" step="1000" min="0" required placeholder="5000000" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
