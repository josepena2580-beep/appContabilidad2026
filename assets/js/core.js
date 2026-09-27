let mail = "";
let rol = "";
let Nusuario = "";
let Napellido = "";

function loadZone(pathOrigin, idElement) {
  const numeroAleatorio = Math.random();
  $.ajax({
    url: pathOrigin + "?n=" + numeroAleatorio,
    type: "GET",
    success: function (result) {
      $("#" + idElement).html(result);
    },
    error: function (xhr, status, error) {},
  });
}
function loadHeader(root) {
  root = root === null || root === undefined ? "" : root;
  var url = "templates/" + root + "header.html";
  var idContent = "header";
  loadZone(url + "?e=h", idContent);
}
function loadFooter(root) {
  root = root === null || root === undefined ? "" : root;
  var url = "templates/" + root + "foother.html";
  var idContent = "foother";
  loadZone(url + "?e=f", idContent);
}
function loadPage(page, root, variables) {
  variables =
    variables === null || variables === undefined || variables === ""
      ? "t=1"
      : variables;
  root = root === null || root === undefined ? "" : root;
  var url = "templates/" + root + "pages/" + page + ".html";
  var idContent = "content";
  
  // 1. Registra el cambio en el historial para que Android/Navegador lo detecte
  var stateData = { page: page, root: root, variables: variables };
  history.pushState(stateData, "", "#" + page);

  // 2. Carga el contenido en la pantalla
  loadZone(url + "?" + variables, idContent);
}

// 3. Escucha cuando el usuario presiona el botón "Atrás" de Android
window.addEventListener("popstate", function(event) {
  if (event.state) {
    // Si hay un estado guardado, recarga esa página sin volver a duplicar el historial
    var url = "templates/" + event.state.root + "pages/" + event.state.page + ".html";
    loadZone(url + "?" + event.state.variables, "content");
  } else {
    // Si vuelve al inicio o no hay historial, puedes forzar la página principal de admin
    loadPage("dashboard", "admin/", ""); 
  }
});

firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
    console.log("Usuario autenticado:", user.email);

    const uid = user.uid;
    mail = user.email;

    firebase
      .firestore()
      .collection("usuarios")
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          rol = data.rol;
          Nusuario = data.nombre;
          Napellido = data.apellido;
          console.log("Rol:", rol);

          if (rol === "administrador") {
            loadHeader("admin/");
            loadPage("homeAdmin");
          } else if (rol === "usuario") {
            loadHeader("admin/");
            loadPage("homeUsuario", "usuario/");
          } else {
            console.warn("Rol no reconocido");
            loadPage("login");
          }
        } else {
          alert("usuario no valido");
          console.warn("Usuario sin documento en Firestore");
          loadPage("login");
        }
      })
      .catch((error) => {
        console.error("Error al obtener usuario:", error);
        loadPage("login");
      });

  } else {   
    console.log("No hay usuario autenticado");
    loadPage("login");
  }
});

