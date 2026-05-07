import { useAuthStore } from '../store/auth';
import AdminDashboard from './dashboard/AdminDashboard';
import PMDashboard from './dashboard/PMDashboard';
import SEDashboard from './dashboard/SEDashboard';
import AccountantDashboard from './dashboard/AccountantDashboard';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.full_name}. Here's what's happening today.
        </p>
      </div>

      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'project_manager' && <PMDashboard />}
      {user?.role === 'site_engineer' && <SEDashboard />}
      {user?.role === 'accountant' && <AccountantDashboard />}
    </div>
  );
}
