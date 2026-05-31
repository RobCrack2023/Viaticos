from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ViaticoCreate(BaseModel):
    client_id: int
    project_id: int
    action_type_id: int
    monto_asignado: float
    fecha_inicio: Optional[datetime] = None
    observaciones: Optional[str] = None


class ViaticoMovementCreate(BaseModel):
    tipo: str  # giro, gasto
    concepto: str
    monto: float
    fecha: Optional[datetime] = None


class ViaticoMovementUpdate(BaseModel):
    tipo: Optional[str] = None
    concepto: Optional[str] = None
    monto: Optional[float] = None
    fecha: Optional[datetime] = None


class ViaticoMovementOut(BaseModel):
    id: int
    tipo: str
    concepto: str
    monto: float
    foto_path: Optional[str]
    fecha: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class ViaticoOut(BaseModel):
    id: int
    user_id: int
    client_id: int
    project_id: int
    action_type_id: int
    client_nombre: str = ""
    project_nombre: str = ""
    action_type_nombre: str = ""
    monto_asignado: float
    status: str
    fecha_inicio: datetime
    fecha_cierre: Optional[datetime]
    observaciones: Optional[str]
    saldo_actual: float = 0.0
    total_gastos: float = 0.0
    movements: List[ViaticoMovementOut] = []

    model_config = {"from_attributes": True}


class ViaticoClose(BaseModel):
    observaciones: Optional[str] = None
