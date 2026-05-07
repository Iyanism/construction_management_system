import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { LayoutList, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PhasesTabProps {
  projectId: string;
  phases: any[];
  isPlanning: boolean;
  isDraft: boolean;
  isCompleted: boolean;
}

export function PhasesTab({
  projectId,
  phases,
  isPlanning,
  isDraft,
  isCompleted
}: PhasesTabProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><LayoutList className="h-5 w-5" /> Project Roadmap</CardTitle>
          <CardDescription>Structured execution steps and progress.</CardDescription>
        </div>
        {(isPlanning || isDraft) && <Button size="sm" onClick={() => navigate(`/projects/${projectId}/add-phase`)}>Add Phase</Button>}
      </CardHeader>
      <CardContent>
        {!isPlanning && !isDraft && !isCompleted && (
          <div className="mb-4 flex items-center gap-2 p-2 px-3 bg-muted/50 rounded-md text-xs text-muted-foreground border border-dashed">
            <Lock className="h-3 w-3" /> Roadmap is locked during active execution.
          </div>
        )}
        {phases.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 italic text-muted-foreground text-sm">No phases defined.</div>
        ) : (
          <div className="space-y-3">
            {phases.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                    {p.order}
                  </div>
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.description || "No description provided."}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 w-20 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${p.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">
                        {p.progress_percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={`
                  ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    p.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 
                    'bg-slate-50 text-slate-600'}
                  capitalize px-3 rounded-lg text-[10px] font-bold
                `}>
                  {p.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
