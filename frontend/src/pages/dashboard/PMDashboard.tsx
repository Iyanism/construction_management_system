import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertCircle, Clock, TrendingUp,
  ArrowRight, Plus, IndianRupee,
  Briefcase, Construction,
  FileEdit, Package,
  Layout
} from 'lucide-react';

import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { StatCard } from './components/StatCard';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';

export default function PMDashboard() {
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/project-manager').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="p-8 text-center text-muted-foreground">Loading dashboard analytics...</div>;

  return (
    <div className="space-y-8 pb-10">
      {/* SECTION 1: Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Portfolio" value={data.my_projects} icon={Briefcase} description="Managed projects" />
        <StatCard
          title="Critical Issues"
          value={data.critical_projects}
          icon={AlertCircle}
          description="Delayed & Over budget"
          className="text-destructive"
        />
        <StatCard
          title="Projects At Risk"
          value={data.at_risk_projects}
          icon={Activity}
          description="Variance detected"
          className="text-amber-600"
        />
        <StatCard
          title="Pending Decisions"
          value={data.pending_material_requests}
          icon={FileEdit}
          description="Awaiting approval"
        />
      </div>

      {/* SECTION 2: Operational Alerts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Pending Approvals <FileEdit className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pending_material_requests}</div>
            <div className="mt-2 space-y-1">
              {data.pending_requests_list.slice(0, 2).map((r: any) => (
                <p key={r.id} className="text-[10px] text-muted-foreground truncate font-medium">• {r.material_name} for {r.project_name}</p>
              ))}
            </div>
            <Button variant="link" size="sm" className="p-0 h-auto text-amber-600 mt-2 text-[10px]" onClick={() => navigate('/pm/approvals')}>Review queue</Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Budget Overruns <IndianRupee className="h-4 w-4 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projects_over_budget}</div>
            <div className="mt-2 space-y-1">
              {data.projects.filter((p: any) => p.budget_utilization > 100).slice(0, 2).map((p: any) => (
                <p key={p.id} className="text-[10px] text-destructive truncate font-medium">• {p.name} ({p.budget_utilization.toFixed(0)}% used)</p>
              ))}
            </div>
            <Button variant="link" size="sm" className="p-0 h-auto text-destructive mt-2 text-[10px]" onClick={() => navigate('/pm/monitoring')}>Monitor risks</Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Timeline Delays <Clock className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.delayed_projects}</div>
            <div className="mt-2 space-y-1">
              {data.projects.filter((p: any) => p.delay_diff > 5).slice(0, 2).map((p: any) => (
                <p key={p.id} className="text-[10px] text-orange-600 truncate font-medium">• {p.name} ({p.delay_diff.toFixed(0)}% behind)</p>
              ))}
            </div>
            <Button variant="link" size="sm" className="p-0 h-auto text-orange-600 mt-2 text-[10px]" onClick={() => navigate('/pm/monitoring')}>Adjust schedule</Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Ready to Start <Construction className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.draft_projects + data.planning_projects}</div>
            <div className="mt-2 space-y-1 text-[10px] text-muted-foreground italic">
              {data.draft_projects + data.planning_projects > 0 ? "Projects awaiting site activation" : "No projects in pipeline"}
            </div>
            <Button variant="link" size="sm" className="p-0 h-auto text-emerald-600 mt-2 text-[10px]" onClick={() => navigate('/projects')}>View pipeline</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* SECTION 3: Recent Approval Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Recent requests requiring authorization</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pm/approvals')}>
              View Queue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.pending_requests_list.map((req: any) => {
                const totalCost = req.quantity * (req.unit_price || 0);
                const isHighValue = totalCost > 50000; // Arbitrary threshold for "high value"

                return (
                  <div key={req.id} className={`flex items-center justify-between p-3 border rounded-xl bg-card hover:bg-muted/30 transition-colors ${isHighValue ? 'border-l-4 border-l-amber-500' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isHighValue ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{req.material_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase truncate">{req.project_name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black">{req.quantity} {req.unit}</p>
                      <div className="flex items-center justify-end gap-2">
                        {totalCost > 0 && <span className={`text-[10px] font-bold ${isHighValue ? 'text-amber-700' : 'text-muted-foreground'}`}>₹{totalCost.toLocaleString()}</span>}
                        <Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={() => navigate(`/projects/${req.project_id}`)}>Detail</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.pending_requests_list.length === 0 && (
                <div className="text-center py-10 text-muted-foreground italic text-sm border border-dashed rounded-lg">
                  No pending requests found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Management Actions</CardTitle>
            <CardDescription>Tools for site control and planning</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/projects')}>
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold flex items-center gap-2 text-sm"><Plus className="h-3 w-3" /> New Project</span>
                <span className="text-[10px] text-muted-foreground">Initiate new site</span>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/pm/approvals')}>
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold flex items-center gap-2 text-sm"><Layout className="h-3 w-3" /> Decision Hub</span>
                <span className="text-[10px] text-muted-foreground">Handle requests</span>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/pm/monitoring')}>
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold flex items-center gap-2 text-sm"><TrendingUp className="h-3 w-3" /> Monitoring</span>
                <span className="text-[10px] text-muted-foreground">Risk assessment</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 5: My Projects */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>My Project Portfolio</CardTitle>
              <CardDescription>Recent projects under your supervision</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.projects.slice(0, 5).map((p: any) => {
              const healthColor = p.health === 'CRITICAL' ? 'bg-destructive/10 text-destructive border-destructive/20' : (p.health === 'AT RISK' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100');
              const utilColor = p.budget_utilization > 100 ? 'bg-destructive' : (p.budget_utilization > 90 ? 'bg-amber-500' : 'bg-emerald-500');

              return (
                <div
                  key={p.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group gap-4"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="flex items-center gap-4 min-w-[250px]">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${p.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Construction className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold truncate group-hover:text-primary transition-colors">{p.name}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 uppercase h-4 font-black ${healthColor}`}>
                          {p.health}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="capitalize font-medium">{p.status}</span>
                        <span>•</span>
                        <span className="font-mono">₹{p.total_spent.toLocaleString()} / {p.budget.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:flex items-center gap-6 flex-1 justify-end">
                    {/* Progress with Delay context */}
                    <div className="w-full md:w-32">
                      <div className="flex justify-between text-[10px] mb-1 font-bold uppercase">
                        <span className="text-muted-foreground">Progress</span>
                        <span className={p.delay_diff > 5 ? 'text-destructive' : ''}>{p.progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" />
                      {p.delay_diff > 5 && (
                        <p className="text-[9px] text-destructive font-bold mt-1 uppercase leading-none">
                          {p.delay_diff.toFixed(0)}% Behind
                        </p>
                      )}
                    </div>

                    {/* Budget Utilization Tracker */}
                    <div className="w-full md:w-32">
                      <div className="flex justify-between text-[10px] mb-1 font-bold uppercase text-muted-foreground">
                        <span>Budget Used</span>
                        <span className={p.budget_utilization > 100 ? 'text-destructive' : ''}>{p.budget_utilization.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${utilColor}`}
                          style={{ width: `${Math.min(100, p.budget_utilization)}%` }}
                        />
                      </div>
                    </div>

                    <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
            {data.projects.length === 0 && (
              <div className="text-center py-10 text-muted-foreground italic">
                No projects found in your portfolio.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
