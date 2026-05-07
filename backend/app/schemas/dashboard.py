"""Dashboard schemas for role-specific dashboard data."""


from pydantic import BaseModel


class AdminDashboard(BaseModel):
    # Section 1
    total_users: int
    active_projects: int
    total_projects: int
    total_workers: int
    total_budget: float
    total_spent: float
    # Section 2 (Action Signals)
    projects_over_budget: int
    projects_delayed: int
    pending_material_requests: int
    workers_unassigned: int
    # Section 3 (System Health)
    completed_projects: int
    # Section 4 (Recent Activity)
    recent_activity: dict


class PMDashboard(BaseModel):
    my_projects: int
    active_projects: int
    draft_projects: int
    planning_projects: int
    completed_projects: int
    pending_material_requests: int
    projects_over_budget: int
    delayed_projects: int
    critical_projects: int = 0
    at_risk_projects: int = 0
    overall_progress: float
    projects: list[dict]
    pending_requests_list: list[dict] = []


class SEDashboard(BaseModel):
    assigned_project_id: int | None
    assigned_project_name: str | None
    assigned_project_status: str | None
    active_phase_id: int | None = None
    active_phase_name: str | None = None
    total_assigned_workers: int
    todays_attendance_marked: bool
    todays_log_exists: bool
    todays_material_usage_exists: bool = False
    pending_material_requests: int
    low_stock_count: int = 0
    low_stock_materials: list[dict] = []
    recent_logs: list[dict]


class AccountantDashboard(BaseModel):
    total_active_projects: int
    total_budget: float
    total_spent: float
    total_remaining: float
    pending_payments: int
    recent_transactions: list[dict]
    projects_over_budget: int
