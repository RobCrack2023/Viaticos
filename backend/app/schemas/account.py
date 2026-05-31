from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AccountInit(BaseModel):
    saldo_inicial: float


class MovementCreate(BaseModel):
    tipo: str  # giro, compra, ingreso
    concepto: str
    monto: float
    fecha: Optional[datetime] = None


class MovementUpdate(BaseModel):
    tipo: Optional[str] = None
    concepto: Optional[str] = None
    monto: Optional[float] = None
    fecha: Optional[datetime] = None


class MovementOut(BaseModel):
    id: int
    tipo: str
    concepto: str
    monto: float
    foto_path: Optional[str]
    fecha: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountOut(BaseModel):
    id: int
    user_id: int
    saldo_inicial: float
    saldo_actual: float = 0.0
    movements: List[MovementOut] = []

    model_config = {"from_attributes": True}
