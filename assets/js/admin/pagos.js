$(function () {
  cargarMiembros2();
});

var miembrosSelect = $("#miembrosSelect");

miembrosSelect.off("change").on("change", function () {
  const miembroId = $(this).val();
  let miembroNombre = $(this).find("option:selected").text();
  if (miembroId) {
    cargarDeudas(miembroId, miembroNombre);
  }
});

$("#btnHistorialPagos").click(function () {
  loadPage("historialPagos", "admin/");
});

$("#atrasPa").click(function () {
  accionPago = null;
  miembroIdSeleccionado = null;
  actividadIdSeleccionada = null;
  totalActualPagado = 0;
  $("#inputMonto").val("");
  loadPage("frontPagos", "admin/");
});

var modal = new bootstrap.Modal(document.getElementById("modalMonto"));

// ===============================
// VARIABLES GLOBALES
// ===============================
var accionPago = "";
var miembroIdSeleccionado = "";
var actividadIdSeleccionada = "";
var totalActualPagado = 0;

// ===============================
// AGREGAR PAGO
// ===============================
$("#tablaDeudas").on("click", ".btn-agregar-pago", function () {
  accionPago = "agregar";
  miembroIdSeleccionado = $(this).data("miembro-id");
  actividadIdSeleccionada = $(this).data("actividad-id");

  $("#modalMontoLabel").text("Ingrese el monto del pago");
  $("#inputMonto").val("").attr("min", 0);
  modal.show();
});

// ===============================
// EDITAR PAGO (AJUSTE)
// ===============================
$("#tablaDeudas").on("click", ".btn-editar-pago", async function () {
  accionPago = "editar";
  miembroIdSeleccionado = $(this).data("miembro-id");
  actividadIdSeleccionada = $(this).data("actividad-id");

  const ref = firebase.firestore()
    .collection("miembros")
    .doc(miembroIdSeleccionado)
    .collection("actividades")
    .doc(actividadIdSeleccionada);

  const doc = await ref.get();
  if (!doc.exists) {
    alert("No existe el registro.");
    return;
  }

  totalActualPagado = doc.data().totalPagado || 0;
  $("#modalMontoLabel").text("Editar total pagado");
  $("#inputMonto").val(totalActualPagado).attr("min", 0);
  modal.show();
});

// ===============================
// SUBMIT MODAL
// ===============================
$("#formModalMonto").submit(async function (e) {
  e.preventDefault();

  const monto = parseFloat($("#inputMonto").val());
  if (isNaN(monto) || monto < 0) {
    alert("Monto inválido");
    return;
  }

  mostrarLoading();

  const db = firebase.firestore();
  const miembroRef = db.collection("miembros").doc(miembroIdSeleccionado);
  const actividadRef = miembroRef.collection("actividades").doc(actividadIdSeleccionada);
   


  try {
    await db.runTransaction(async (tx) => {
      const actividadSnap = await tx.get(actividadRef);
      const miembroSnap = await tx.get(miembroRef);
      
        const nombreMiembro = miembroSnap.data().nombre;
        const apellidoMiembro = miembroSnap.data().apellido;
        const nombreActividad = actividadSnap.data().actividadNombre;
       

      if (!actividadSnap.exists) throw "Actividad no encontrada";

      const act = actividadSnap.data();
      const resumen = miembroSnap.data().resumen || { total: 0, totalPagado: 0 };

      let deltaPagado = 0;

      // ===============================
      // AGREGAR PAGO
      // ===============================
      if (accionPago === "agregar") {
        const deudaActual = (act.total || 0) - (act.totalPagado || 0);
        const montoAplicado = Math.min(monto, deudaActual);

        deltaPagado = montoAplicado;

        tx.update(actividadRef, {
          totalPagado: (act.totalPagado || 0) + montoAplicado
        });

        tx.set(actividadRef.collection("pagos").doc(), {
          monto: montoAplicado,
          tipo: "pago",
          fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // ===============================
      // EDITAR PAGO (AJUSTE)
      // ===============================
      if (accionPago === "editar") {
        const diferencia = monto - (act.totalPagado || 0);
        deltaPagado = diferencia;

        tx.update(actividadRef, {
          totalPagado: monto
        });

        tx.set(actividadRef.collection("pagos").doc(), {
          monto: diferencia,
          tipo: "ajuste",
          fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // ===============================
      // ACTUALIZAR RESUMEN DEL MIEMBRO
      // ===============================
      tx.update(miembroRef, {
        "resumen.totalPagado": (resumen.totalPagado || 0) + deltaPagado
      });
        // 🔔 NOTIFICACIÓN DENTRO DE LA TRANSACCIÓN
  const notiRef = db.collection("Notificaciones").doc();
  
  tx.set(notiRef, {
    titulo: "Nuevo pago registrado",
    mensaje: " * " + nombreMiembro +" "+apellidoMiembro+
              " realizó un pago de " + monto +
              " pesos de la actividad " + nombreActividad,
    fecha: firebase.firestore.FieldValue.serverTimestamp(),
    leido: false,
    miembroId: miembroIdSeleccionado,
    actividadId: actividadIdSeleccionada,
    
  });
     miembroNombre = nombreMiembro +" "+apellidoMiembro
    });
       
    alert("Pago actualizado correctamente");
    modal.hide();
   
    cargarDeudas(miembroIdSeleccionado, miembroNombre);





  } catch (err) {
    console.error(err);
    alert("Error al procesar el pago");
  } finally {
    ocultarLoading();
  }
});


