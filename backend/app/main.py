from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .database import engine, Base
from .models import user, client, project, action_type, account, viatico
from .routers import auth, admin, accounts, viaticos, reports
from .core.config import settings
from .core.security import hash_password
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(viaticos.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")

frontend_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


@app.on_event("startup")
def create_default_admin():
    db = Session(engine)
    try:
        from .models.user import User
        if not db.query(User).filter(User.is_admin == True).first():
            admin_user = User(
                nombre="Administrador",
                email="admin@viaticos.cl",
                password_hash=hash_password("admin1234"),
                is_admin=True,
            )
            db.add(admin_user)
            db.commit()
            print("OK Admin creado: admin@viaticos.cl / admin1234")
    finally:
        db.close()
