# Construction Management System

A comprehensive web-based platform for managing construction projects, operations, finances, and team coordination. Built with a modern tech stack combining FastAPI backend and React frontend.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The Construction Management System is designed to streamline project management, financial tracking, operations monitoring, and audit compliance for construction organizations. It provides role-based access for Project Managers, Site Engineers, Accountants, and Administrators with tailored dashboards and features for each role.

## ✨ Features

### Core Functionality
- **Project Management**: Create and manage construction projects with phases, timelines, and milestones
- **Financial Management**: Track expenses, materials, labor costs, and generate financial reports
- **Operations Monitoring**: Real-time site operations tracking, worker management, and attendance
- **User Management**: Role-based access control with multiple user types (Admin, PM, SE, Accountant)
- **Audit & Compliance**: Complete audit trails and system logs for compliance tracking
- **Master Data Management**: Materials, worker roles, wage rates, and wage management
- **Approvals Workflow**: Manage project approvals and estimates
- **Reporting**: Comprehensive dashboards and financial reports

### User Roles
- **Admin**: System administration, user management, and audit logs
- **Project Manager**: Project oversight, phase management, and approvals
- **Site Engineer**: Operations monitoring, worker coordination, and material tracking
- **Accountant**: Financial management, reconciliation, and reporting

## 🛠 Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT-based security
- **Server**: Uvicorn ASGI server

### Frontend
- **Framework**: [React 18](https://react.dev/) with TypeScript
- **Build Tool**: [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- **UI Components**: Custom component library with shadcn/ui
- **Styling**: CSS with Tailwind integration
- **Package Manager**: pnpm

### DevOps & Tools
- **Python Version Management**: pyenv
- **Node Version Management**: nvm (recommended)
- **Linting**: ESLint (frontend), Pylint (backend)

## 📁 Project Structure

```
construction_management_system/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/               # API endpoints (v1)
│   │   ├── core/              # Core configs and security
│   │   ├── models/            # Database models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utility functions
│   ├── db/                    # Database files
│   ├── uploads/               # File uploads directory
│   ├── pyproject.toml         # Python dependencies
│   └── seed.py                # Database seeding
│
├── frontend/                  # React + TypeScript application
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components by role
│   │   ├── store/             # State management
│   │   ├── lib/               # Utilities and API client
│   │   ├── hooks/             # Custom React hooks
│   │   └── assets/            # Static assets
│   ├── public/                # Public static files
│   ├── vite.config.ts         # Vite configuration
│   ├── tsconfig.json          # TypeScript configuration
│   └── package.json           # Node dependencies
│
└── README.md                  # This file
```

## 📦 Prerequisites

- **Python**: 3.8+
- **Node.js**: 16+ (or use nvm for version management)
- **pnpm**: 8+ (or npm/yarn)
- **PostgreSQL**: 12+ (for production)
- **Git**: For version control

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd construction_management_system
```

### 2. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .

# Create .env file (see backend/README.md for variables)
cp .env.example .env

# Run database migrations (if applicable)
python seed.py
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env file (see frontend/README.md for variables)
cp .env.example .env
```

## 🏃 Getting Started

### Run Backend Server

```bash
cd backend
source venv/bin/activate  # Activate virtual environment

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs` (Swagger UI)

### Run Frontend Development Server

```bash
cd frontend

# Start development server
pnpm dev
```

The application will be available at `http://localhost:5173` (or as shown in terminal output)

## 💻 Development

### Backend Development

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run tests
pytest

# Format code
black app/

# Lint code
pylint app/
```

### Frontend Development

```bash
cd frontend

# Start dev server with HMR
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linting
pnpm lint

# Format code
pnpm format
```

## 📚 API Documentation

### Swagger UI
Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### API Endpoints

The API is organized in `/backend/app/api/v1/` with the following main routes:

- `POST /auth/login` - User authentication
- `/users/` - User management
- `/projects/` - Project management
- `/finance/` - Financial operations
- `/operations/` - Operations tracking
- `/audit/` - Audit logs
- `/master-data/` - Master data management
- `/dashboard/` - Dashboard data

See backend API documentation for detailed endpoint specifications.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m 'Add your feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a Pull Request

Please ensure:
- Code follows project conventions
- Tests pass
- Linting checks pass
- Commit messages are clear and descriptive

## 📝 License

This project is proprietary and confidential. All rights reserved.

---

## 📞 Support

For issues, questions, or support, please contact the development team or open an issue in the repository.

## 🔗 Quick Links

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Architecture Overview](./synopsis.md)
