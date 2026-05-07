import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui/card";
import { Progress } from "../../../../components/ui/progress";
import { TrendingUp, Clock, IndianRupee, Users, LayoutList, AlertTriangle, CheckCircle2, Rocket } from "lucide-react";

interface MonitoringTabProps {
  project: any;
  healthBg: string;
  healthColor: string;
  projectHealth: string;
  timelineStatus: string;
  expectedProgress: number;
  actualProgress: number;
  isOverBudget: boolean;
  workersCount: number;
  phases: any[];
  stock: any[];
}

export function MonitoringTab({
  project,
  healthBg,
  healthColor,
  projectHealth,
  timelineStatus,
  expectedProgress,
  actualProgress,
  isOverBudget,
  workersCount,
  phases,
  stock
}: MonitoringTabProps) {
  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className={healthBg}>
          <CardHeader className="pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Project Health</CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${healthColor}`}>{projectHealth}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Based on budget & timeline performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Timeline Status</CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${timelineStatus === 'DELAYED' ? 'text-destructive' : (timelineStatus === 'AHEAD' ? 'text-emerald-600' : 'text-blue-600')}`}>
              {timelineStatus}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Expected: {expectedProgress.toFixed(0)}% vs Actual: {actualProgress}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className={isOverBudget ? "bg-destructive/5" : ""}>
          <CardHeader className="pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Budget Variance</CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${isOverBudget ? 'text-destructive' : 'text-emerald-600'}`}>
              {isOverBudget ? 'OVERRUN' : 'WITHIN'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isOverBudget 
                ? `Exceeding by ₹${(project.total_spent - project.budget).toLocaleString()}` 
                : `₹${(project.budget - project.total_spent).toLocaleString()} remaining`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-emerald-100">
          <CardHeader className="pb-2 text-emerald-800"><CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Progress Analytics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-2xl font-black mb-1">
                <span>{actualProgress}%</span>
                <span className="text-emerald-600 text-xs font-bold mt-auto mb-1 flex items-center gap-1">
                  {timelineStatus === 'AHEAD' && <Rocket className="h-3 w-3" />}
                  {timelineStatus}
                </span>
              </div>
              <Progress value={actualProgress} className="h-3 bg-emerald-100 [&>div]:bg-emerald-600" />
            </div>
            
            <div className="pt-2 border-t border-dashed">
              <div className="flex justify-between text-xs text-muted-foreground mb-1 font-semibold">
                <span>Target Progress (Time-based)</span>
                <span>{expectedProgress.toFixed(1)}%</span>
              </div>
              <Progress value={expectedProgress} className="h-1.5 bg-slate-100 [&>div]:bg-slate-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={isOverBudget ? "border-destructive/30" : "border-blue-100"}>
          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Financial Burn</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between text-2xl font-black mb-2">
              <span className={isOverBudget ? 'text-destructive' : ''}>
                {project.budget > 0 ? ((project.total_spent / project.budget) * 100).toFixed(1) : 0}%
              </span>
              <span className="text-muted-foreground text-xs font-normal mt-auto mb-1">BUDGET UTILIZED</span>
            </div>
            <Progress value={Math.min(100, (project.total_spent / project.budget) * 100)} className={`h-4 ${isOverBudget ? 'bg-destructive/10 [&>div]:bg-destructive' : 'bg-blue-100 [&>div]:bg-blue-600'}`} />
            <div className="flex justify-between mt-4 text-xs font-medium">
              <div className="text-muted-foreground">Allocated: <span className="text-foreground">₹{project.budget.toLocaleString()}</span></div>
              <div className="text-muted-foreground">Spent: <span className={isOverBudget ? 'text-destructive font-bold' : 'text-foreground'}>₹{project.total_spent.toLocaleString()}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y border-y">
            <div className="p-6 space-y-1">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Labor Presence</p>
              <p className="text-xl font-black text-primary flex items-center gap-2"><Users className="h-5 w-5" /> {workersCount}</p>
            </div>
            <div className="p-6 space-y-1">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Phases Complete</p>
              <p className="text-xl font-black text-primary flex items-center gap-2"><LayoutList className="h-5 w-5" /> {phases.filter((p:any) => p.status === 'completed').length} / {phases.length}</p>
            </div>
            <div className="p-6 space-y-1">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Resource Health</p>
              {stock.some((s:any) => s.quantity_available < 10) ? (
                <p className="text-xl font-black text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> CRITICAL</p>
              ) : (
                <p className="text-xl font-black text-emerald-600 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> OPTIMAL</p>
              )}
            </div>
            <div className="p-6 space-y-1">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Timeline Health</p>
              <p className="text-xl font-black text-blue-600 flex items-center gap-2"><Clock className="h-5 w-5" /> {timelineStatus}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
