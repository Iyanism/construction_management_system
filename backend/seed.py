import logging
from datetime import date, timedelta

from app.core.database import SessionLocal, create_tables
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.master_data import WorkerRole, WageRate, MaterialCatalog, Worker
from app.models.project import Project, ProjectStatus, ProjectWorkerAssignment, ProjectMaterialEstimate, ProjectMaterialStock, ProjectPhase, PhaseStatus
from app.models.finance import MaterialPurchase, FinancialTransaction, TransactionCategory, PaymentStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_db():
    create_tables()
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            logger.info("Database already seeded.")
            return

        logger.info("Seeding users...")
        users = [
            User(email="admin@cms.com", full_name="Alice Admin", password_hash=hash_password("admin123"), role=UserRole.admin),
            User(email="pm@cms.com", full_name="Bob Manager", password_hash=hash_password("pm123"), role=UserRole.project_manager),
            User(email="se@cms.com", full_name="Charlie Engineer", password_hash=hash_password("se123"), role=UserRole.site_engineer),
            User(email="acc@cms.com", full_name="Diana Accountant", password_hash=hash_password("acc123"), role=UserRole.accountant),
        ]
        db.add_all(users)
        db.commit()

        logger.info("Seeding master data...")
        roles = [
            WorkerRole(name="Mason", description="Brick and concrete work"),
            WorkerRole(name="Laborer", description="General site labor"),
            WorkerRole(name="Electrician", description="Wiring and electrical installations"),
            WorkerRole(name="Plumber", description="Pipe and plumbing work"),
            WorkerRole(name="Carpenter", description="Woodwork and scaffolding"),
        ]
        db.add_all(roles)
        db.commit()
        for r in roles:
            db.refresh(r)

        today = date.today()
        rates = [
            WageRate(worker_role_id=roles[0].id, daily_rate=800, effective_from=today - timedelta(days=365)),
            WageRate(worker_role_id=roles[1].id, daily_rate=500, effective_from=today - timedelta(days=365)),
            WageRate(worker_role_id=roles[2].id, daily_rate=900, effective_from=today - timedelta(days=365)),
            WageRate(worker_role_id=roles[3].id, daily_rate=850, effective_from=today - timedelta(days=365)),
            WageRate(worker_role_id=roles[4].id, daily_rate=750, effective_from=today - timedelta(days=365)),
        ]
        db.add_all(rates)

        materials = [
            MaterialCatalog(name="Portland Cement", unit="bags", unit_price=450, category="Cement"),
            MaterialCatalog(name="TMT Steel 12mm", unit="kg", unit_price=65, category="Steel"),
            MaterialCatalog(name="River Sand", unit="cubic meters", unit_price=1200, category="Aggregate"),
            MaterialCatalog(name="Bricks (Red)", unit="pieces", unit_price=8, category="Masonry"),
            MaterialCatalog(name="Electrical Wire 2.5mm", unit="meters", unit_price=25, category="Electrical"),
        ]
        db.add_all(materials)

        workers = []
        for i in range(5):
            workers.append(Worker(name=f"Mason Worker {i+1}", worker_role_id=roles[0].id))
        for i in range(10):
            workers.append(Worker(name=f"Laborer {i+1}", worker_role_id=roles[1].id))
        for i in range(2):
            workers.append(Worker(name=f"Electrician {i+1}", worker_role_id=roles[2].id))
        for i in range(2):
            workers.append(Worker(name=f"Plumber {i+1}", worker_role_id=roles[3].id))
        for i in range(3):
            workers.append(Worker(name=f"Carpenter {i+1}", worker_role_id=roles[4].id))
        db.add_all(workers)
        db.commit()

        logger.info("Seeding projects...")
        project1 = Project(
            name="Green Valley Heights",
            client_name="EcoBuilders Inc.",
            location="Plot 42, North City",
            description="A 5-story residential complex.",
            start_date=today - timedelta(days=60),
            end_date=today + timedelta(days=120),
            budget=5000000,
            status=ProjectStatus.active,
            project_manager_id=users[1].id,
            site_engineer_id=users[2].id,
            created_by=users[1].id,
        )
        
        project2 = Project(
            name="Sunrise Commercial Park",
            client_name="Sunrise Group",
            location="Downtown Business District",
            description="Commercial office space renovation.",
            start_date=today - timedelta(days=200),
            end_date=today - timedelta(days=10),
            budget=2500000,
            status=ProjectStatus.completed,
            project_manager_id=users[1].id,
            site_engineer_id=users[2].id,
            created_by=users[1].id,
        )
        
        project3 = Project(
            name="Lakeside Villa",
            client_name="Mr. Smith",
            location="Lake View Road",
            start_date=today + timedelta(days=15),
            end_date=today + timedelta(days=90),
            budget=1500000,
            status=ProjectStatus.planning,
            project_manager_id=users[1].id,
            created_by=users[1].id,
        )
        
        db.add_all([project1, project2, project3])
        db.commit()
        db.refresh(project1)

        # Add phases
        phases = [
            ProjectPhase(project_id=project1.id, name="Foundation", order=1, status=PhaseStatus.completed),
            ProjectPhase(project_id=project1.id, name="Structure", order=2, status=PhaseStatus.in_progress),
            ProjectPhase(project_id=project1.id, name="Electrical & Plumbing", order=3, status=PhaseStatus.pending),
            ProjectPhase(project_id=project1.id, name="Finishing", order=4, status=PhaseStatus.pending),
        ]
        db.add_all(phases)
        
        # Add material estimates & stock for project 1
        estimates = [
            ProjectMaterialEstimate(project_id=project1.id, material_id=materials[0].id, estimated_quantity=1000), # Cement
            ProjectMaterialEstimate(project_id=project1.id, material_id=materials[1].id, estimated_quantity=5000), # Steel
        ]
        db.add_all(estimates)
        
        stocks = [
            ProjectMaterialStock(project_id=project1.id, material_id=materials[0].id, quantity_available=200, quantity_used=300),
            ProjectMaterialStock(project_id=project1.id, material_id=materials[1].id, quantity_available=1000, quantity_used=1500),
        ]
        db.add_all(stocks)

        logger.info("Seeding operations data...")
        # Assign workers to active project
        # 2 Masons, 5 Laborers
        for i in range(2):
            w = workers[i]
            w.status = "assigned"
            db.add(ProjectWorkerAssignment(project_id=project1.id, worker_id=w.id))
        
        for i in range(5, 10):
            w = workers[i]
            w.status = "assigned"
            db.add(ProjectWorkerAssignment(project_id=project1.id, worker_id=w.id))
            
        db.commit()
        
        # Finance records
        purchase = MaterialPurchase(
            project_id=project1.id, material_id=materials[0].id, quantity=500, unit_price=450, total_cost=225000, date=today - timedelta(days=30), recorded_by=users[3].id
        )
        db.add(purchase)
        db.flush()
        
        tx = FinancialTransaction(
            project_id=project1.id, category=TransactionCategory.material_purchase, description="Initial cement purchase", amount=225000, date=today - timedelta(days=30), payment_status=PaymentStatus.paid, reference_id=purchase.id, reference_type="material_purchase", recorded_by=users[3].id
        )
        db.add(tx)
        
        db.commit()
        logger.info("Database seeded successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