async function cargarMiembros() {
  const tabla = $("#tablaMiembros tbody");
  tabla.empty();
  mostrarLoading(); // 🔄 Mostrar spinner antes de iniciar

  try {
    const querySnapshot = await firebase.firestore().collection("miembros").get();

    querySnapshot.forEach((doc) => {
      const m = doc.data();
      const fila = `
        <tr data-id="${doc.id}">
          <td>${m.nombre}</td>
          <td>${m.apellido}</td>
          <td>${m.tipoMiembro}</td>
          <td>
            <button class="btn btn-sm btn-info btn-editar me-2">Editar</button>
            <button class="btn btn-sm btn-danger btn-eliminar">Eliminar</button>
          </td>
        </tr>`;
      tabla.append(fila);
    });
  } catch (error) {
    console.error("Error al cargar los miembros:", error);
    alert("Ocurrió un error al cargar los miembros.");
  } finally {
    ocultarLoading(); // ✅ Siempre se ejecuta al final
  }
}
async function cargarMiembrosEnSelect() {
  mostrarLoading(); // 🔄 Mostrar spinner

  try {
    const querySnapshot = await firebase.firestore().collection("miembros").get();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      $("#miembroSelect").append(
        `<option value="${doc.id}">${data.nombre} ${data.apellido} - ${data.cc}</option>`
      );
    });
  } catch (error) {
    console.error("Error al cargar miembros en el select:", error);
    alert("Ocurrió un error al cargar los miembros.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner al final
  }
}
async function cargarActividades() {
  const tabla = $("#tablaActividades tbody");
  const totalGananciasCell = $("#totalGanancias");
  tabla.empty();
  totalGananciasCell.text("$0.00");

  mostrarLoading(); // 🔄 Mostrar spinner

  try {
   const actividadesRef = firebase.firestore().collection("actividades");
    const snapshot = await actividadesRef.orderBy("fecha", "desc").get();
    let sumaGanancias = 0;

    if (snapshot.empty) {
      tabla.append('<tr><td colspan="9" class="text-center">No hay actividades registradas.</td></tr>');
      return;
    }

    for (const doc of snapshot.docs) {
      const a = doc.data();
      const actividadId = doc.id;

      // Obtener gastos
      const gastosSnap = await actividadesRef.doc(actividadId).collection("gastos").get();
      let totalGastos = 0;
      gastosSnap.forEach((g) => {
      const gasto = g.data();
      totalGastos += gasto.monto || 0;
      });

      // Calcular ganancia
      const ganancia = (a.total || 0) - totalGastos;
      sumaGanancias += ganancia;

      // Construir fila
      const fila = `
        <tr data-id="${actividadId}">
          <td>${a.nombre}  (${a.fecha})</td>
          <td>$${a.total}</td>
          <td>$${totalGastos}</td>
          <td>$${ganancia}</td>
          <td>
             <button class="btn btn-sm btn-warning btn-editar m-1">Editar</button>
             <button class="btn btn-danger btn-sm btn-eliminar m-1">Eliminar</button>
          </td>
        </tr>
      `;

      tabla.append(fila);
    }

    totalGananciasCell.text(`$${sumaGanancias.toFixed(2)}`);
  } catch (error) {
    console.error("Error al cargar actividades:", error);
    alert("Hubo un error al cargar las actividades.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner al terminar
  }
}
function renderGastosForm(gastos = []) {
  $("#lineasGasto").empty();

  for (let i = 0; i < 5; i++) {
    const gasto = gastos[i] || { nombre: "", descripcion: "", monto: "" };

    $("#lineasGasto").append(`
  <div class="row mb-2 gasto-linea" style="border-bottom: 2px solid #ccc; padding-bottom: 10px;">
    <div class="col-md-3">
      <input type="text" class="form-control gasto-nombre" placeholder="Nombre del gasto" value="${
        gasto.nombre || ""
      }">
    </div>
    <div class="col-md-5">
      <input type="text" class="form-control gasto-desc" placeholder="Descripción" value="${
        gasto.descripcion || ""
      }">
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control gasto-monto" placeholder="Monto" value="${
        gasto.monto || ""
      }">
    </div>
  </div>
  <br>
`);
  }
}
async function cargarDeudas(miembroId, nombreMiembro) {
  const tabla = $("#tablaDeudas");
  const tablaBody = tabla.find("tbody");
  tablaBody.empty();

  let totalGeneral = 0;
  let deudas = [];

  mostrarLoading();

  try {
    // 📌 Obtener actividades tomadas por el miembro
    const actividadesSnap = await firebase
      .firestore()
      .collection("miembros")
      .doc(miembroId)
      .collection("actividades")
      .get();

    if (actividadesSnap.empty) {
      tabla.addClass("d-none");
      alert(`El miembro ${nombreMiembro} no tiene actividades registradas.`);
      return;
    }   

    actividadesSnap.forEach(doc => {
      const d = doc.data();
      
      const totalPagado = d.totalPagado || 0;
      const total = d.total || 0;
      const deudaActual = total - totalPagado;

      totalGeneral += deudaActual;

      deudas.push({
        actividad: d.actividadNombre,
        fecha: d.fecha ? d.fecha.toDate() : new Date(0),
        valorDeuda: total,
        totalPagado: totalPagado,
        deudaActual: deudaActual,
        actividadId: doc.id
      });
    });

    // 🔽 Ordenar por fecha descendente
    deudas.sort((a, b) => b.fecha - a.fecha);

    tabla.removeClass("d-none");
    tablaBody.empty();

    // ===============================
    // RENDER FILAS
    // ===============================
    deudas.forEach(d => {
      const puedeAgregarPago = d.deudaActual > 0 ? 0 : 1;

      const fila = `
        <tr>
          <td>${d.actividad}</td>
          <td class="text-end">$${d.valorDeuda.toLocaleString()}</td>
          <td class="text-end">$${d.totalPagado.toLocaleString()}</td>
          <td class="text-end fw-bold text-danger">$${d.deudaActual.toLocaleString()}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-success btn-agregar-pago me-2"
              data-miembro-id="${miembroId}"
              data-debe="${puedeAgregarPago}"
              data-actividad-id="${d.actividadId}">
              Agregar pago
            </button>
            <button class="btn btn-sm btn-warning btn-editar-pago"
              data-miembro-id="${miembroId}"
              data-actividad-id="${d.actividadId}">
              Editar
            </button>
          </td>
        </tr>
      `;
      tablaBody.append(fila);
    });

    // ===============================
    // TOTAL GENERAL
    // ===============================
    tablaBody.append(`
      <tr class="fw-bold table-secondary">
        <td colspan="3" class="text-end">Total deuda actual:</td>
        <td class="text-end text-danger">$${totalGeneral.toLocaleString()}</td>
        <td></td>
      </tr>
    `);

  } catch (error) {
    console.error("Error al cargar deudas:", error);
    alert("Hubo un error al obtener las deudas.");
  } finally {
    ocultarLoading();
  }

    // ===============================
// GENERAR PDF
// ===============================

 $("#btnImprimirPDF").off("click").on("click", function () {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado centrado
    const anchoPagina = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("MOVIMIENTO MISIONERO MUNDIAL", anchoPagina / 2, 15, {
      align: "center"
    });

    doc.setFontSize(14);
    doc.text("IGLESIA DE TIERRALTA - LORICA", anchoPagina / 2, 23, {
      align: "center"
    });

    doc.setFontSize(12);
    doc.text("RESUMEN DE DEUDA", anchoPagina / 2, 33, {
      align: "center"
    });

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`Miembro: ${nombreMiembro}`, anchoPagina / 2, 42, {
      align: "center"
    });

   // Solo mostrar actividades que aún tienen deuda
const filas = deudas
  .filter(d => Number(d.deudaActual) > 0)
  .map(d => [
    d.actividad,
    `$${d.valorDeuda.toLocaleString()}`,
    `$${d.totalPagado.toLocaleString()}`,
    `$${d.deudaActual.toLocaleString()}`
  ]);

    // Fila total
    filas.push([
      "",
      "",
      "TOTAL DEUDA",
      `$${totalGeneral.toLocaleString()}`
    ]);

   doc.autoTable({
  startY: 50,
  head: [[
    "Actividad",
    "Valor Actividad",
    "Pagado",
    "Debe"
  ]],
  body: filas,
  theme: "grid",

  headStyles: {
    halign: "center",
    fontStyle: "bold"
  },

  // Filas alternadas
  alternateRowStyles: {
    fillColor: [245, 245, 245] // Gris muy claro
  },

  bodyStyles: {
    fillColor: [255, 255, 255] // Blanco
  },

  columnStyles: {
    1: { halign: "right" },
    2: { halign: "right" },
    3: { halign: "right" }
  },

  didParseCell: function (data) {

    // Resaltar la fila TOTAL DEUDA
    if (
      data.section === "body" &&
      data.row.index === filas.length - 1
    ) {
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fillColor = [220, 220, 220];

      if (data.column.index === 3) {
        data.cell.styles.fontSize = 16;
      } else {
        data.cell.styles.fontSize = 13;
      }
    }
  }
});
    const fechaActual = new Date();

const fechaFormateada =
  fechaActual.toLocaleDateString("es-CO") +
  " " +
  fechaActual.toLocaleTimeString("es-CO");

doc.setFontSize(10);

doc.text(
  `Fecha de impresión: ${fechaFormateada}`,
  doc.internal.pageSize.getWidth() - 14,
  doc.lastAutoTable.finalY + 10,
  { align: "right" }
);

    doc.save(`Resumen_Deuda_${nombreMiembro}.pdf`);
});
  

}

