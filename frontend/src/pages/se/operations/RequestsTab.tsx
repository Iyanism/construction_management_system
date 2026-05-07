import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Send, ClipboardList, CheckCircle2, Clock, XCircle } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';

import { useNavigate } from 'react-router-dom';

interface RequestsTabProps {
  projectId: number;
  readOnly?: boolean;
  onActionComplete?: () => void;
}

export function RequestsTab({ projectId, readOnly, onActionComplete }: RequestsTabProps) {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [materialId, setMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const [catRes, reqRes] = await Promise.all([
        api.get('/material-catalog'),
        api.get(`/projects/${projectId}/material-requests`)
      ]);
      setCatalog(catRes.data);
      setRequests(reqRes.data);
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleSubmit = async () => {
    if (!materialId || !quantity) {
      toast.error('Material and quantity are required');
      return;
    }
    const q = parseFloat(quantity);
    if (isNaN(q) || q <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    try {
      await api.post(`/projects/${projectId}/material-requests`, {
        material_id: parseInt(materialId),
        quantity: q,
        message
      });
      toast.success('Request sent to Project Manager');
      setMaterialId('');
      setQuantity('');
      setMessage('');
      fetchData();
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = Array.isArray(errorDetail) 
        ? errorDetail.map(d => d.msg).join(', ') 
        : errorDetail || 'Failed to send request';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading requests...</div>;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1 space-y-6">
        {!readOnly ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> New Request
              </CardTitle>
              <CardDescription>Request materials from PM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="req-material" className="font-bold">Material *</Label>
                <Select value={materialId} onValueChange={setMaterialId}>
                  <SelectTrigger id="req-material" className="rounded-xl">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-quantity" className="font-bold">Quantity *</Label>
                <Input
                  id="req-quantity"
                  type="number"
                  placeholder="How much is needed?"
                  className="rounded-xl"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-message" className="font-bold text-[10px] uppercase">Reason / Notes (Optional)</Label>
                <Textarea
                  id="req-message"
                  placeholder="Why is this needed urgently?"
                  className="min-h-[80px] rounded-xl"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4">
              <Button onClick={handleSubmit} className="w-full">
                <Send className="h-4 w-4 mr-2" /> Send Request
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="py-12 text-center">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-blue-900">Project Completed</h3>
              <p className="text-xs text-blue-700 mt-1">Cannot raise new requests for completed projects.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" /> Recent Requests
              </CardTitle>
              <CardDescription>Latest material requisitions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/site/requests')}>
              View Full History
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{req.material_name || `Material #${req.material_id}`}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs block uppercase font-bold">Quantity</span>
                        <span className="font-black">{req.quantity} {req.unit || ''}</span>
                      </div>
                    </div>
                    {req.message && (
                      <div className="bg-muted/50 p-2 rounded-lg max-w-[200px]">
                        <p className="text-[10px] italic text-muted-foreground leading-tight">"{req.message}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="p-12 text-center text-muted-foreground italic text-sm">
                  No material requests found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

  );
}
