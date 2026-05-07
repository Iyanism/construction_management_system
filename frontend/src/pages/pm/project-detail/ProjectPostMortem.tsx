import { Card, CardContent } from "../../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { CheckCircle2, Lock } from "lucide-react";

interface ProjectPostMortemProps {
  project: any;
  totalDays: number;
  workersCount: number;
  phasesCount: number;
  isOverBudget: boolean;
}

export function ProjectPostMortem({
  project,
  totalDays,
  workersCount,
  phasesCount,
  isOverBudget
}: ProjectPostMortemProps) {
  return (
    <div className="space-y-6">
      <Alert className="bg-purple-50 border-purple-200">
        <Lock className="h-4 w-4 text-purple-600" />
        <AlertTitle className="text-purple-700">Project Finalized</AlertTitle>
        <AlertDescription className="text-purple-600">
          All operations are locked. This view is now read-only for archival and reporting purposes.
        </AlertDescription>
      </Alert>

      <Card className="border-purple-200 overflow-hidden">
        <div className="bg-purple-600 p-4 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Project Post-Mortem Summary
          </h3>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y border-b">
            <div className="p-6">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Final Budget Accuracy</p>
              <p className={`text-2xl font-black ${isOverBudget ? 'text-destructive' : 'text-emerald-600'}`}>
                {((project.total_spent / project.budget) * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground italic">Target: 100%</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Total Duration</p>
              <p className="text-2xl font-black">{totalDays} Days</p>
              <p className="text-[10px] text-muted-foreground italic">Start to Completion</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Workforce Mobilized</p>
              <p className="text-2xl font-black">{workersCount}</p>
              <p className="text-[10px] text-muted-foreground italic">Assigned Personnel</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Execution Quality</p>
              <p className="text-2xl font-black text-emerald-600">SUCCESS</p>
              <p className="text-[10px] text-muted-foreground italic">{phasesCount} / {phasesCount} Phases Closed</p>
            </div>
          </div>
          <div className="p-6 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Budget</p>
                <p className="font-bold text-lg">₹{project.budget.toLocaleString()}</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Expenditure</p>
                <p className={`font-bold text-lg ${isOverBudget ? 'text-destructive' : 'text-emerald-600'}`}>
                  ₹{project.total_spent.toLocaleString()}
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-purple-200 text-purple-700">Download Final Report</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
