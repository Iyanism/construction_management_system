from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .master_data import router as master_data_router
from .projects import router as projects_router
from .operations import router as operations_router
from .finance import router as finance_router
from .dashboard import router as dashboard_router
from .reports import router as reports_router
from .pm import router as pm_router
from .se import router as se_router
from .audit import router as audit_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(master_data_router)
api_router.include_router(se_router)
api_router.include_router(projects_router)
api_router.include_router(operations_router)
api_router.include_router(finance_router)
api_router.include_router(dashboard_router)
api_router.include_router(reports_router)
api_router.include_router(pm_router)
api_router.include_router(audit_router)
