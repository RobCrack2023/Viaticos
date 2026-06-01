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


CATEGORIAS = ["Hotel/Alojamiento", "Alimentacion", "Transporte",
              "Combustible", "Peajes", "Materiales", "Comunicaciones", "Otros"]


class ViaticoMovementCreate(BaseModel):
    tipo:       str
    concepto:   str
    monto:      float
    categoria:  str = "Otros"
    numero_doc: Optional[str] = None
    fecha:      Optional[datetime] = None


class ViaticoMovementUpdate(BaseModel):
    tipo:       Optional[str]   = None
    concepto:   Optional[str]   = None
    monto:      Optional[float] = None
    categoria:  Optional[str]   = None
    numero_doc: Optional[str]   = None
    fecha:      Optional[datetime] = None


class ViaticoMovementOut(BaseModel):
    id:         int
    tipo:       str
    concepto:   str
    monto:      float
    categoria:  str = "Otros"
    numero_doc: Optional[str] = None
    foto_path:  Optional[str] = None
    fecha:      datetime
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
    monto_asignado:  float
    monto_adicional: float = 0.0
    editado:         int   = 0
    status:          str
    fecha_inicio:    datetime
    fecha_cierre:    Optional[datetime]
    created_at:      datetime
    observaciones:   Optional[str]
    saldo_actual:    float = 0.0
    total_gastos:    float = 0.0
    movements:       List[ViaticoMovementOut] = []

    model_config = {"from_attributes": True}


class ViaticoClose(BaseModel):
    observaciones: Optional[str] = None


class ViaticoEdit(BaseModel):
    client_id:      Optional[int]      = None
    project_id:     Optional[int]      = None
    action_type_id: Optional[int]      = None
    fecha_inicio:   Optional[datetime] = None
    monto_asignado: Optional[float]    = None
    observaciones:  Optional[str]      = None


class ViaticoAdicional(BaseModel):
    monto:  float
    motivo: Optional[str] = None
