import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import CORS_ORIGINS
from app.core.database import create_tables

def create_app() -> FastAPI:
    # Ensure DB tables are created
    create_tables()

    app = FastAPI(
        title="Construction Management System API",
        version="1.0.0",
        description="Backend API for the Internal Construction Management System"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    def health_check():
        return {"status": "healthy"}

    return app

app = create_app()

def main():
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
