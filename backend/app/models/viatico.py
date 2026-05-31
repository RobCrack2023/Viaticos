from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class ViaticoStatus(str, enum.Enum):
    activo = "activo"
    cerrado = "cerrado"


class Viatico(Base):
    __tablename__ = "viaticos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    action_type_id = Column(Integer, ForeignKey("action_types.id"), nullable=False)
    monto_asignado  = Column(Float, nullable=False)
    monto_adicional = Column(Float, default=0.0)          # acumulado de top-ups
    editado         = Column(Integer, default=0)           # 0=no editado, 1=ya editado
    status          = Column(Enum(ViaticoStatus), default=ViaticoStatus.activo)
    fecha_inicio    = Column(DateTime, default=datetime.utcnow)
    fecha_cierre    = Column(DateTime, nullable=True)
    observaciones   = Column(String(500), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="viaticos")
    client = relationship("Client")
    project = relationship("Project", back_populates="viaticos")
    action_type = relationship("ActionType", back_populates="viaticos")
    movements = relationship("ViaticoMovement", back_populates="viatico", order_by="ViaticoMovement.fecha")


class ViaticoMovement(Base):
    __tablename__ = "viatico_movements"

    id = Column(Integer, primary_key=True, index=True)
    viatico_id = Column(Integer, ForeignKey("viaticos.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # giro, gasto
    concepto = Column(String(200), nullable=False)
    monto = Column(Float, nullable=False)
    foto_path = Column(String(300), nullable=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    sync_pending = Column(Integer, default=0)

    viatico = relationship("Viatico", back_populates="movements")