async function cargarMiembros2() {
  const miembrosSelect = $("#miembrosSelect");
  miembrosSelect.empty();
  miembrosSelect.append(`<option value="">Seleccione un miembro</option>`);

  mostrarLoading(); // 🔄 Mostrar spinner

  try {
    const snapshot = await firebase.firestore().collection("miembros").get();
    let miembros = [];

    snapshot.forEach((doc) => {
      let data = doc.data();
      miembros.push({
        id: doc.id,
        nombre: data.nombre || "",
        apellido: data.apellido || "",
      });
    });

    // 🔤 Ordenar alfabéticamente por nombre y luego por apellido
    miembros.sort((a, b) => {
      let nombreA = a.nombre.toLowerCase();
      let nombreB = b.nombre.toLowerCase();
      if (nombreA === nombreB) {
        return a.apellido.toLowerCase().localeCompare(b.apellido.toLowerCase());
      }
      return nombreA.localeCompare(nombreB);
    });

    // 📝 Agregar opciones al select
    miembros.forEach((m) => {
      const option = `<option value="${m.id}">${m.nombre} ${m.apellido}</option>`;
      miembrosSelect.append(option);
    });
  } catch (error) {
    console.error("Error al cargar miembros:", error);
    alert("Hubo un error al cargar los miembros.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner
  }
 
}
function entradaFondo() {
  const formEntrada = document.getElementById("formEntrada");

  formEntrada.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fecha = document.getElementById("fecha").value;
    const tipo = document.getElementById("tipo").value;
    const cantidad = parseFloat(document.getElementById("cantidad").value);
    const descripcion = document.getElementById("descripcion").value.trim();

    if (!fecha || !tipo || isNaN(cantidad) || cantidad <= 0 || !descripcion) {
      alert("Por favor complete todos los campos correctamente.");
      return;
    }
     mostrarLoading();
    try {
      await firebase
        .firestore()
        .collection("fondoEntradas")
        .add({
          fecha: new Date(fecha),
          tipo,
          cantidad,
          descripcion,
          creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        });

      await db.collection("Notificaciones").add({
       titulo: "Entrada manual al fondo registrada",
       mensaje: `Se realizó una Entrada manual al fondo de ${cantidad} pesos por motivo de: ${descripcion}`,
       tipo: "salida_fondo",
       fecha: firebase.firestore.FieldValue.serverTimestamp(),
       leido: false
  });


      alert("Entrada registrada correctamente.");
      formEntrada.reset();
    } catch (error) {
      console.error("Error al guardar la entrada:", error);
      alert("Ocurrió un error al guardar la entrada.");
    }
     finally {
    ocultarLoading();
    loadPage("frontFondo", "admin/");
  }
  });
}
async function cargarSalidasFondo() {
  const tablaBody = $("#tablaSalidas tbody");
  const totalSalidasEl = $("#totalSalidas");
  tablaBody.empty();

 


  let total = 0;


  mostrarLoading(); // 🔄 Mostrar spinner

  try {
    // 🟩 Cargar salidas manuales
    const salidasSnap = await firebase
      .firestore()
      .collection("fondoSalidas")
      .orderBy("fecha", "desc")
      .get();

    salidasSnap.forEach((doc) => {
      const s = doc.data();
      const id = doc.id;

      let fecha = "Sin fecha";
      if (s.fecha?.toDate) {
        fecha = s.fecha.toDate().toISOString().split("T")[0];
      }

      const motivo = s.motivo || "Sin motivo";
      const cantidad = s.cantidad || 0;

      // Tabla 1
      tablaBody.append(`
        <tr data-id="${id}">
          <td>${fecha}</td>
          <td>${motivo}</td>
          <td class="text-end">$${cantidad.toLocaleString()}</td>
          <td>
            <button class="btn btn-sm btn-primary btn-editar-salida"
              data-id="${id}" 
              data-fecha="${fecha}" 
              data-motivo="${motivo}" 
              data-cantidad="${cantidad}">
              Editar
            </button>
            <button class="btn btn-sm btn-danger btn-eliminar-salida" data-id="${id}">
              Eliminar
            </button>
          </td>
        </tr>
      `);

      total += cantidad;
    });

    totalSalidasEl.text(`$${total.toLocaleString()}`);

  } catch (error) {
    console.error("Error al cargar salidas:", error);
    alert("Error al cargar salidas del fondo.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner
    $("#salidasM").click(); // Simular clic en pestaña o vista
  }
}

async function cargarEntradasFondo() {
  const tbody = $("#tablaEntradas tbody");
  const totalEl = $("#totalEntradas");
  tbody.empty();

  const tbody2 = $("#tablaEntradas2 tbody");
  const totalEl2 = $("#totalEntradas2");
  tbody2.empty();

  const tbody3 = $("#tablaEntradas3 tbody");
  const totalEl3 = $("#totalEntradas3");
  tbody3.empty();


  let total = 0;
  let total2 = 0;
  let total3 = 0;

  mostrarLoading(); // 🔄 Mostrar spinner

  try {
    const snapshot = await firebase
      .firestore()
      .collection("fondoEntradas")
      .orderBy("fecha", "desc")
      .get();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const fecha = data.fecha?.toDate().toISOString().split("T")[0] || "Sin fecha";
      const motivo = data.descripcion || "Sin descripción";
      const tipo = data.tipo || "Sin tipo";
      const cantidad = data.cantidad || 0;

      total += cantidad;
      total3 += cantidad;

      const fila = `
        <tr data-id="${doc.id}">
          <td>${fecha}</td>
          <td>${motivo}</td>
          <td>${tipo}</td>
          <td>$${cantidad.toFixed(2)}</td>
          <td>
            <button class="btn btn-sm btn-warning btn-editarE" data-id="${doc.id}">Editar</button>
            <button class="btn btn-sm btn-danger btn-eliminarE" data-id="${doc.id}">Eliminar</button>
          </td>
        </tr>
      `;

         const fila3 = `
        <tr data-id="${doc.id}">
          <td>${tipo} (${fecha})</td>
          <td>${motivo}</td>
          <td>$${cantidad.toFixed(2)}</td>
        </tr>
      `;
      tbody.append(fila);
      tbody3.append(fila3);

    });

    totalEl.text(`$${total.toFixed(2)}`);
  
    

   const snapshot2 = await firebase
      .firestore()
      .collection("actividades")
      .orderBy("fecha", "desc")
      .get();

    snapshot2.forEach((doc) => {
      const data2 = doc.data();
      const fecha2 = data2.fecha || "Sin fecha";
      const motivo2 = data2.descripcion || "Sin descripción";
      const nombre2 = data2.nombre || "Sin tipo";
      const totalact = data2.ganancia||0

      total2 += totalact;

      const fila2 = `
        <tr data-id="${doc.id}">
          <td>${nombre2} (${fecha2})</td>
          <td>${motivo2}</td>
          <td>$${totalact.toFixed(2)}</td>
        </tr>
      `;
      tbody2.append(fila2);

        const fila3 = `
        <tr data-id="${doc.id}">
          <td>${nombre2} (${fecha2})</td>
          <td>${motivo2}</td>
          <td>$${totalact.toFixed(2)}</td>
        </tr>
      `;
      tbody3.append(fila3);
    });

    totalEl2.text(`$${total2.toFixed(2)}`);

    total3 = total + total2;

    totalEl3.text(`$${total3.toFixed(2)}`);

  } catch (error) {
    console.error("Error al cargar entradas :", error);
    alert("No se pudo cargar la lista de entradas.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner al finalizar
     $("#entradasMA").click();
  }
}

