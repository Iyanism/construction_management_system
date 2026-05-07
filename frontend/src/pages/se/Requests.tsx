import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, CheckCircle2, Clock,
  XCircle, Search, Filter, Package,
  ArrowUpDown
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

export default function SERequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashRes = await api.get('/dashboard/site-engineer');
        const projectId = dashRes.data.assigned_project_id;
        
        if (projectId) {
          const reqRes = await api.get(`/projects/${projectId}/material-requests`);
          setRequests(reqRes.data);
        }
      } catch (err) {
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const filteredRequests = requests.filter(r =>
    r.material_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading requests...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Material Requisitions</h1>
          <p className="text-muted-foreground">Track all your material requests and their approval status</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                className="pl-9 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl"><Filter className="h-3.5 w-3.5 mr-2" /> Filter</Button>
              <Button variant="outline" size="sm" className="rounded-xl"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Sort</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Material</TableHead>
                <TableHead className="font-bold">Quantity</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs font-mono">
                    {new Date(req.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-bold">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary/50" />
                      {req.material_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-black">
                    {req.quantity} {req.unit}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(req.status)}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-[10px] text-muted-foreground italic truncate">
                      {req.message || '-'}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="h-8 w-8 opacity-20" />
                      No requisitions found matching your criteria.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
