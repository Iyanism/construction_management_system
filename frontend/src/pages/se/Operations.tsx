import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HardHat, CheckSquare, FileText, Package, Plus, LayoutList } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../lib/api';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import { AttendanceTab } from './operations/AttendanceTab';
import { LogsTab } from './operations/LogsTab';
import { UsageTab } from './operations/UsageTab';
import { RequestsTab } from './operations/RequestsTab';
import { ProgressTab } from './operations/ProgressTab';

export default function SiteOperations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'attendance';

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard/site-engineer');
      setDashboard(res.data);
    } catch (err) {
      toast.error('Failed to load site details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading operations...</div>;

  if (!dashboard || !dashboard.assigned_project_id) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="bg-muted p-6 rounded-full">
          <HardHat className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">No Active Site Assignment</h2>
        <p className="text-muted-foreground max-w-md">
          You are currently not assigned to any active project. Please contact your Project Manager.
        </p>
      </div>
    );
  }

  const projectId = dashboard.assigned_project_id;
  const isCompleted = dashboard.assigned_project_status === 'completed';

  const steps = [
    { id: 'attendance', label: 'Attendance', status: dashboard.todays_attendance_marked, icon: CheckSquare },
    { id: 'logs', label: 'Daily Logs', status: dashboard.todays_log_exists, icon: FileText },
    { id: 'usage', label: 'Material Usage', status: dashboard.todays_material_usage_exists, icon: Package },
    { id: 'progress', label: 'Progress', status: true, icon: LayoutList },
    { id: 'requests', label: 'Requests', status: true, icon: Plus },
  ];

  const nextAction = steps.find(s => !s.status && s.id !== 'requests' && s.id !== 'progress');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Operations</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <span className="font-medium text-foreground">{dashboard.assigned_project_name}</span>
            {isCompleted ? (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 px-2 py-0">Completed Project</Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-2 py-0">Active Site</Badge>
            )}
          </p>
        </div>

        {!isCompleted && nextAction && (
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-xs font-black uppercase text-primary">Next Action:</span>
            <span className="text-sm font-bold">{nextAction.label}</span>
          </div>
        )}
      </div>

      {/* Today Context Strip */}
      <div className="bg-muted/50 border rounded-2xl p-4 flex flex-wrap items-center gap-6">
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Today's Date</p>
          <p className="font-bold text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="h-8 w-px bg-border hidden sm:block"></div>
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Phase</p>
          <div className="flex items-center gap-2">
            <LayoutList className="h-3.5 w-3.5 text-primary" />
            <p className="font-bold text-sm text-primary">{dashboard.active_phase_name || "No phase in progress"}</p>
          </div>
        </div>
        {!isCompleted && dashboard.low_stock_count > 0 && (
          <div className="ml-auto flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-100">
            <Package className="h-4 w-4 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-tight">{dashboard.low_stock_count} Low Stock Alerts</span>
          </div>
        )}
      </div>

      {/* Today Status Strip */}
      <div className="grid grid-cols-3 gap-2">
        {steps.filter(s => s.id !== 'requests' && s.id !== 'progress').map(step => (
          <div
            key={step.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${step.status ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-muted/50 border-transparent text-muted-foreground'}`}
          >
            {step.status ? <CheckSquare className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
            <span className="text-xs font-bold uppercase tracking-tighter">{step.label}</span>
          </div>
        ))}
      </div>

      {isCompleted && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm flex items-center gap-3">
          <HardHat className="h-5 w-5 shrink-0" />
          <p>This project is completed. All site operations are in <strong>read-only</strong> mode.</p>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5 h-12 items-center rounded-xl bg-muted p-1 text-muted-foreground">
          {steps.map(step => (
            <TabsTrigger
              key={step.id}
              value={step.id}
              className="flex gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <step.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.label}</span>
              {step.id !== 'requests' && step.id !== 'progress' && step.status && <CheckSquare className="h-3 w-3 text-emerald-500" />}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceTab projectId={projectId} readOnly={isCompleted} onActionComplete={fetchDashboard} />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogsTab 
            projectId={projectId} 
            readOnly={isCompleted} 
            onActionComplete={fetchDashboard}
            defaultPhaseId={dashboard.active_phase_id}
          />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsageTab 
            projectId={projectId} 
            readOnly={isCompleted} 
            onActionComplete={fetchDashboard}
            defaultPhaseId={dashboard.active_phase_id}
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <ProgressTab projectId={projectId} readOnly={isCompleted} onActionComplete={fetchDashboard} />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <RequestsTab projectId={projectId} readOnly={isCompleted} onActionComplete={fetchDashboard} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
