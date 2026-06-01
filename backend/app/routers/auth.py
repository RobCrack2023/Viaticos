from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from ..database import get_db
from ..models.user import User
from ..schemas.user import LoginRequest, Token, UserOut
from ..core.security import verify_password, hash_password, create_access_token, decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── Rate limiting en memoria ──────────────────────────────────────────────────
_attempts: dict = {}   # {ip: {"count": int, "blocked_until": datetime | None}}
MAX_ATTEMPTS   = 5
BLOCK_MINUTES  = 15

def _check_rate(ip: str):
    now = datetime.utcnow()
    d   = _attempts.get(ip, {})
    blocked = d.get("blocked_until")
    if blocked and now < blocked:
        mins = int((blocked - now).total_seconds() // 60) + 1
        raise HTTPException(status_code=429,
            detail=f"Demasiados intentos fallidos. Intenta en {mins} minuto(s).")

def _fail(ip: str):
    now = datetime.utcnow()
    d   = _attempts.setdefault(ip, {"count": 0, "blocked_until": None})
    d["count"] += 1
    if d["count"] >= MAX_ATTEMPTS:
        d["blocked_until"] = now + timedelta(minutes=BLOCK_MINUTES)

def _clear(ip: str):
    _attempts.pop(ip, None)

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol administrador")
    return current_user


@router.post("/login", response_model=Token)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    _check_rate(ip)   # bloquea si excedió intentos

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        _fail(ip)     # cuenta intento fallido
        remaining = MAX_ATTEMPTS - _attempts.get(ip, {}).get("count", 0)
        detail = "Credenciales incorrectas"
        if remaining <= 2 and remaining > 0:
            detail += f" ({remaining} intento(s) restante(s))"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario desactivado")
    _clear(ip)        # login exitoso → limpia contador
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contrasena actual es incorrecta")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contrasena debe tener al menos 6 caracteres")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}
