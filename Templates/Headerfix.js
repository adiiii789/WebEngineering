<script>
document.getElementsByTagName("BODY")[0].onload = function() {adjustHeader()};
document.getElementsByTagName("BODY")[0].onresize = function() {adjustHeader()};
function adjustHeader() {
  var offset = document.getElementById('completeHeader').offsetHeight;
  document.getElementById('scrollpart').style.top = offset +"px";
  var footerheight =  document.getElementById('footer').offsetHeight;
  document.getElementById('scrollpart').style.height = Number(window.innerHeight - offset - footerheight - 10 ) + "px";
  document.getElementById('scrollpart').style.position = "relative";
  document.getElementById('scrollpart').style.overflow = "auto";
}
</script>
