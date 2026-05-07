import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, HardHat, AlertCircle, CheckCircle2,
  Clock, Package, ClipboardList,
  ArrowRight, TrendingDown, LayoutList
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { StatCard } from './components/StatCard';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export default function SEDashboard() {
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/site-engineer').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="p-8 text-center text-muted-foreground">Loading site data...</div>;

  if (!data.assigned_project_id) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <HardHat className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-bold mb-1">No Active Assignment</h2>
          <p className="text-sm text-muted-foreground max-w-xs">You are not currently assigned to an active project as a Site Engineer.</p>
        </CardContent>
      </Card>
    );
  }

  const dailyActions = [
    { label: 'Mark Attendance', status: data.todays_attendance_marked, icon: Users, tab: 'attendance', required: true },
    { label: 'Daily Activity Log', status: data.todays_log_exists, icon: ClipboardList, tab: 'logs', required: true },
    { label: 'Material Usage', status: data.todays_material_usage_exists, icon: Package, tab: 'usage', required: false },
  ];

  const completedCount = dailyActions.filter(a => a.status).length;
  const requiredActions = dailyActions.filter(a => a.required);
  const requiredCompleted = requiredActions.filter(a => a.status).length;
  
  const isCompleted = data.assigned_project_status === 'completed';
  
  let statusText = "No activity recorded today";
  let statusColor = "bg-muted text-muted-foreground border-muted";
  let urgencyIcon = <Clock className="h-5 w-5" />;
  
  if (isCompleted) {
    statusText = "Project is COMPLETED (Read-only)";
    statusColor = "bg-blue-50 text-blue-700 border-blue-200";
    urgencyIcon = <CheckCircle2 className="h-5 w-5" />;
  } else if (requiredCompleted === requiredActions.length) {
    statusText = "All essential operations completed for today";
    statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
    urgencyIcon = <CheckCircle2 className="h-5 w-5" />;
  } else if (requiredCompleted > 0 || completedCount > 0) {
    statusText = "Pending essential actions remaining";
    statusColor = "bg-amber-50 text-amber-700 border-amber-200";
    urgencyIcon = <AlertCircle className="h-5 w-5" />;
  } else {
    statusColor = "bg-red-50 text-red-700 border-red-200";
    urgencyIcon = <AlertCircle className="h-5 w-5" />;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.assigned_project_name}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Operational dashboard for site
            {isCompleted && <Badge variant="secondary" className="bg-blue-100 text-blue-700">Completed</Badge>}
          </p>
        </div>
        <Button onClick={() => navigate('/site/operations')} disabled={isCompleted}>
          {isCompleted ? 'View Site Operations' : 'Open Site Operations'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Today's Work Status / Urgency Strip */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${statusColor}`}>
        <div className="flex items-center gap-3">
          {urgencyIcon}
          <span className="font-bold text-sm uppercase tracking-wider">{statusText}</span>
        </div>
        {data.low_stock_count > 0 && !isCompleted && (
          <Badge variant="destructive" className="animate-pulse">
            {data.low_stock_count} Stock Alerts
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Daily Workforce"
          value={data.total_assigned_workers}
          icon={Users}
          description="Workers assigned to site"
        />
        <StatCard
          title="Attendance Status"
          value={data.todays_attendance_marked ? "Marked" : "Pending"}
          icon={HardHat}
          description="For today's shift"
          className={data.todays_attendance_marked ? "text-emerald-600" : "text-amber-600"}
        />
        <StatCard
          title="Active Phase"
          value={data.active_phase_name || "None"}
          icon={LayoutList}
          description="Current execution stage"
          className={data.active_phase_id ? "text-primary" : "text-muted-foreground"}
        />
        <StatCard
          title="Stock Alerts"
          value={data.low_stock_count}
          icon={TrendingDown}
          description="Materials running low"
          className={data.low_stock_count > 0 ? "text-destructive" : ""}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Action Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Checklist</CardTitle>
            <CardDescription>Required daily site operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dailyActions.map((action) => (
              <div 
                key={action.label} 
                className="flex items-center justify-between p-3 border rounded-xl bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/site/operations?tab=${action.tab}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${action.status ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {action.status ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Low Stock Context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Context</CardTitle>
            <CardDescription>Items requiring replenishment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.low_stock_materials?.map((material: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${material.is_critical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{material.material_name}</p>
                      <p className="text-[10px] text-muted-foreground">{material.quantity_available.toFixed(1)} {material.unit} left</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={material.is_critical ? "text-red-600 border-red-200 bg-red-50" : "text-amber-600 border-amber-200 bg-amber-50"}>
                    {material.is_critical ? "CRITICAL" : "LOW"}
                  </Badge>
                </div>
              ))}
              {(!data.low_stock_materials || data.low_stock_materials.length === 0) && (
                <div className="text-center py-6 text-muted-foreground italic text-sm">
                  All materials are currently above threshold.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Site Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Logs</CardTitle>
              <CardDescription>Latest site activity summaries</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/site/operations?tab=logs')}>View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recent_logs?.map((log: any) => (
                <div key={log.id} className="border-l-2 border-primary pl-4 py-1 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate('/site/operations?tab=logs')}>
                  <p className="text-xs text-muted-foreground font-mono">{new Date(log.date).toLocaleDateString()}</p>
                  <p className="text-sm font-medium line-clamp-2 mt-1">{log.summary}</p>
                </div>
              ))}
              {(!data.recent_logs || data.recent_logs.length === 0) && (
                <div className="text-center py-6 text-muted-foreground italic text-sm">
                  No activity logs recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200 self-start">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="cursor-pointer group" onClick={() => navigate('/site/requests')}>
              <p className="text-sm font-bold text-amber-900 group-hover:underline">{data.pending_material_requests} Pending Requests</p>
              <p className="text-[10px] text-amber-700">Awaiting PM decision</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
