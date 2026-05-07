import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  FileText
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';

import api from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

// Modular Components
import { ProjectHeader } from './project-detail/ProjectHeader';
import { ProjectPostMortem } from './project-detail/ProjectPostMortem';
import { WorkersTab } from './project-detail/tabs/WorkersTab';
import { MaterialsTab } from './project-detail/tabs/MaterialsTab';
import { PhasesTab } from './project-detail/tabs/PhasesTab';
import { DocumentsTab } from './project-detail/tabs/DocumentsTab';
import { ApprovalsTab } from './project-detail/tabs/ApprovalsTab';
import { MonitoringTab } from './project-detail/tabs/MonitoringTab';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [workers, setWorkers] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projRes, workerRes, estRes, stockRes, phaseRes, reqRes, docRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/workers`),
        api.get(`/projects/${id}/material-estimates`),
        api.get(`/projects/${id}/materials/stock`),
        api.get(`/projects/${id}/phases`),
        user?.role === 'project_manager' ? api.get(`/pm/material-requests?project_id=${id}`) : Promise.resolve({ data: [] }),
        api.get(`/projects/${id}/documents`)
      ]);
      
      setProject(projRes.data);
      setWorkers(workerRes.data);
      setEstimates(estRes.data);
      setStock(stockRes.data);
      setPhases(phaseRes.data);
      setRequests(reqRes.data);
      setDocuments(docRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id, user?.role]);

  const handleStatusTransition = async (newStatus: string) => {
    try {
      const res = await api.patch(`/projects/${id}/status`, { status: newStatus });
      setProject(res.data);
      toast.success(`Project transitioned to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Transition failed');
    }
  };

  const handleRequestAction = async (reqId: number, status: 'approved' | 'rejected') => {
    try {
      await api.post(`/pm/material-requests/${reqId}/action`, { status });
      toast.success(`Request ${status} successfully`);
      setRequests(requests.filter(r => r.id !== reqId));
    } catch (err) {
      toast.error(`Failed to process request`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await api.post(`/projects/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocuments([res.data, ...documents]);
      toast.success('Document uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (docId: number, filename: string) => {
    const url = `${api.defaults.baseURL}/projects/${id}/documents/${docId}/download`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground font-medium animate-pulse">Synchronizing project lifecycle...</div>;
  if (!project) return <div className="p-8 text-center text-muted-foreground font-medium">Project footprint not found.</div>;

  const isDraft = project.status === 'draft';
  const isPlanning = project.status === 'planning';
  const isActive = project.status === 'active';
  const isCompleted = project.status === 'completed';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary" className="bg-slate-200 text-slate-700">Draft Mode</Badge>;
      case 'planning': return <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">Planning Mode</Badge>;
      case 'active': return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Active Execution</Badge>;
      case 'completed': return <Badge className="bg-purple-600 text-white">Project Completed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // --- DERIVED INSIGHTS ---
  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const today = new Date();
  
  const totalDays = differenceInDays(endDate, startDate) || 1;
  const elapsedDays = Math.max(0, differenceInDays(today, startDate));
  const expectedProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  const actualProgress = project?.progress_percentage || 0;
  
  const timelineStatus = actualProgress >= (expectedProgress - 5) 
    ? (actualProgress > expectedProgress + 5 ? 'AHEAD' : 'ON TRACK') 
    : 'DELAYED';

  const isOverBudget = (project?.total_spent || 0) > (project?.budget || 0);
  const isCritical = timelineStatus === 'DELAYED' && isOverBudget;

  const projectHealth = isCritical ? 'CRITICAL' : (timelineStatus === 'DELAYED' || isOverBudget ? 'AT RISK' : 'ON TRACK');
  const healthColor = projectHealth === 'CRITICAL' ? 'text-destructive' : (projectHealth === 'AT RISK' ? 'text-amber-600' : 'text-emerald-600');
  const healthBg = projectHealth === 'CRITICAL' ? 'bg-destructive/10' : (projectHealth === 'AT RISK' ? 'bg-amber-50' : 'bg-emerald-50');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <ProjectHeader 
        project={project}
        isDraft={isDraft}
        isPlanning={isPlanning}
        isActive={isActive}
        isCompleted={isCompleted}
        projectHealth={projectHealth}
        healthColor={healthColor}
        healthBg={healthBg}
        getStatusBadge={getStatusBadge}
        handleStatusTransition={handleStatusTransition}
      />

      {isDraft && (
        <Alert className="bg-slate-50 border-slate-200">
          <AlertCircle className="h-4 w-4 text-slate-500" />
          <AlertTitle className="text-slate-700">Project in Draft</AlertTitle>
          <AlertDescription className="text-slate-600">
            This project is currently a skeleton. Start planning to assign engineers, workers, and materials.
          </AlertDescription>
        </Alert>
      )}

      {isCompleted && (
        <ProjectPostMortem 
          project={project}
          totalDays={totalDays}
          workersCount={workers.length}
          phasesCount={phases.length}
          isOverBudget={isOverBudget}
        />
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-3">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-muted/50 border">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="workers" disabled={isDraft}>Workers</TabsTrigger>
              <TabsTrigger value="materials" disabled={isDraft}>Materials</TabsTrigger>
              <TabsTrigger value="phases" disabled={isDraft}>Phases</TabsTrigger>
              <TabsTrigger value="docs" disabled={isDraft}>Documents</TabsTrigger>
              <TabsTrigger value="approvals" disabled={!isActive} className="relative">
                Approvals 
                {isActive && requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
                    {requests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="monitoring" disabled={isDraft}>Monitoring</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Project Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{project.description || "No project description available."}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Managed By</p>
                      <p className="font-semibold">{project.project_manager_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Site Engineer</p>
                      <p className="font-semibold text-primary">{project.site_engineer_name || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Total Budget</p>
                      <p className="font-black text-emerald-700">₹{project.budget.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workers" className="mt-4">
              <WorkersTab 
                projectId={id!}
                workers={workers}
                isPlanning={isPlanning}
                isDraft={isDraft}
              />
            </TabsContent>

            <TabsContent value="materials" className="mt-4">
              <MaterialsTab 
                projectId={id!}
                estimates={estimates}
                stock={stock}
                isPlanning={isPlanning}
                isDraft={isDraft}
                isActive={isActive}
                isCompleted={isCompleted}
              />
            </TabsContent>

            <TabsContent value="phases" className="mt-4">
              <PhasesTab 
                projectId={id!}
                phases={phases}
                isPlanning={isPlanning}
                isDraft={isDraft}
                isCompleted={isCompleted}
              />
            </TabsContent>

            <TabsContent value="docs" className="mt-4">
              <DocumentsTab 
                documents={documents}
                uploading={uploading}
                handleFileUpload={handleFileUpload}
                handleDownload={handleDownload}
              />
            </TabsContent>

            <TabsContent value="approvals" className="mt-4">
              <ApprovalsTab 
                project={project}
                requests={requests}
                handleRequestAction={handleRequestAction}
              />
            </TabsContent>

            <TabsContent value="monitoring" className="mt-4">
              <MonitoringTab 
                project={project}
                healthBg={healthBg}
                healthColor={healthColor}
                projectHealth={projectHealth}
                timelineStatus={timelineStatus}
                expectedProgress={expectedProgress}
                actualProgress={actualProgress}
                isOverBudget={isOverBudget}
                workersCount={workers.length}
                phases={phases}
                stock={stock}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
