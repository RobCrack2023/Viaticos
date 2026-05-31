from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from ..database import get_db
from ..models.user import User
from ..models.viatico import Viatico, ViaticoStatus
from .auth import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/reports", tags=["reportes"])

CLP = lambda v: f"${v:,.0f}".replace(",", ".")


def _get_viatico(viatico_id: int, user: User, db: Session) -> Viatico:
    q = db.query(Viatico).filter(Viatico.id == viatico_id)
    # Admin puede ver cualquier viático; usuario solo los suyos
    if not user.is_admin:
        q = q.filter(Viatico.user_id == user.id)
    v = q.first()
    if not v:
        raise HTTPException(status_code=404, detail="Viático no encontrado")
    return v


def _calc(v: Viatico):
    total = sum(m.monto for m in v.movements)
    saldo = v.monto_asignado - total
    return total, saldo


# ── PDF ───────────────────────────────────────────────────────────────────────

@router.get("/{viatico_id}/pdf")
def download_pdf(viatico_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = _get_viatico(viatico_id, current_user, db)
    total_gastos, saldo = _calc(v)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=16, alignment=TA_CENTER, spaceAfter=6)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], fontSize=10, textColor=colors.grey, alignment=TA_CENTER)
    label_style = ParagraphStyle("label", parent=styles["Normal"], fontSize=9, textColor=colors.grey)
    value_style = ParagraphStyle("value", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold")
    right_style = ParagraphStyle("right", parent=styles["Normal"], fontSize=10, alignment=TA_RIGHT)

    story.append(Paragraph("RENDICIÓN DE VIÁTICO", title_style))
    story.append(Paragraph(f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}", sub_style))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB")))
    story.append(Spacer(1, 0.4*cm))

    # Encabezado de información
    info_data = [
        ["Colaborador:", current_user.nombre, "Estado:", v.status.value.upper()],
        ["Cliente:", v.client.nombre, "Fecha inicio:", v.fecha_inicio.strftime("%d/%m/%Y")],
        ["Proyecto:", v.project.nombre, "Fecha cierre:", v.fecha_cierre.strftime("%d/%m/%Y") if v.fecha_cierre else "-"],
        ["Tipo de acción:", v.action_type.nombre, "", ""],
    ]
    info_table = Table(info_data, colWidths=[3.5*cm, 7*cm, 3.5*cm, 3*cm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6B7280")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#6B7280")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4*cm))

    if v.observaciones:
        story.append(Paragraph(f"Observaciones: {v.observaciones}", label_style))
        story.append(Spacer(1, 0.3*cm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("DETALLE DE MOVIMIENTOS", ParagraphStyle("h2", parent=styles["Heading2"], fontSize=11, spaceAfter=6)))

    headers = ["#", "Fecha", "Tipo", "Concepto", "Monto"]
    rows = [headers]
    for i, m in enumerate(v.movements, 1):
        rows.append([
            str(i),
            m.fecha.strftime("%d/%m/%Y"),
            m.tipo.upper(),
            m.concepto,
            CLP(m.monto),
        ])

    col_w = [0.8*cm, 2.5*cm, 2*cm, 9*cm, 3*cm]
    mv_table = Table(rows, colWidths=col_w)
    mv_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (4, 0), (4, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E5E7EB")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(mv_table)
    story.append(Spacer(1, 0.6*cm))

    # Resumen financiero
    devolucion = saldo >= 0
    color_resultado = colors.HexColor("#16A34A") if devolucion else colors.HexColor("#DC2626")
    label_resultado = "DEBE DEVOLVER" if devolucion else "A REEMBOLSAR"

    resumen_data = [
        ["Monto asignado:", CLP(v.monto_asignado)],
        ["Total gastos:", CLP(total_gastos)],
        [label_resultado + ":", CLP(abs(saldo))],
    ]
    resumen_table = Table(resumen_data, colWidths=[5*cm, 3*cm], hAlign="RIGHT")
    resumen_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, -1), (-1, -1), color_resultado),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(resumen_table)

    doc.build(story)
    buf.seek(0)
    filename = f"rendicion_viatico_{viatico_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# ── Excel ─────────────────────────────────────────────────────────────────────