function salidasFondo() {
  const formSalida = document.getElementById("formSalida");

  formSalida.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fecha = document.getElementById("fechaSalida").value;
    const motivo = document.getElementById("motivo").value.trim();
    const cantidad = parseFloat(
      document.getElementById("cantidadSalida").value
    );

    if (!fecha || !motivo || isNaN(cantidad) || cantidad <= 0) {
      alert("Por favor complete todos los campos correctamente.");
      return;
    }
    mostrarLoading();

    try {
      await firebase
        .firestore()
        .collection("fondoSalidas")
        .add({
          fecha: new Date(fecha),
          motivo,
          cantidad,
          creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        });

     await db.collection("Notificaciones").add({
       titulo: "Salida de fondo registrada",
       mensaje: `Se realizó una salida de  ${cantidad} pesos por motivo de: ${motivo}`,
       tipo: "salida_fondo",
       fecha: firebase.firestore.FieldValue.serverTimestamp(),
       leido: false
  });


      alert("Salida registrada correctamente.");
      formSalida.reset();
    } catch (error) {
      console.error("Error al registrar la salida:", error);
      alert("Ocurrió un error al registrar la salida.");
    }
    finally {
    ocultarLoading();
    loadPage("frontFondo", "admin/");
  }
  });
}

async function cargarEstadoFondo() {
  let entradasManuales = 0;
  let gastoActividad = 0;
  let salidasManuales = 0;

  let totalActividades = 0;
  let totalPagado = 0;
  let totalDeuda = 0;
  let totalGasto = 0;

  const db = firebase.firestore();
  mostrarLoading();

  try {
    // 1. Entradas manuales
    const entradasSnap = await db.collection("fondoEntradas").get();
    entradasSnap.forEach(doc => {
      entradasManuales += Number(doc.data().cantidad || 0);
    });

    // 2. Salidas manuales
    const salidasSnap = await db.collection("fondoSalidas").get();
    salidasSnap.forEach(doc => {
      salidasManuales += Number(doc.data().cantidad || 0);
    });

    // 3. Ganancia de actividades
    const actividadesSnap = await db.collection("actividades").get();
    actividadesSnap.forEach(doc => {
      totalActividades += Number(doc.data().total || 0);
      totalGasto += Number(doc.data().gasto || 0);
    });

    // 4. Resumen financiero POR MIEMBRO
    const miembrosSnap = await db.collection("miembros").get();

    for (const miembroDoc of miembrosSnap.docs) {
      const actividadesSnap = await db
        .collection("miembros")
        .doc(miembroDoc.id)
        .collection("actividades")
        .get();

      actividadesSnap.forEach(doc => {
        const a = doc.data();

        const total = Number(a.total || 0);
        const pagado = Number(a.totalPagado || 0);

        totalPagado += pagado;
        totalDeuda += (total - pagado);
      });
    }
    const totalEntradas = entradasManuales + totalActividades;
    const totalSalidas = totalGasto + salidasManuales;
    // 5. Cálculos finales
    const fondo = totalEntradas - totalSalidas;
      

    const efectivo = fondo - totalDeuda;
    
    // 6. Mostrar
    $("#entradasManuales").text(`$${entradasManuales.toLocaleString()}`);
    $("#entradasActividades").text(`$${totalActividades.toLocaleString()}`);
    $("#totalEntradas").text(`$${totalEntradas.toLocaleString()}`);

    $("#TotalSalidaManual").text(`$${salidasManuales.toLocaleString()}`);
    $("#totalGastos").text(`$${totalGasto.toLocaleString()}`);
    $("#totalSalidas").text(`$${totalSalidas.toLocaleString()}`);

    $("#saldoFondo").text(`$${fondo.toLocaleString()}`);
    $("#dineroEfectivo").text(`$${efectivo.toLocaleString()}`);
    $("#deudasPendientes").text(`$${totalDeuda.toLocaleString()}`);
  } catch (error) {
    console.error("Error al calcular estado del fondo:", error);
    alert("Hubo un error al calcular el estado del fondo.");
  } finally {
    ocultarLoading();
  }
}

