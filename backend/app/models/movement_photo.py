from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from ..database import Base


class MovementPhoto(Base):
    """Fotos adicionales de movimientos (CC o viático)."""
    __tablename__ = "movement_photos"

    id             = Column(Integer, primary_key=True, index=True)
    movement_type  = Column(String(10), nullable=False)   # "cc" o "viatico"
    movement_id    = Column(Integer, nullable=False, index=True)
    foto_path      = Column(String(300), nullable=False)
    created_at     = Column(DateTime, default=datetime.utcnow)
