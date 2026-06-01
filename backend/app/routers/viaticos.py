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
from ..models.movement_photo import MovementPhoto
from ..schemas.viatico import (
    ViaticoCreate, ViaticoOut, ViaticoClose, ViaticoEdit, ViaticoAdicional,
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
        "monto_asignado":  v.monto_asignado,
        "monto_adicional": v.monto_adicional or 0.0,
        "editado":         v.editado or 0,
        "status":          v.status,
        "created_at":      v.created_at,
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


@router.put("/active/edit", response_model=ViaticoOut)
def edit_viatico(data: ViaticoEdit, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = _active_viatico(current_user, db)
    if v.editado:
        raise HTTPException(status_code=400, detail="El viático ya fue editado anteriormente. Solo se permite una edición.")
    # Validar referencias si se cambian
    if data.client_id:
        if not db.query(Client).filter(Client.id == data.client_id).first():
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        v.client_id = data.client_id
    if data.project_id:
        if not db.query(Project).filter(Project.id == data.project_id).first():
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        v.project_id = data.project_id
    if data.action_type_id:
        if not db.query(ActionType).filter(ActionType.id == data.action_type_id).first():
            raise HTTPException(status_code=404, detail="Tipo de acción no encontrado")
        v.action_type_id = data.action_type_id
    if data.fecha_inicio:
        v.fecha_inicio = data.fecha_inicio
    if data.monto_asignado is not None:
        total_gastado = sum(m.monto for m in v.movements)
        if data.monto_asignado < total_gastado:
            raise HTTPException(status_code=400, detail=f"El monto no puede ser menor a lo ya gastado ({total_gastado:,.0f})")
        v.monto_asignado = data.monto_asignado
    if data.observaciones is not None:
        v.observaciones = data.observaciones
    v.editado = 1
    db.commit()
    db.refresh(v)
    return _build_out(v)


@router.post("/active/adicional", response_model=ViaticoOut)
def add_adicional(data: ViaticoAdicional, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.monto <= 0:
        raise HTTPException(status_code=400, detail="El monto adicional debe ser mayor a cero")
    v = _active_viatico(current_user, db)
    v.monto_asignado  += data.monto
    v.monto_adicional  = (v.monto_adicional or 0) + data.monto
    if data.motivo:
        v.observaciones = (v.observaciones or "") + f"\n[Adicional ${data.monto:,.0f}: {data.motivo}]"
    db.commit()
    db.refresh(v)
    return _build_out(v)


@router.post("/active/close", response_model=ViaticoOut)
def close_viatico(data: ViaticoClose, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = _active_viatico(current_user, db)
    fecha_cierre = datetime.utcnow()
    # Validar que cierre no sea anterior a inicio
    if fecha_cierre.date() < v.fecha_inicio.date():
        raise HTTPException(
            status_code=400,
            detail=f"La fecha de cierre ({fecha_cierre.strftime('%d/%m/%Y')}) no puede ser anterior a la fecha de inicio ({v.fecha_inicio.strftime('%d/%m/%Y')})"
        )
    v.status = ViaticoStatus.cerrado
    v.fecha_cierre = fecha_cierre
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


@router.get("/movements/{mv_id}/fotos")
def list_fotos_viatico(mv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mv = db.query(ViaticoMovement).filter(ViaticoMovement.id == mv_id).first()
    if not mv or mv.viatico.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    photos = db.query(MovementPhoto).filter(MovementPhoto.movement_type=="viatico", MovementPhoto.movement_id==mv_id).all()
    all_fotos = []
    if mv.foto_path: all_fotos.append({"id": 0, "path": mv.foto_path})
    all_fotos += [{"id": p.id, "path": p.foto_path} for p in photos]
    return all_fotos


@router.post("/movements/{mv_id}/fotos/add")
async def add_foto_viatico(mv_id: int, foto: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mv = db.query(ViaticoMovement).filter(ViaticoMovement.id == mv_id).first()
    if not mv or mv.viatico.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    ext = os.path.splitext(foto.filename)[1] or ".jpg"
    filename = f"viat_{mv_id}_x{uuid.uuid4().hex[:8]}{ext}"
    path = os.path.join(settings.UPLOADS_DIR, filename)
    os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
    async with aiofiles.open(path, "wb") as f:
        await f.write(await foto.read())
    photo = MovementPhoto(movement_type="viatico", movement_id=mv_id, foto_path=filename)
    db.add(photo); db.commit()
    return {"id": photo.id, "path": filename}


@router.delete("/movements/{mv_id}/fotos/{foto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_foto_viatico(mv_id: int, foto_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mv = db.query(ViaticoMovement).filter(ViaticoMovement.id == mv_id).first()
    if not mv or mv.viatico.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    photo = db.query(MovementPhoto).filter(MovementPhoto.id==foto_id, MovementPhoto.movement_type=="viatico").first()
    if not photo: raise HTTPException(404, "Foto no encontrada")
    try: os.remove(os.path.join(settings.UPLOADS_DIR, photo.foto_path))
    except: pass
    db.delete(photo); db.commit()


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