async function cargarActividadesU() {
  const tabla = $("#tablaActividades tbody");
  const totalGananciasCell = $("#totalGanancias");
  tabla.empty(); // Limpiar tabla antes de insertar
  totalGananciasCell.text("$0.00");

  const actividadesRef = firebase.firestore().collection("actividades");
  let sumaGanancias = 0;

  mostrarLoading(); // 🔄 Mostrar spinner

  try {
    const snapshot = await actividadesRef.orderBy("creada", "desc").get();

    if (snapshot.empty) {
      tabla.append(
        '<tr><td colspan="9" class="text-center">No hay actividades registradas.</td></tr>'
      );
      return;
    }

    for (const doc of snapshot.docs) {
      const a = doc.data();
      const actividadId = doc.id;

      // 1. Obtener total de gastos
      const gastosSnap = await actividadesRef
        .doc(actividadId)
        .collection("gastos")
        .get();

      let totalGastos = 0;
      gastosSnap.forEach((g) => {
        const gasto = g.data();
        totalGastos += gasto.monto || 0;
      });

      // 2. Calcular ganancia
      const ganancia = (a.total || 0) - totalGastos;
      sumaGanancias += ganancia;

      // 3. Construir la fila
      const fila = `
      <tr data-id="${actividadId}">
          <td>${a.nombre}  (${a.fecha})</td>
          <td>$${a.total}</td>
          <td>$${totalGastos}</td>
          <td>$${ganancia}</td>
        </tr>
      `;

      tabla.append(fila);
    }

    // 4. Mostrar total de ganancias abajo
    totalGananciasCell.text(`$${sumaGanancias.toFixed(2)}`);
  } catch (error) {
    console.error("Error al cargar actividades:", error);
    alert("Hubo un error al cargar las actividades.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner pase lo que pase
  }
}

async function cargarEntradasFondoU() {
  
  const tbody = $("#tablaEntradas tbody");
  const totalEl = $("#totalEntradas");
  tbody.empty();

  const tbody2 = $("#tablaEntradas2 tbody");
  const totalEl2 = $("#totalEntradas2");
  tbody2.empty();

  const tbody3 = $("#tablaEntradas3 tbody");
  const totalEl3 = $("#totalEntradas3");
  tbody3.empty();


  let total = 0;
  let total2 = 0;
  let total3 = 0;

  mostrarLoading(); // 🔄 Mostrar spinner

  try {
    const snapshot = await firebase
      .firestore()
      .collection("fondoEntradas")
      .orderBy("fecha", "desc")
      .get();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const fecha = data.fecha?.toDate().toISOString().split("T")[0] || "Sin fecha";
      const motivo = data.descripcion || "Sin descripción";
      const tipo = data.tipo || "Sin tipo";
      const cantidad = data.cantidad|| 0;

      total += cantidad;
      total3 += cantidad;

      const fila = `
        <tr data-id="${doc.id}">
          <td>${fecha}</td>
          <td>${motivo}</td>
          <td>${tipo}</td>
          <td>$${cantidad.toFixed(2)}</td>
          
        </tr>
      `;

         const fila3 = `
        <tr data-id="${doc.id}">
          <td>${tipo} (${fecha})</td>
          <td>${motivo}</td>
          <td>$${cantidad.toFixed(2)}</td>
        </tr>
      `;
      tbody.append(fila);
      tbody3.append(fila3);

    });

    totalEl.text(`$${total.toFixed(2)}`);
  
    

   const snapshot2 = await firebase
      .firestore()
      .collection("actividades")
      .orderBy("fecha", "desc")
      .get();

    snapshot2.forEach((doc) => {
      const data2 = doc.data();
      const fecha2 = data2.fecha || "Sin fecha";
      const motivo2 = data2.descripcion || "Sin descripción";
      const nombre2 = data2.nombre || "Sin tipo";
      const totalact = data2.ganancia||0

      total2 += totalact;

      const fila2 = `
        <tr data-id="${doc.id}">
          <td>${nombre2} (${fecha2})</td>
          <td>${motivo2}</td>
          <td>$${totalact.toFixed(2)}</td>
        </tr>
      `;
      tbody2.append(fila2);

        const fila3 = `
        <tr data-id="${doc.id}">
          <td>${nombre2} (${fecha2})</td>
          <td>${motivo2}</td>
          <td>$${totalact.toFixed(2)}</td>
        </tr>
      `;
      tbody3.append(fila3);
    });

    totalEl2.text(`$${total2.toFixed(2)}`);

    total3 = total + total2;

    totalEl3.text(`$${total3.toFixed(2)}`);

  } catch (error) {
    console.error("Error al cargar entradas :", error);
    alert("No se pudo cargar la lista de entradas.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner al finalizar
     $("#entradasMA").click();
  }
}

