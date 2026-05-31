from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, aiofiles
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.client import Client
from ..models.project import Project
from ..models.action_type import ActionType
from ..models.viatico import Viatico, ViaticoMovement, ViaticoStatus
from ..schemas.viatico import (
    ViaticoCreate, ViaticoOut, ViaticoClose,
    ViaticoMovementCreate, ViaticoMovementUpdate, ViaticoMovementOut,
)
from ..schemas.client import ClientOut
from ..schemas.project import ProjectOut
from ..schemas.action_type import ActionTypeOut
from .auth import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/viaticos", tags=["viáticos"])


def _calc_viatico(v: Viatico) -> tuple[float, float]:
    total = sum(m.monto for m in v.movements)
    saldo = v.monto_asignado - total
    return saldo, total


def _active_viatico(user: User, db: Session) -> Viatico:
    v = db.query(Viatico).filter(Viatico.user_id == user.id, Viatico.status == ViaticoStatus.activo).first()
    if not v:
        raise HTTPException(status_code=404, detail="No hay viático activo")
    return v


def _build_out(v: Viatico) -> ViaticoOut:
    saldo, total = _calc_viatico(v)
    data = {
        "id": v.id,
        "user_id": v.user_id,
        "client_id": v.client_id,
        "project_id": v.project_id,
        "action_type_id": v.action_type_id,
        "client_nombre": v.client.nombre if v.client else "",
        "project_nombre": v.project.nombre if v.project else "",
        "action_type_nombre": v.action_type.nombre if v.action_type else "",
        "monto_asignado": v.monto_asignado,
        "status": v.status,
        "fecha_inicio": v.fecha_inicio,
        "fecha_cierre": v.fecha_cierre,
        "observaciones": v.observaciones,
        "saldo_actual": saldo,
        "total_gastos": total,
        "movements": v.movements,
    }
    return ViaticoOut.model_validate(data)


# ── Listas de selección para el usuario ───────────────────────────────────────

@router.get("/select/clients", response_model=List[ClientOut])
def select_clients(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Client).filter(Client.is_active == True).all()


@router.get("/select/projects", response_model=List[ProjectOut])
def select_projects(client_id: Optional[int] = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Project).filter(Project.is_active == True)
    if client_id:
        q = q.filter(Project.client_id == client_id)
    return q.all()


@router.get("/select/action-types", response_model=List[ActionTypeOut])
def select_action_types(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(ActionType).filter(ActionType.is_active == True).all()


# ── CRUD viático ──────────────────────────────────────────────────────────────

@router.post("", response_model=ViaticoOut, status_code=status.HTTP_201_CREATED)
def create_viatico(data: ViaticoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Viatico).filter(Viatico.user_id == current_user.id, Viatico.status == ViaticoStatus.activo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes un viático activo")
    for model, fid, label in [
        (Client, data.client_id, "Cliente"),
        (Project, data.project_id, "Proyecto"),
        (ActionType, data.action_type_id, "Tipo de acción"),
    ]:
        if not db.query(model).filter(model.id == fid).first():
            raise HTTPException(status_code=404, detail=f"{label} no encontrado")
    v = Viatico(
        user_id=current_user.id,
        client_id=data.client_id,
        project_id=data.project_id,
        action_type_id=data.action_type_id,
        monto_asignado=data.monto_asignado,
        fecha_inicio=data.fecha_inicio or datetime.utcnow(),
        observaciones=data.observaciones,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return _build_out(v)


@router.get("/active", response_model=Optional[ViaticoOut])
def get_active_viatico(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = db.query(Viatico).filter(Viatico.user_id == current_user.id, Viatico.status == ViaticoStatus.activo).first()
    if not v:
        return None
    return _build_out(v)


@router.get("", response_model=List[ViaticoOut])
def list_viaticos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    viaticos = db.query(Viatico).filter(Viatico.user_id == current_user.id).order_by(Viatico.fecha_inicio.desc()).all()
    return [_build_out(v) for v in viaticos]


@router.post("/active/close", response_model=ViaticoOut)
def close_viatico(data: ViaticoClose, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = _active_viatico(current_user, db)
    v.status = ViaticoStatus.cerrado
    v.fecha_cierre = datetime.utcnow()
    if data.observaciones:
        v.observaciones = data.observaciones
    db.commit()
    db.refresh(v)
    return _build_out(v)


# ── Movimientos del viático ───────────────────────────────────────────────────

@router.post("/active/movements", response_model=ViaticoMovementOut, status_code=status.HTTP_201_CREATED)
def add_movement(data: ViaticoMovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.tipo not in ("giro", "gasto"):
        raise HTTPException(status_code=400, detail="Tipo debe ser: giro o gasto")
    v = _active_viatico(current_user, db)
    mv = ViaticoMovement(
        viatico_id=v.id,
        tipo=data.tipo,
        concepto=data.concepto,
        monto=data.monto,
        fecha=data.fecha or datetime.utcnow(),
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


@router.put("/movements/{mv_id}", response_model=ViaticoMovementOut)
def update_movement(mv_id: int, data: ViaticoMovementUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mv = db.query(ViaticoMovement).filter(ViaticoMovement.id == mv_id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    if mv.viatico.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permiso")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(mv, field, value)
    db.commit()
    db.refresh(mv)
    return mv


@router.delete("/movements/{mv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movement(mv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mv = db.query(ViaticoMovement).filter(ViaticoMovement.id == mv_id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    if mv.viatico.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permiso")
    db.delete(mv)
    db.commit()


@router.post("/movements/{mv_id}/foto", response_model=ViaticoMovementOut)
async def upload_foto(mv_id: int, foto: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mv = db.query(ViaticoMovement).filter(ViaticoMovement.id == mv_id).first()
    if not mv or mv.viatico.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    ext = os.path.splitext(foto.filename)[1] or ".jpg"
    filename = f"viat_{mv_id}_{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.UPLOADS_DIR, filename)
    os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
    async with aiofiles.open(path, "wb") as f:
        await f.write(await foto.read())
    mv.foto_path = filename
    db.commit()
    db.refresh(mv)
    return mv
