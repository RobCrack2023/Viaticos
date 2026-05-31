from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Optional
import os, uuid, aiofiles
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.account import Account, AccountMovement
from ..schemas.account import AccountInit, AccountOut, MovementCreate, MovementUpdate, MovementOut
from .auth import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/account", tags=["cuenta corriente"])


def _calc_saldo(account: Account) -> float:
    saldo = account.saldo_inicial
    for m in account.movements:
        if m.tipo == "ingreso":
            saldo += m.monto
        else:
            saldo -= m.monto
    return saldo


def _get_account(user: User, db: Session) -> Account:
    account = db.query(Account).filter(Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta corriente no inicializada")
    return account


def _build_account_out(account: Account) -> AccountOut:
    return AccountOut.model_validate({
        "id": account.id,
        "user_id": account.user_id,
        "saldo_inicial": account.saldo_inicial,
        "saldo_actual": _calc_saldo(account),
        "movements": account.movements,
    })


# ── Inicializar cuenta ────────────────────────────────────────────────────────

@router.post("/init", response_model=Optional[AccountOut])
def init_account(data: AccountInit, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Account).filter(Account.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cuenta ya inicializada")
    account = Account(user_id=current_user.id, saldo_inicial=data.saldo_inicial)
    db.add(account)
    db.commit()
    db.refresh(account)
    return _build_account_out(account)


@router.put("/saldo", response_model=AccountOut)
def update_saldo(data: AccountInit, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = _get_account(current_user, db)
    account.saldo_inicial = data.saldo_inicial
    db.commit()
    db.refresh(account)
    return _build_account_out(account)


@router.get("", response_model=Optional[AccountOut])
def get_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.user_id == current_user.id).first()
    if not account:
        return None
    return _build_account_out(account)


# ── Movimientos ───────────────────────────────────────────────────────────────

@router.post("/movements", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def add_movement(data: MovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.tipo not in ("giro", "compra", "ingreso"):
        raise HTTPException(status_code=400, detail="Tipo debe ser: giro, compra o ingreso")
    account = _get_account(current_user, db)
    mv = AccountMovement(
        account_id=account.id,
        tipo=data.tipo,
        concepto=data.concepto,
        monto=data.monto,
        fecha=data.fecha or datetime.utcnow(),
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


@router.put("/movements/{mv_id}", response_model=MovementOut)
def update_movement(mv_id: int, data: MovementUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = _get_account(current_user, db)
    mv = db.query(AccountMovement).filter(AccountMovement.id == mv_id, AccountMovement.account_id == account.id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(mv, field, value)
    db.commit()
    db.refresh(mv)
    return mv


@router.delete("/movements/{mv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movement(mv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = _get_account(current_user, db)
    mv = db.query(AccountMovement).filter(AccountMovement.id == mv_id, AccountMovement.account_id == account.id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    db.delete(mv)
    db.commit()


@router.post("/movements/{mv_id}/foto", response_model=MovementOut)
async def upload_foto_movement(mv_id: int, foto: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = _get_account(current_user, db)
    mv = db.query(AccountMovement).filter(AccountMovement.id == mv_id, AccountMovement.account_id == account.id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    ext = os.path.splitext(foto.filename)[1] or ".jpg"
    filename = f"acc_{mv_id}_{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.UPLOADS_DIR, filename)
    os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
    async with aiofiles.open(path, "wb") as f:
        await f.write(await foto.read())
    mv.foto_path = filename
    db.commit()
    db.refresh(mv)
    return mv
