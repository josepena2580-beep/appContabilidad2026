$(function(){

   escucharNotificaciones();


  window.setTimeout(function(){
   $("#user-name").text(mail);
   $("#user-role").text(rol);
  }, 1000);

})
$("#btnCerrarSesion").click(function(){
   firebase.auth().signOut()
    .then(() => {
      loadPage("login");
      loadHeader();
    })
    .catch((error) => {
      alert("Error al cerrar sesión: " + error.message);
    });
})
$("#notificacionesDropdown").on("click", function() {
  $("#listaNotificaciones").toggle();
  db.collection("Notificaciones")
    .where("leido", "==", false)
    .get()
    .then(function(snapshot) {
      snapshot.forEach(function(doc) {
        doc.ref.update({ leido: true });
      });
    });
});