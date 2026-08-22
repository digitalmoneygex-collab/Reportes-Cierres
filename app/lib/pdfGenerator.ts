import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipos para los datos que esperamos del modal / API
export type ShiftPdfData = {
  fecha: string;
  horaApertura: string;
  horaCierre: string;
  cajeroNombre: string;
  cajeroCedula: string;
  supervisorNombre?: string;
  supervisorCedula?: string;
  pskloud: {
    tasa: number;
    totalBs: number; totalBsUsd: number;
    devolucionesEfBs: number; devolucionesEfUsd: number;
    totalRecibidoBs: number; totalRecibidoUsd: number;
    totalFacturas: number;
  };
  metodosPago: { metodo: string; cantidad: number; totalBs: number }[];
  pagos: { totalBs: number; registradosCount: number; procesadosCount: number };
  articulos: {
    burguer: { nombre: string; cantidad: number }[];
    pasteles: { nombre: string; cantidad: number }[];
    reposteria: { nombre: string; cantidad: number }[];
  };
  // Totales de insumos calculados con FACTORES
  insumos?: {
    burguer:  Record<string, number>;
    pasteles: Record<string, number>;
  };
};

const METODOS_LABELS: Record<string, string> = {
  punto_venta: 'Punto de Venta',
  dolares_efectivo: 'Dólares Efectivo',
  bs_efectivo: 'Bs Efectivo',
  transferencia: 'Transferencia',
  pago_movil: 'Pago Móvil',
  credito: 'Crédito',
  binance: 'Binance',
  zelle: 'Zelle',
  bio_pago: 'Bio Pago',
  gasto: 'Gasto',
  devolucion: 'Devolución',
};