async function cargarSalidasFondoU() {
  const tablaBody = $("#tablaSalidas tbody");
  const totalSalidasEl = $("#totalSalidas");
  tablaBody.empty();

  let total = 0;
  mostrarLoading(); // 🔄 Mostrar spinner

  try {
    // 🟩 Cargar salidas manuales
    const salidasSnap = await firebase
      .firestore()
      .collection("fondoSalidas")
      .orderBy("fecha", "desc")
      .get();

    salidasSnap.forEach((doc) => {
      const s = doc.data();
      const id = doc.id;

      let fecha = "Sin fecha";
      if (s.fecha?.toDate) {
        fecha = s.fecha.toDate().toISOString().split("T")[0];
      }
      const motivo = s.motivo || "Sin motivo";
      const cantidad = s.cantidad || 0;

      // Tabla 1
      tablaBody.append(`
        <tr data-id="${id}">
          <td>${fecha}</td>
          <td>${motivo}</td>
          <td class="text-end">$${cantidad.toLocaleString()}</td>
        </tr>
      `);
      total += cantidad;
    });

    totalSalidasEl.text(`$${total.toLocaleString()}`);
    
  } catch (error) {
    console.error("Error al cargar salidas:", error);
    alert("Error al cargar salidas del fondo.");
  } finally {
    ocultarLoading(); // ✅ Ocultar spinner
  }
} 

