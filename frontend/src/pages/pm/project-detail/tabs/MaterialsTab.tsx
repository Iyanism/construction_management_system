import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Progress } from "../../../../components/ui/progress";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../../../components/ui/table";
import { Package, Lock, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MaterialsTabProps {
  projectId: string;
  estimates: any[];
  stock: any[];
  isPlanning: boolean;
  isDraft: boolean;
  isActive: boolean;
  isCompleted: boolean;
}

export function MaterialsTab({
  projectId,
  estimates,
  stock,
  isPlanning,
  isDraft,
  isActive,
  isCompleted
}: MaterialsTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><IndianRupee className="h-5 w-5" /> Material Estimates</CardTitle>
            <CardDescription>Planned resource requirements and budget allocation.</CardDescription>
          </div>
          {isPlanning && <Button size="sm" onClick={() => navigate(`/projects/${projectId}/add-estimate`)}>Add Estimate</Button>}
        </CardHeader>
        <CardContent>
          {!isPlanning && !isDraft && (
            <div className="mb-4 flex items-center gap-2 p-2 px-3 bg-muted/50 rounded-md text-xs text-muted-foreground border border-dashed">
              <Lock className="h-3 w-3" /> Estimates are finalized and locked.
            </div>
          )}
          {estimates.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 italic text-muted-foreground text-sm">No estimates defined.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((est: any) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-medium">{est.material?.name}</TableCell>
                    <TableCell>{est.estimated_quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{est.material?.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(isActive || isCompleted) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Site Inventory</CardTitle>
            <CardDescription>Current on-site stock availability and usage tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Used vs Planned</TableHead>
                  <TableHead>Consumption</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((s: any) => {
                  const estimate = estimates.find(e => e.material_id === s.material_id);
                  const planned = estimate?.estimated_quantity || 0;
                  const used = s.quantity_used || 0;
                  const usagePercent = planned > 0 ? (used / planned) * 100 : 0;
                  const isOver = used > planned && planned > 0;
                  const isHigh = usagePercent > 90 && !isOver;

                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-bold">{s.material?.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{s.material?.category}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {s.quantity_available} {s.material?.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-bold">{used}</span> / <span className="text-muted-foreground">{planned} {s.material?.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className={isOver ? 'text-destructive' : (isHigh ? 'text-amber-600' : 'text-emerald-600')}>
                              {isOver ? 'OVER-CONSUMED' : (isHigh ? 'HIGH USAGE' : 'NORMAL')}
                            </span>
                            <span>{usagePercent.toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(100, usagePercent)} className={`h-1.5 ${isOver ? 'bg-destructive/20 [&>div]:bg-destructive' : (isHigh ? 'bg-amber-100 [&>div]:bg-amber-500' : 'bg-emerald-100 [&>div]:bg-emerald-500')}`} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
