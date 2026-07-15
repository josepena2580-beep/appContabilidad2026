var selectActividad = $('#selectActividad');
var tablaMiembros = $('#tablaMiembros');
var formAsignaciones = $('#formAsignaciones');
var precioUnidad = 0;
var cantAct = 0;

// ===============================
// 1. CARGAR ACTIVIDADES
// ===============================
db.collection("actividades").orderBy("fecha", "desc").get().then(snapshot => {
  snapshot.forEach(doc => {
    const data = doc.data();
    selectActividad.append(
      `<option value="${doc.id}">${data.nombre} (${data.fecha})</option>`
    );
  });
});

// ===============================
// 2. SELECCIONAR ACTIVIDAD
// ===============================
selectActividad.change(async function () {
  const actividadId = $(this).val();
  if (!actividadId) {
    formAsignaciones.hide();
    return;
  }
   try {
    mostrarLoading();

  const actividadDoc = await db.collection("actividades").doc(actividadId).get();
  if (!actividadDoc.exists) {
    alert("Actividad no encontrada");
    return;
  }

  precioUnidad = actividadDoc.data().precioUnidad || 0;
  cantAct = actividadDoc.data().cantUnidades || 0;
  $("#cant").val(cantAct);
  $("#precio").val(precioUnidad);

  const miembrosSnapshot = await db.collection("miembros").get();
  tablaMiembros.find('tbody').empty();

  let miembros = [];
  miembrosSnapshot.forEach(doc => {
    const d = doc.data();
    miembros.push({
      id: doc.id,
      nombre: d.nombre || '',
      apellido: d.apellido || ''
    });
  });

  miembros.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  for (const miembro of miembros) {
    const actividadMiembroDoc = await db
      .collection("miembros")
      .doc(miembro.id)
      .collection("actividades")
      .doc(actividadId)
      .get();

    let cantidad = "";
    let total = "0.00";

    if (actividadMiembroDoc.exists) {
      cantidad = actividadMiembroDoc.data().cantidad || 0;
      total = (cantidad * precioUnidad).toFixed(2);
    }

    tablaMiembros.find('tbody').append(`
      <tr>
        <td>${miembro.nombre} ${miembro.apellido}</td>
        <td>
          <input type="number" step="any" class="form-control cantidad-miembro"
            data-id="${miembro.id}" value="${cantidad}">
        </td>
        <td>
          <input type="number" step="any" class="form-control total"
            data-id="${miembro.id}" value="${total}" readonly>
        </td>
      </tr>
    `);
  }

  actualizarTotalesGlobales();
  formAsignaciones.show();
}

 catch (err) {
    console.error(err);
    alert("Error al cargar actividad");
  } finally {
    ocultarLoading();
  }
});

// ===============================
// 3. RECÁLCULO EN TIEMPO REAL
// ===============================
tablaMiembros.on('input', '.cantidad-miembro', function () {
  const miembroId = $(this).data('id');
  const cantidad = parseFloat($(this).val().replace(',', '.')) || 0;
  const total = cantidad * precioUnidad;

  $(`.total[data-id="${miembroId}"]`).val(total.toFixed(2));
  actualizarTotalesGlobales();
});

// ===============================
// 4. TOTALES GENERALES
// ===============================
function actualizarTotalesGlobales() {
  let totalUnidades = 0;
  let totalPlata = 0;

  $('.cantidad-miembro').each(function () {
    const cantidad = parseFloat($(this).val().replace(',', '.')) || 0;
    totalUnidades += cantidad;
    totalPlata += cantidad * precioUnidad;
  });

  $('#totalUnidades').text(totalUnidades);
  $('#totalPlata').text(totalPlata.toFixed(2));

}



// ===============================
// 5. GUARDAR ASIGNACIONES
// ===============================
formAsignaciones.submit(async function (e) {
  e.preventDefault();

  const actividadId = selectActividad.val();
  const actividadNombre = selectActividad.find("option:selected").text();

  try {
    mostrarLoading();

    for (const input of $('.cantidad-miembro').toArray()) {
      const miembroId = $(input).data('id');
      const cantidad = parseFloat($(input).val().replace(',', '.')) || 0;
      const totalNuevo = cantidad * precioUnidad;

      const miembroRef = db.collection("miembros").doc(miembroId);
      const actividadRef = miembroRef.collection("actividades").doc(actividadId);

      await db.runTransaction(async (tx) => {
        const actSnap = await tx.get(actividadRef);
        const miembroSnap = await tx.get(miembroRef);

        const resumen = miembroSnap.data().resumen || {
          total: 0,
          totalPagado: 0
        };

        let deltaTotal = 0;

        // ===============================
        // NO TOMÓ ACTIVIDAD
        // ===============================
        if (cantidad === 0 && actSnap.exists) {
          const act = actSnap.data();

          if ((act.totalPagado || 0) === 0) {
            deltaTotal = -act.total;
            tx.delete(actividadRef);
          }
        }

        // ===============================
        // TOMÓ / EDITÓ ACTIVIDAD
        // ===============================
        if (cantidad > 0) {
          if (actSnap.exists) {
            const act = actSnap.data();
            deltaTotal = totalNuevo - act.total;

            tx.update(actividadRef, {
              cantidad,
              precioUnidad,
              total: totalNuevo
            });
          } else {
            deltaTotal = totalNuevo;

            tx.set(actividadRef, {
              actividadId,
              actividadNombre,
              cantidad,
              precioUnidad,
              total: totalNuevo,
              totalPagado: 0,
              fecha: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        }

        // ===============================
        // ACTUALIZAR RESUMEN DEL MIEMBRO
        // ===============================
        if (deltaTotal !== 0) {
          tx.update(miembroRef, {
            "resumen.total": (resumen.total || 0) + deltaTotal
          });
        }
      });
    }

    alert("Asignaciones guardadas correctamente");

  } catch (err) {
    console.error(err);
    alert("Error al guardar asignaciones");
  } finally {
    ocultarLoading();
     loadPage("frontActividades", "admin/");
  }
});


// ===============================
// 6. ATRÁS
// ===============================
$("#atras").click(function () {
  loadPage("frontActividades", "admin/");
});
