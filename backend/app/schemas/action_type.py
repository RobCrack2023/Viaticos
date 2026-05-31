from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActionTypeCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class ActionTypeUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    is_active: Optional[bool] = None


class ActionTypeOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
