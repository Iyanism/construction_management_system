import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { Button } from '../ui/button';
import {
  LogOut, LayoutDashboard, Users, HardHat, Package,
  FolderKanban, UserCog, DollarSign, Activity, IndianRupee, FileText,
  TrendingUp, CheckCircle2, ClipboardList,
  Clock, ShieldCheck, Shield
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <Outlet />;
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');
    return (
      <Link to={to} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
        <Icon size={18} />
        <span className="font-medium text-sm">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b h-16 flex items-center shrink-0">
          <HardHat className="text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">CMS Portal</span>
        </div>

        <div className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">
          {user.role === 'admin' && (
            <>
              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground uppercase">Oversight</h2>
                <div className="space-y-1">
                  <NavItem to="/dashboard" icon={LayoutDashboard} label="Admin Dashboard" />
                  <NavItem to="/projects" icon={FolderKanban} label="Project Oversight" />
                  <NavItem to="/finance/overview" icon={TrendingUp} label="System Financial Overview" />
                  <NavItem to="/reports" icon={FileText} label="System Reports" />
                  <NavItem to="/audit" icon={Shield} label="System Audit Logs" />
                </div>
              </div>

              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground uppercase">Resource Management</h2>
                <div className="space-y-1">
                  <NavItem to="/users" icon={UserCog} label="User Management" />
                  <NavItem to="/master/workers" icon={HardHat} label="Worker Management" />
                  <NavItem to="/master/materials" icon={Package} label="Material Catalog" />
                  <NavItem to="/master/roles" icon={Users} label="Worker Roles" />
                  <NavItem to="/master/wage-rates" icon={IndianRupee} label="Wage Rates" />
                </div>
              </div>
            </>
          )}

          {user.role === 'project_manager' && (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="PM Dashboard" />
              <NavItem to="/projects" icon={FolderKanban} label="My Projects" />
              <NavItem to="/pm/approvals" icon={CheckCircle2} label="Approvals" />
              <NavItem to="/pm/monitoring" icon={Activity} label="Monitoring" />
            </>
          )}

          {user.role === 'site_engineer' && (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Site Dashboard" />
              <NavItem to="/site/operations" icon={Activity} label="Site Operations" />
              <NavItem to="/site/requests" icon={ClipboardList} label="Material Requests" />
            </>
          )}

          {user.role === 'accountant' && (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Operations Dashboard" />
              <NavItem to="/finance/pending" icon={Clock} label="Pending Items" />
              <NavItem to="finance/reconciliation" icon={ShieldCheck} label="Reconciliation" />
              <NavItem to="/finance/transactions" icon={DollarSign} label="Ledger Transactions" />
              <NavItem to="/finance/labor" icon={Users} label="Labor Costs" />
              <NavItem to="/finance/purchases" icon={Package} label="Purchases" />
            </>
          )}
        </div>

        <div className="p-4 border-t shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.full_name}</span>
              <span className="text-xs text-muted-foreground capitalize truncate">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive shrink-0">
            <LogOut size={18} />
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
