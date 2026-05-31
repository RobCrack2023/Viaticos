from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProjectCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    client_id: int


class ProjectUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    client_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProjectOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    client_id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
