import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../../../components/ui/table";
import { History, Check, X } from "lucide-react";
import { format } from "date-fns";

interface ApprovalsTabProps {
  project: any;
  requests: any[];
  handleRequestAction: (reqId: number, status: 'approved' | 'rejected') => void;
}

export function ApprovalsTab({ project, requests, handleRequestAction }: ApprovalsTabProps) {
  return (
    <Card className="border-amber-200">
      <CardHeader className="bg-amber-50/50 rounded-t-xl border-b border-amber-100">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-amber-800"><History className="h-5 w-5" /> Decision Center</CardTitle>
          <Badge variant="outline" className="bg-white text-amber-700 border-amber-200">{requests.length} Pending</Badge>
        </div>
        <CardDescription className="text-amber-700/70">Approve or reject material requests from the site engineer.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic">No pending requests to handle.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => {
                const estimatedCost = req.quantity * (req.material_unit_price || 0);
                const isHighImpact = estimatedCost > (project.budget * 0.05); // 5% of total budget
                
                return (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{req.material_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{req.requester_name} • {format(new Date(req.created_at), 'MMM dd')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono">{req.quantity} {req.material_unit}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className={`text-sm font-bold ${isHighImpact ? 'text-amber-600' : ''}`}>
                          ₹{estimatedCost.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Impact: {((estimatedCost / (project.budget || 1)) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleRequestAction(req.id, 'approved')}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => handleRequestAction(req.id, 'rejected')}><X className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
