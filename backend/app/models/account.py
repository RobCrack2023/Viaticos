from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    saldo_inicial = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="account")
    movements = relationship("AccountMovement", back_populates="account", order_by="AccountMovement.fecha")


class AccountMovement(Base):
    __tablename__ = "account_movements"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # giro, compra, ingreso
    concepto = Column(String(200), nullable=False)
    monto        = Column(Float, nullable=False)
    numero_doc   = Column(String(50), nullable=True)
    foto_path    = Column(String(300), nullable=True)
    fecha        = Column(DateTime, default=datetime.utcnow)
    created_at   = Column(DateTime, default=datetime.utcnow)
    sync_pending = Column(Integer, default=0)  # 1 = pendiente sync offline

    account = relationship("Account", back_populates="movements")
