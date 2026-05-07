import { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Clock, Package, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

export default function Approvals() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pm/material-requests');
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to load material requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async () => {
    if (!selectedReq || !actionType) return;

    try {
      await api.post(`/pm/material-requests/${selectedReq.id}/action`, {
        status: actionType
      });
      toast.success(`Request ${actionType === 'approved' ? 'approved' : 'rejected'} successfully`);
      setRequests(requests.filter(r => r.id !== selectedReq.id));
      setSelectedReq(null);
      setActionType(null);
    } catch (err) {
      toast.error(`Failed to ${actionType} request`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="text-muted-foreground">Review and manage material requests across your projects.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Material Requests
          </CardTitle>
          <CardDescription>
            {requests.length} pending requests awaiting your decision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <Check className="h-10 w-10 text-emerald-500 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">No pending requests at this time.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {req.project_name}
                      </div>
                    </TableCell>
                    <TableCell>{req.material_name}</TableCell>
                    <TableCell>
                      {req.quantity} <span className="text-xs text-muted-foreground">{req.material_unit}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {req.requester_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(req.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedReq(req);
                            setActionType('rejected');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setSelectedReq(req);
                            setActionType('approved');
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this request?
              <div className="mt-4 p-3 bg-muted rounded-md text-sm space-y-1">
                <p><strong>Material:</strong> {selectedReq?.material_name}</p>
                <p><strong>Quantity:</strong> {selectedReq?.quantity} {selectedReq?.material_unit}</p>
                <p><strong>Project:</strong> {selectedReq?.project_name}</p>
                {selectedReq?.message && <p><strong>Note:</strong> "{selectedReq?.message}"</p>}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReq(null)}>Cancel</Button>
            <Button
              variant={actionType === 'approved' ? 'default' : 'destructive'}
              className={actionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={handleAction}
            >
              Confirm {actionType === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