async function cargarResumenDeudas() {
  mostrarLoading();

  const tablaBody = $("#tablaResumen tbody");
  tablaBody.empty();


  let totalDeudaGlobal = 0;

  try {
    const miembrosSnapshot = await db.collection("miembros").get();

    if (miembrosSnapshot.empty) {
      alert("No hay miembros registrados.");
      return;
    }

    miembrosSnapshot.forEach((miembroDoc) => {
      const miembro = miembroDoc.data();
      const nombreCompleto = `${miembro.nombre} ${miembro.apellido || ""}`;

      const resumen = miembro.resumen || {
        total: 0,
        totalPagado: 0
      };

      const total = Number(resumen.total || 0);
      const pagado = Number(resumen.totalPagado || 0);
      const deuda = total - pagado;

      // 🔹 Acumular globales

      totalDeudaGlobal += deuda;

      // 🔹 Mostrar solo si debe algo
      if (deuda > 0) {
        tablaBody.append(`
          <tr>
            <td>${nombreCompleto}</td>
            <td class="text-end">$${total.toLocaleString()}</td>
            <td class="text-end">$${pagado.toLocaleString()}</td>
            <td class="text-end text-danger fw-bold">
              $${deuda.toLocaleString()}
            </td>
          </tr>
        `);
      }
    });

    // 🔹 Totales

    $("#totalSaldo").text(`$${totalDeudaGlobal.toLocaleString()}`);

  } catch (error) {
    console.error("Error al cargar resumen de deudas:", error);
    alert("Ocurrió un error al cargar el resumen.");
  } finally {
    ocultarLoading();
  }
}

