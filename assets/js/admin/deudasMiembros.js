$(function () {
  cargarResumenDeudas();
});

$("#atrasd").click(function () {
  loadPage("frontPagos", "admin/");
});

// ===============================
// EXPORTAR A PDF
// ===============================
async function exportarTablaPDF() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  const fechaActual = new Date().toLocaleString().replace(/[\/:, ]/g, "-");

  const nombreCompleto = "Hna Dina Luz Arteaga"
  

  /*
    =========================
    ENCABEZADO EMPRESARIAL
    =========================
  */

  // Fondo Header
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 210, 30, "F");

  // Nombre Empresa
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Iglesia MMM Tierralta-Lorica", 14, 15);

  doc.setFontSize(10);
  doc.text("Departamento de Actividades", 14, 22);

  /*
    =========================
    TITULO REPORTE
    =========================
  */

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("REPORTE DE DEUDAS", 14, 39);

  /*
    =========================
    INFORMACION DEL REPORTE
    =========================
  */

 
  // Fecha en azul
  doc.setTextColor(29, 78, 216);
  doc.text(`Fecha de impresión: ${fechaActual}`, 14, 46);

  /*
    =========================
    TABLA
    =========================
  */

  const head = [["Miembro", "Total", "Pagado", "Saldo Pendiente"]];
  const body = [];

  $("#tablaResumen tbody tr").each(function () {
    const fila = [];

    $(this).find("td").each(function () {
      fila.push($(this).text().trim());
    });

    body.push(fila);
  });

  // Totales resaltados
  body.push([
    "TOTALES",
    $("#totalDeuda").text(),
    $("#totalPagos").text(),
    $("#totalSaldo").text(),
  ]);

  doc.autoTable({
    startY: 52,

    head: head,
    body: body,

    theme: "grid",

    headStyles: {
      fillColor: [29, 78, 216],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },

    bodyStyles: {
      halign: "center",
    },

    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },

    didParseCell: function (data) {
      // Última fila = Totales
      if (data.row.index === body.length - 1) {
        data.cell.styles.fillColor = [220, 234, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [0, 0, 0];
      }
    },
  });

  /*
    =========================
    FIRMA
    =========================
  */

  const finalY = doc.lastAutoTable.finalY + 25;

  doc.line(70, finalY, 140, finalY);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  doc.text(nombreCompleto, 105, finalY + 7, { align: "center" });
  doc.text("Responsable del Reporte", 105, finalY + 13, { align: "center" });

  /*
    =========================
    FOOTER
    =========================
  */

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);

  doc.text(
    "Documento generado automáticamente por AppContabilidad2026",
    105,
    285,
    { align: "center" }
  );

 doc.save(`Resumen de deudas - ${fechaActual}.pdf`);

}
// ===============================
// IMPRIMIR
// ===============================
function imprimirTabla() {
  const tablaHtml = document.getElementById("tablaResumen")?.outerHTML || "";

  if (!tablaHtml) {
    alert("No hay datos para imprimir.");
    return;
  }

  const estilo = `
<style>
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    padding: 30px;
    background: #f8f9fa;
    color: #333;
  }

  h2 {
    text-align: center;
    color: #1e3a8a;
    margin-bottom: 10px;
  }

  .encabezado {
    margin-bottom: 20px;
    padding: 12px 16px;
    background: #eaf2ff;
    border-left: 5px solid #2563eb;
    border-radius: 8px;
  }

  .encabezado p {
    margin: 4px 0;
    font-size: 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 10px;
    background: white;
    box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  }

  thead th {
    background: #2563eb;
    color: white;
    padding: 12px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  tbody td {
    padding: 10px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 14px;
  }

  tbody tr:nth-child(even) {
    background-color: #f9fafb;
  }

  tbody tr:hover {
    background-color: #e0ecff;
  }

  tfoot td {
    background: #dbeafe;
    font-weight: bold;
    padding: 12px;
  }
</style>
`;

  const ventanaImpresion = window.open("", "_blank");
  if (!ventanaImpresion) return;

  ventanaImpresion.document.open();
  ventanaImpresion.document.write(`
    <html>
      <head>
        <title>Resumen de Deudas</title>
        ${estilo}
      </head>
      <body>
        <h2>Resumen de Deudas por Miembro</h2>
        ${tablaHtml}
      </body>
    </html>
  `);
  ventanaImpresion.document.close();
  ventanaImpresion.focus();
  ventanaImpresion.print();
  ventanaImpresion.close();
}


