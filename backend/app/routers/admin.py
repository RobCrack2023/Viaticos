from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.client import Client
from ..models.project import Project
from ..models.action_type import ActionType
from ..schemas.user import UserCreate, UserUpdate, UserOut
from ..schemas.client import ClientCreate, ClientUpdate, ClientOut
from ..schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from ..schemas.action_type import ActionTypeCreate, ActionTypeUpdate, ActionTypeOut
from ..core.security import hash_password
from .auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Usuarios ──────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user = User(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        is_admin=data.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if data.nombre is not None:
        user.nombre = data.nombre
    if data.email is not None:
        user.email = data.email
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    if data.is_admin is not None:
        user.is_admin = data.is_admin
    if data.is_active is not None:
        user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user


# ── Clientes ──────────────────────────────────────────────────────────────────

@router.get("/clients", response_model=List[ClientOut])
def list_clients(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(Client).all()


@router.post("/clients", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(data: ClientCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    client = Client(**data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.put("/clients/{client_id}", response_model=ClientOut)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


# ── Proyectos ─────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[ProjectOut])
def list_projects(client_id: int = None, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    q = db.query(Project)
    if client_id:
        q = q.filter(Project.client_id == client_id)
    return q.all()


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if not db.query(Client).filter(Client.id == data.client_id).first():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    project = Project(**data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


# ── Tipos de Acción ───────────────────────────────────────────────────────────

@router.get("/action-types", response_model=List[ActionTypeOut])
def list_action_types(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(ActionType).all()


@router.post("/action-types", response_model=ActionTypeOut, status_code=status.HTTP_201_CREATED)
def create_action_type(data: ActionTypeCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    at = ActionType(**data.model_dump())
    db.add(at)
    db.commit()
    db.refresh(at)
    return at


@router.put("/action-types/{at_id}", response_model=ActionTypeOut)
def update_action_type(at_id: int, data: ActionTypeUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    at = db.query(ActionType).filter(ActionType.id == at_id).first()
    if not at:
        raise HTTPException(status_code=404, detail="Tipo de acción no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(at, field, value)
    db.commit()
    db.refresh(at)
    return at