const fmtBs = (v: number) => `Bs. ${v.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
const fmtUsd = (v: number) => `$ ${v.toFixed(2)}`;

export function generateShiftReportPdf(data: ShiftPdfData) {
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE CIERRE DE TURNO', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${data.fecha}`, 15, y);
  doc.text(`Apertura: ${data.horaApertura} - Cierre: ${data.horaCierre}`, pageWidth - 15, y, { align: 'right' });
  y += 6;
  doc.text(`Cajero: ${data.cajeroNombre} (C.I. ${data.cajeroCedula})`, 15, y);
  if (data.supervisorNombre) {
    doc.text(`Supervisor (Forzado): ${data.supervisorNombre}`, pageWidth - 15, y, { align: 'right' });
  }
  y += 10;

  // 1. Resumen Financiero
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RESUMEN FINANCIERO (PSKLOUD)', 15, y);
  y += 6;

  const finData = [
    ['Ingresos Brutos', fmtBs(data.pskloud.totalBs), data.pskloud.tasa > 0 ? fmtUsd(data.pskloud.totalBsUsd) : '-'],
  ];
  if (data.pskloud.devolucionesEfBs > 0) {
    finData.push(['Devoluciones', `- ${fmtBs(data.pskloud.devolucionesEfBs)}`, data.pskloud.tasa > 0 ? `- ${fmtUsd(data.pskloud.devolucionesEfUsd)}` : '-']);
  }
  finData.push(['Total Neto', fmtBs(data.pskloud.totalRecibidoBs), data.pskloud.tasa > 0 ? fmtUsd(data.pskloud.totalRecibidoUsd) : '-']);

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto (Bs)', 'Monto (USD)']],
    body: finData,
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40] },
    margin: { left: 15, right: 15 }
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 10;

  // 2. Desglose Vías de Pago
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. DESGLOSE POR VÍA DE PAGO', 15, y);
  y += 6;

  const metodosData = data.metodosPago.map(m => [
    METODOS_LABELS[m.metodo] || m.metodo,
    m.cantidad.toString(),
    fmtBs(m.totalBs),
    data.pskloud.tasa > 0 ? fmtUsd(m.totalBs / data.pskloud.tasa) : '-'
  ]);
  
  const totalVentasBs = data.metodosPago.reduce((acc, curr) => acc + curr.totalBs, 0);
  metodosData.push([
    'VENTAS TOTALES',
    data.metodosPago.reduce((acc, curr) => acc + curr.cantidad, 0).toString(),
    fmtBs(totalVentasBs),
    data.pskloud.tasa > 0 ? fmtUsd(totalVentasBs / data.pskloud.tasa) : '-'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Método / Vía', 'Cant.', 'Total (Bs)', 'Total (USD)']],
    body: metodosData,
    theme: 'striped',
    headStyles: { fillColor: [70, 70, 200] },
    margin: { left: 15, right: 15 }
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 10;

  // 3. Capturas Bot
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. PAGOS MÓVILES (BOT)', 15, y);
  y += 6;
  
  autoTable(doc, {
    startY: y,
    head: [['Total Capturas Registradas', 'Capturas Procesadas (OCR)', 'Monto Registrado (Bs)', 'Monto Registrado (USD)']],
    body: [[
      data.pagos.registradosCount?.toString() || '0',
      data.pagos.procesadosCount?.toString() || '0',
      fmtBs(data.pagos.totalBs || 0),
      data.pskloud.tasa > 0 ? fmtUsd((data.pagos.totalBs || 0) / data.pskloud.tasa) : '-'
    ]],
    theme: 'grid',
    headStyles: { fillColor: [40, 160, 100] },
    margin: { left: 15, right: 15 }
  });
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 10;

  // 4. Conteo de Piezas (Artículos)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('4. CONTEO DE PIEZAS VENDIDAS', 15, y);
  y += 6;

  const drawGroupTable = (title: string, items: {nombre: string, cantidad: number}[], startY: number) => {
    if (!items || items.length === 0) return startY;
    let currentY = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, currentY);
    currentY += 4;
    
    autoTable(doc, {
      startY: currentY,
      head: [['Artículo', 'Cant.']],
      body: items.map(i => [i.nombre, i.cantidad.toString()]),
      theme: 'plain',
      styles: { cellPadding: 1, fontSize: 9 },
      headStyles: { fillColor: [200, 200, 200], textColor: [0,0,0] },
      margin: { left: 15, right: 100 } // Hacerla estrecha
    });
    // @ts-ignore
    return doc.lastAutoTable.finalY + 8;
  };

  y = drawGroupTable('Burgers / Hamburguesas', data.articulos.burguer, y);
  if (y > 250) { doc.addPage(); y = 20; }
  y = drawGroupTable('Pasteles / Tequeños', data.articulos.pasteles, y);
  if (y > 250) { doc.addPage(); y = 20; }
  y = drawGroupTable('Repostería', data.articulos.reposteria, y);

  // 5. Totales de Insumos
  if (data.insumos && (Object.keys(data.insumos.burguer || {}).length > 0 || Object.keys(data.insumos.pasteles || {}).length > 0)) {
    if (y > 200) { doc.addPage(); y = 20; }
    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('5. TOTAL DE PIEZAS / INSUMOS', 15, y);
    y += 6;

    // Combinar insumos de burguer y pasteles
    const todosInsumos: Record<string, number> = {};
    Object.entries(data.insumos.burguer || {}).forEach(([k, v]) => { todosInsumos[k] = (todosInsumos[k] || 0) + v; });
    Object.entries(data.insumos.pasteles || {}).forEach(([k, v]) => { todosInsumos[k] = (todosInsumos[k] || 0) + v; });

    const INSUMOS_ORDER = ['Pieza G', 'Pieza P', 'Pieza F', 'Carne H', 'Pollo', 'Pan Burguer', 'Pan perro', 'Salchicha', 'Arepa C', 'Carne M', 'Huevo', 'Bebida'];
    const insumosBody = INSUMOS_ORDER
      .filter(k => (todosInsumos[k] || 0) > 0)
      .map(k => [k, todosInsumos[k].toString()]);
    
    if (insumosBody.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Insumo / Pieza', 'Total']],
        body: insumosBody,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 15, right: 100 }
      });
      // @ts-ignore
      y = doc.lastAutoTable.finalY + 8;
    }
  }

  // Firmas
  if (y > 210) { doc.addPage(); y = 20; }
  y += 30;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Linea firma cajero
  doc.line(30, y, 90, y);
  doc.text(data.cajeroNombre, 60, y + 5, { align: 'center' });
  doc.text(`C.I. ${data.cajeroCedula}`, 60, y + 10, { align: 'center' });
  doc.text('Firma del Cajero', 60, y + 15, { align: 'center' });

  // Linea firma supervisor
  doc.line(125, y, 185, y);
  doc.text(data.supervisorNombre || '______________________', 155, y + 5, { align: 'center' });
  if (data.supervisorCedula) doc.text(`C.I. ${data.supervisorCedula}`, 155, y + 10, { align: 'center' });
  doc.text('Firma del Supervisor', 155, y + 15, { align: 'center' });

  const fileName = `Cierre_Turno_${data.fecha.replace(/\//g, '-')}_${data.cajeroNombre.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
