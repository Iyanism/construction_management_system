import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../../../components/ui/table";
import { Users, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkersTabProps {
  projectId: string;
  workers: any[];
  isPlanning: boolean;
  isDraft: boolean;
}

export function WorkersTab({ projectId, workers, isPlanning, isDraft }: WorkersTabProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Workforce Planning</CardTitle>
          <CardDescription>
            {isPlanning ? "Define and assign your workforce from the available pool." : "View the workforce assigned to this project."}
          </CardDescription>
        </div>
        {(isPlanning || isDraft) && (
          <Button size="sm" onClick={() => navigate(`/projects/${projectId}/assign-workers`)}>Manage Assignments</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!isPlanning && !isDraft && (
          <div className="flex items-center gap-2 p-2 px-3 bg-muted/50 rounded-md text-xs text-muted-foreground border border-dashed">
            <Lock className="h-3 w-3" /> Assignments are locked during execution. 
          </div>
        )}

        {workers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(
              workers.reduce((acc: any, w: any) => {
                const role = w.worker?.role_name || 'Other';
                acc[role] = (acc[role] || 0) + 1;
                return acc;
              }, {})
            ).map(([role, count]) => (
              <div key={role} className="p-3 border rounded-lg bg-slate-50/50">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">{role}</p>
                <p className="text-xl font-black">{count as number}</p>
              </div>
            ))}
            <div className="p-3 border rounded-lg bg-primary/5 border-primary/10">
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Total Strength</p>
              <p className="text-xl font-black text-primary">{workers.length}</p>
            </div>
          </div>
        )}

        {workers.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
            <p className="text-muted-foreground italic">No workers assigned.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.worker?.name}</TableCell>
                  <TableCell>{w.worker?.role_name}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700">Active</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
