import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, HardHat, FolderKanban, IndianRupee, AlertCircle,
  Activity, Calendar, FileText, UserPlus, Package
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StatCard } from './components/StatCard';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/admin').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="p-8 text-center text-muted-foreground">Loading dashboard analytics...</div>;

  return (
    <div className="space-y-8 pb-10">
      {/* SECTION 1: Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Users" value={data.total_users} icon={Users} description="Active system users" />
        <StatCard title="Active Projects" value={data.active_projects} icon={Activity} description={`Out of ${data.total_projects} total`} />
        <StatCard title="Total Workers" value={data.total_workers} icon={HardHat} description="In global workforce" />
        <StatCard title="Total Budget" value={`₹${data.total_budget.toLocaleString()}`} icon={IndianRupee} description="Global allocated budget" />
        <StatCard title="Total Spent" value={`₹${data.total_spent.toLocaleString()}`} icon={IndianRupee} description="Total processed expenditures" />
        <StatCard
          title="Budget Utilization"
          value={`${((data.total_spent / (data.total_budget || 1)) * 100).toFixed(1)}%`}
          icon={Activity}
          description="Overall spend percentage"
        />
      </div>

      {/* SECTION 2: Action Signals (Alerts) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Over Budget <AlertCircle className="h-4 w-4 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projects_over_budget}</div>
            <p className="text-xs text-muted-foreground mt-1">Projects exceeding budget</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Projects Delayed <Calendar className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projects_delayed}</div>
            <p className="text-xs text-muted-foreground mt-1">End date past due</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Pending Requests <FileText className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pending_material_requests}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting PM approval</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Idle Workers <Users className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.workers_unassigned}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for assignment</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* SECTION 3: System Health / Activity */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Overview of project and labor status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Project Progress (Active vs Total)</span>
                <span className="font-medium">{data.active_projects} / {data.total_projects}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(data.active_projects / (data.total_projects || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Worker Utilization</span>
                <span className="font-medium">
                  {(((data.total_workers - data.workers_unassigned) / (data.total_workers || 1)) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${((data.total_workers - data.workers_unassigned) / (data.total_workers || 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Rapidly access management modules</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => navigate('/users')}>
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Create User</span>
                <span className="text-xs text-muted-foreground font-normal text-left">Grant system access</span>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => navigate('/master/workers')}>
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold flex items-center gap-2"><HardHat className="h-4 w-4 text-primary" /> Add Worker</span>
                <span className="text-xs text-muted-foreground font-normal text-left">Onboard to pool</span>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => navigate('/master/materials')}>
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Add Material</span>
                <span className="text-xs text-muted-foreground font-normal text-left">Update catalog</span>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => navigate('/projects')}>
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold flex items-center gap-2"><FolderKanban className="h-4 w-4 text-primary" /> View Projects</span>
                <span className="text-xs text-muted-foreground font-normal text-left">System oversight</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4: Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system changes and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recent_activity.latest_project && (
              <div className="flex items-center gap-4 text-sm">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">New Project Created</p>
                  <p className="text-muted-foreground text-xs">{data.recent_activity.latest_project.name}</p>
                </div>
              </div>
            )}
            {data.recent_activity.latest_user && (
              <div className="flex items-center gap-4 text-sm">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">New User Addition</p>
                  <p className="text-muted-foreground text-xs">{data.recent_activity.latest_user.name}</p>
                </div>
              </div>
            )}
            {data.recent_activity.recent_tx && (
              <div className="flex items-center gap-4 text-sm">
                <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <IndianRupee className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Recent Financial Transaction</p>
                  <p className="text-muted-foreground text-xs">Amount: ₹{data.recent_activity.recent_tx.amount.toLocaleString()}</p>
                </div>
              </div>
            )}
            {!data.recent_activity.latest_project && !data.recent_activity.latest_user && (
              <p className="text-center py-4 text-muted-foreground italic">No recent activity detected.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
