import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Activity, Search, Shield, User as UserIcon, Clock, Globe } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  timestamp: string;
}

interface AuditLogResponse {
  total: number;
  logs: AuditLog[];
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get<AuditLogResponse>('/audit', {
        params: {
          page,
          action: actionFilter || undefined,
          page_size: 20
        }
      });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all security events and critical system actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by action..."
              className="h-9 w-[200px] rounded-md border border-input bg-transparent px-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Action</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">IP Address</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Details</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="font-medium uppercase">{log.action}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{log.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{log.ip_address || 'Internal'}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle max-w-[300px] truncate">
                      <span className="text-xs text-muted-foreground">
                        {log.entity_type ? `${log.entity_type} #${log.entity_id}` : ''} {log.details}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {logs.length} of {total} entries
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium">Page {page}</span>
          <button
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < 20}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
