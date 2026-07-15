$(document).ready(() => {
  mostrarLoading();
  const db = firebase.firestore();

  // ===============================
  // CARGAR ACTIVIDADES EN SELECT
  // ===============================
  const selectActividad = $("#selectActividad");
  selectActividad.empty();
  selectActividad.append(`<option value="">-- Seleccione --</option>`);

  db.collection("actividades")
    .orderBy("fecha", "desc")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        selectActividad.append(`
          <option value="${doc.id}">
            ${data.nombre || "Sin nombre"} (${data.fecha || "Sin fecha"})
          </option>
        `);
      });
      ocultarLoading();
    })
    .catch((error) => {
      console.error("Error cargando actividades:", error);
      ocultarLoading();
    });

  // ===============================
  // CAMBIO DE ACTIVIDAD
  // ===============================
  selectActividad.on("change", function () {
    const actividadId = $(this).val();
    if (actividadId) {
      cargarResumenActividad(actividadId);
    } else {
      limpiarTablas();
    }
  });

  $("#btnVerTodos").on("click", () => {
    $("#cardTodos").toggleClass("d-none");
  });

  $("#btnVolver").on("click", () => {
    loadPage("frontActividadesU", "usuario/");
  });

  // ===============================
  // RESUMEN POR ACTIVIDAD (ADAPTADO)
  // ===============================
  async function cargarResumenActividad(actividadId) {
    mostrarLoading();

    $("#tablaDeudores tbody").empty();
    $("#tablaTodos tbody").empty();

    let totalTodos = 0;
    let totalDeudores = 0;

    try {
      // 🔹 Obtener actividad (precio)
      const actividadSnap = await db.collection("actividades").doc(actividadId).get();
      if (!actividadSnap.exists) {
        alert("La actividad no existe");
        return;
      }

      const actividad = actividadSnap.data();
      const precioUnidad = actividad.precioUnidad || 0;

      // 🔹 Obtener miembros
      const miembrosSnap = await db.collection("miembros").get();

      const filasTodos = [];
      const filasDeudores = [];

      for (const miembroDoc of miembrosSnap.docs) {
        const miembroId = miembroDoc.id;
        const miembro = miembroDoc.data();
        const nombreCompleto = `${miembro.nombre} ${miembro.apellido || ""}`.trim();

        // 🔹 Buscar asignación DEL MIEMBRO
        const asignacionRef = db
          .collection("miembros")
          .doc(miembroId)
          .collection("actividades")
          .doc(actividadId);

        const asignacionSnap = await asignacionRef.get();
        if (!asignacionSnap.exists) continue;

        const asignacion = asignacionSnap.data();
        const cantidad = asignacion.cantidad || 0;
        const total = cantidad * precioUnidad;
        const pagado = asignacion.totalPagado || 0;
        const saldo = total - pagado;

        if (cantidad <= 0) continue;

        const filaHTML = `
          <tr>
            <td>${nombreCompleto}</td>
            <td class="text-end">${cantidad}</td>
            <td class="text-end">$${total.toLocaleString()}</td>
            <td class="text-end">$${pagado.toLocaleString()}</td>
            <td class="text-end fw-bold ${saldo > 0 ? "text-danger" : "text-success"}">
              $${saldo.toLocaleString()}
            </td>
          </tr>
        `;

        filasTodos.push({ nombreCompleto, filaHTML });
        totalTodos += saldo;

        if (saldo > 0) {
          filasDeudores.push({ nombreCompleto, filaHTML });
          totalDeudores += saldo;
        }
      }

      // 🔹 Ordenar alfabéticamente
      filasTodos.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      filasDeudores.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

      // 🔹 Renderizar tablas
      filasTodos.forEach(f => $("#tablaTodos tbody").append(f.filaHTML));
      $("#tablaTodos tbody").append(`
        <tr class="table-success fw-bold">
          <td colspan="4" class="text-end">Total Saldo (Todos):</td>
          <td class="text-end">$${totalTodos.toLocaleString()}</td>
        </tr>
      `);

      filasDeudores.forEach(f => $("#tablaDeudores tbody").append(f.filaHTML));
      if (totalDeudores > 0) {
        $("#tablaDeudores tbody").append(`
          <tr class="table-warning fw-bold">
            <td colspan="4" class="text-end">Total Deuda:</td>
            <td class="text-end text-danger">$${totalDeudores.toLocaleString()}</td>
          </tr>
        `);
      }

    } catch (err) {
      console.error("Error cargando resumen:", err);
      alert("Error al cargar resumen de la actividad");
    } finally {
      ocultarLoading();
    }
  }

  function limpiarTablas() {
    $("#tablaDeudores tbody").empty();
    $("#tablaTodos tbody").empty();
    $("#cardTodos").addClass("d-none");
  }
});