@router.get("/{viatico_id}/excel")
def download_excel(viatico_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    v = _get_viatico(viatico_id, current_user, db)
    total_gastos, saldo = _calc(v)

    wb = Workbook()
    ws = wb.active
    ws.title = "Rendición"
    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 40
    ws.column_dimensions["E"].width = 16

    blue = "2563EB"
    light = "F9FAFB"
    hdr_font = Font(bold=True, color="FFFFFF", size=10)
    hdr_fill = PatternFill("solid", fgColor=blue)
    bold = Font(bold=True, size=10)
    thin = Border(
        left=Side(style="thin", color="E5E7EB"),
        right=Side(style="thin", color="E5E7EB"),
        top=Side(style="thin", color="E5E7EB"),
        bottom=Side(style="thin", color="E5E7EB"),
    )

    # Título
    ws.merge_cells("A1:E1")
    ws["A1"] = "RENDICIÓN DE VIÁTICO"
    ws["A1"].font = Font(bold=True, size=14, color=blue)
    ws["A1"].alignment = Alignment(horizontal="center")
    ws.row_dimensions[1].height = 24

    # Info
    info = [
        ("Colaborador:", current_user.nombre),
        ("Cliente:", v.client.nombre),
        ("Proyecto:", v.project.nombre),
        ("Tipo de acción:", v.action_type.nombre),
        ("Fecha inicio:", v.fecha_inicio.strftime("%d/%m/%Y")),
        ("Fecha cierre:", v.fecha_cierre.strftime("%d/%m/%Y") if v.fecha_cierre else "-"),
        ("Estado:", v.status.value.upper()),
    ]
    for i, (lbl, val) in enumerate(info, 3):
        ws[f"A{i}"] = lbl
        ws[f"A{i}"].font = Font(bold=True, color="6B7280", size=9)
        ws[f"B{i}"] = val
        ws[f"B{i}"].font = Font(size=10)

    # Tabla movimientos
    start = 12
    headers = ["#", "Fecha", "Tipo", "Concepto", "Monto"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=start, column=col, value=h)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin

    for i, m in enumerate(v.movements, 1):
        row = start + i
        fill = PatternFill("solid", fgColor=light) if i % 2 == 0 else None
        values = [i, m.fecha.strftime("%d/%m/%Y"), m.tipo.upper(), m.concepto, m.monto]
        for col, val in enumerate(values, 1):
            cell = ws.cell(row=row, column=col, value=val)
            cell.border = thin
            if fill:
                cell.fill = fill
            if col == 5:
                cell.number_format = '#,##0'
                cell.alignment = Alignment(horizontal="right")

    # Resumen
    sum_row = start + len(v.movements) + 2
    resumen = [
        ("Monto asignado:", v.monto_asignado),
        ("Total gastos:", total_gastos),
        ("DEBE DEVOLVER:" if saldo >= 0 else "A REEMBOLSAR:", abs(saldo)),
    ]
    for j, (lbl, val) in enumerate(resumen):
        r = sum_row + j
        ws[f"D{r}"] = lbl
        ws[f"D{r}"].font = bold if j == 2 else Font(size=10)
        ws[f"E{r}"] = val
        ws[f"E{r}"].number_format = '#,##0'
        ws[f"E{r}"].alignment = Alignment(horizontal="right")
        if j == 2:
            color = "16A34A" if saldo >= 0 else "DC2626"
            ws[f"D{r}"].font = Font(bold=True, color=color, size=10)
            ws[f"E{r}"].font = Font(bold=True, color=color, size=10)

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"rendicion_viatico_{viatico_id}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})