function mostrarLoading() {
 
  $("#loadingOverlay")
    .css("display", "flex")  // Activar el display flex para centrar
    .hide()                  // Luego ocultarlo para aplicar el fadeIn
    .fadeIn(200);            // Animación de entrada
}

function ocultarLoading() {
  $("body").css("overflow", "auto");
  $("#loadingOverlay").fadeOut(200, function () {
    $(this).css("display", "none");
  });
}

function mostrarDiv(idDiv, boton) {
    // Ocultar todos los divs de contenido
    $(".contenido").addClass("d-none");

    // Mostrar el div seleccionado
    $(`#${idDiv}`).removeClass("d-none");

    // Botón activo (opcional)
    $("#entradasM, #entradasA, #entradasMA").removeClass("active");
    $(boton).addClass("active");
}

function cargarInventario(){
   

    // Cargar utensilios en tiempo real
    db.collection('utensilios').orderBy('nombre', 'asc').onSnapshot(snapshot => {
      const tbody = $('#tablaUtensilios');
      tbody.empty();

      if (snapshot.empty) {
        tbody.append(`<tr><td colspan="4" class="text-muted">No hay utensilios registrados.</td></tr>`);
        return;
      }

      snapshot.forEach(doc => {
        const u = doc.data();
        const id = doc.id;

        tbody.append(`
          <tr data-id="${id}">
            <td>${u.cantidad ?? '-'}</td>
            <td>${u.nombre ?? '-'}</td>
            <td>${u.descripcion ?? '-'}</td>
            <td>${u.estado ?? '-'}</td>
            <td class="editar-col" style="display: ${modoEdicion ? 'table-cell' : 'none'};">
              <button class="btn btn-sm btn-outline-primary btnEditarFila me-1">Editar</button>
              <button class="btn btn-sm btn-outline-danger btnEliminarFila">Eliminar</button>
            </td>
          </tr>
        `);
      });
    });
}
function escucharNotificaciones() {

  db.collection("Notificaciones")
    .orderBy("fecha", "desc")
    .limit(8)
    .onSnapshot(function(snapshot) {

      let contador = 0;
      let html = "";

      snapshot.forEach(function(doc) {

        const data = doc.data();

        if (!data.leido) contador++;

        html += `
          <a href="#" class="dropdown-item ${data.leido ? '' : 'font-weight-bold'}">
            <small class="text-muted">${formatearFecha(data.fecha)}</small><br>
            ${data.mensaje}
          </a>
        `;
      });

      if (html === "") {
        html = `<p class="dropdown-item text-center text-muted">
                  No hay notificaciones
                </p>`;
      }

      $("#listaNotificaciones").html(html);
      $("#contadorNotificaciones").text(contador);

    });
}


