import React from "react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { ArrowLeft, Building2, MapPin, Calendar, PlayCircle, Rocket, CheckCircle2, Lock } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProjectHeaderProps {
  project: any;
  isDraft: boolean;
  isPlanning: boolean;
  isActive: boolean;
  isCompleted: boolean;
  projectHealth: string;
  healthColor: string;
  healthBg: string;
  getStatusBadge: (status: string) => React.ReactNode;
  handleStatusTransition: (status: string) => void;
}

export function ProjectHeader({
  project,
  isDraft,
  isPlanning,
  isActive,
  isCompleted,
  projectHealth,
  healthColor,
  healthBg,
  getStatusBadge,
  handleStatusTransition
}: ProjectHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between bg-card p-6 border rounded-xl shadow-sm">
      <div className="flex items-start gap-4 flex-1">
        <Button variant="outline" size="icon" onClick={() => navigate('/projects')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex gap-2">
              {getStatusBadge(project.status)}
              <Badge variant="outline" className={`${healthBg} ${healthColor} border-current border-dashed animate-pulse uppercase text-[10px]`}>
                HEALTH: {projectHealth}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {project.client_name}</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {project.location}</span>
            <span className="flex items-center gap-1 font-medium text-primary">
              <Calendar className="h-4 w-4" /> 
              {format(new Date(project.start_date), 'MMM dd')} - {format(new Date(project.end_date), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* LIFECYCLE CONTROLS */}
      <div className="flex items-center gap-3 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
        {(isDraft || isPlanning) && (
          <Button variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => navigate(`/projects/${project.id}/assign-engineer`)}>
            Assign Site Engineer
          </Button>
        )}
        {isDraft && (
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusTransition('planning')}>
            <PlayCircle className="mr-2 h-4 w-4" /> Start Planning
          </Button>
        )}
        {isPlanning && (
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusTransition('active')}>
            <Rocket className="mr-2 h-4 w-4" /> Activate Project
          </Button>
        )}
        {isActive && (
          <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50" onClick={() => handleStatusTransition('completed')}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Project
          </Button>
        )}
        {isCompleted && (
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Lock className="h-3 w-3" /> Archive Ready
          </div>
        )}
      </div>
    </div>
  );
}
