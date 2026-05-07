import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import Users from './pages/admin/Users';
import WorkerRoles from './pages/admin/WorkerRoles';
import Materials from './pages/admin/Materials';
import Workers from './pages/admin/Workers';
import WageRates from './pages/admin/WageRates';
import AuditLogs from './pages/admin/AuditLogs';

import Projects from './pages/pm/Projects';
import ProjectDetail from './pages/pm/ProjectDetail';
import Approvals from './pages/pm/Approvals';
import Monitoring from './pages/pm/Monitoring';
import AssignEngineer from './pages/pm/AssignEngineer';
import AssignWorkers from './pages/pm/AssignWorkers';
import AddPhase from './pages/pm/AddPhase';
import AddEstimate from './pages/pm/AddEstimate';

import Operations from './pages/se/Operations';
import SERequests from './pages/se/Requests';

import Transactions from './pages/finance/Transactions';
import Purchases from './pages/finance/Purchases';
import LaborCosts from './pages/finance/LaborCosts';
import FinanceOverview from './pages/finance/FinanceOverview';
import PendingItems from './pages/finance/PendingItems';
import ProjectFinancialDetail from './pages/finance/ProjectFinancialDetail';
import Reconciliation from './pages/finance/Reconciliation';

import Reports from './pages/Reports';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Admin Routes */}
          <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="master/roles" element={<ProtectedRoute allowedRoles={['admin']}><WorkerRoles /></ProtectedRoute>} />
          <Route path="master/materials" element={<ProtectedRoute allowedRoles={['admin']}><Materials /></ProtectedRoute>} />
          <Route path="master/workers" element={<ProtectedRoute allowedRoles={['admin']}><Workers /></ProtectedRoute>} />
          <Route path="master/wage-rates" element={<ProtectedRoute allowedRoles={['admin']}><WageRates /></ProtectedRoute>} />
          <Route path="audit" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />

          {/* PM Routes */}
          <Route path="projects" element={<ProtectedRoute allowedRoles={['admin', 'project_manager']}><Projects /></ProtectedRoute>} />
          <Route path="projects/:id" element={<ProtectedRoute allowedRoles={['admin', 'project_manager', 'accountant']}><ProjectDetail /></ProtectedRoute>} />
          <Route path="pm/approvals" element={<ProtectedRoute allowedRoles={['project_manager']}><Approvals /></ProtectedRoute>} />
          <Route path="pm/monitoring" element={<ProtectedRoute allowedRoles={['project_manager']}><Monitoring /></ProtectedRoute>} />
          <Route path="projects/:id/assign-engineer" element={<ProtectedRoute allowedRoles={['project_manager']}><AssignEngineer /></ProtectedRoute>} />
          <Route path="projects/:id/assign-workers" element={<ProtectedRoute allowedRoles={['project_manager']}><AssignWorkers /></ProtectedRoute>} />
          <Route path="projects/:id/add-phase" element={<ProtectedRoute allowedRoles={['project_manager']}><AddPhase /></ProtectedRoute>} />
          <Route path="projects/:id/add-estimate" element={<ProtectedRoute allowedRoles={['project_manager']}><AddEstimate /></ProtectedRoute>} />

          {/* SE Routes */}
          <Route path="site/operations" element={<ProtectedRoute allowedRoles={['site_engineer']}><Operations /></ProtectedRoute>} />
          <Route path="site/requests" element={<ProtectedRoute allowedRoles={['site_engineer']}><SERequests /></ProtectedRoute>} />

          {/* Accountant Routes */}
          <Route path="finance/transactions" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Transactions /></ProtectedRoute>} />
          <Route path="finance/purchases" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Purchases /></ProtectedRoute>} />
          <Route path="finance/labor" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><LaborCosts /></ProtectedRoute>} />
          <Route path="finance/pending" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><PendingItems /></ProtectedRoute>} />
          <Route path="finance/overview" element={<ProtectedRoute allowedRoles={['admin']}><FinanceOverview /></ProtectedRoute>} />
          <Route path="finance/projects/:id" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ProjectFinancialDetail /></ProtectedRoute>} />
          <Route path="finance/reconciliation" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><Reconciliation /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
