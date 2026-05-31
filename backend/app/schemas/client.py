from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClientCreate(BaseModel):
    nombre: str
    rut: Optional[str] = None
    contacto: Optional[str] = None


class ClientUpdate(BaseModel):
    nombre: Optional[str] = None
    rut: Optional[str] = None
    contacto: Optional[str] = None
    is_active: Optional[bool] = None


class ClientOut(BaseModel):
    id: int
    nombre: str
    rut: Optional[str]
    contacto: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
