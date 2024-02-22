const body = document.getElementsByTagName("body").item(0);
body.innerHTML += `<div id="alert_holder"></div>`;

const holder = document.getElementById("alert_holder");
socket.on("alert", (data) => {
  console.log(data);

  let level = data.level;
  let message = data.message;

  if (!level || !message) return;

  switch (level) {
    case 0:
      level = "secondary";
      break;
    case 1:
      level = "warning";

      break;
    case 2:
      level = "danger";

      break;
    default:
      level = "secondary";
      break;
  }

  holder.innerHTML += `<div class="position-absolute alert alert-${level} alert-dismissible fade show" role="alert" style="display: block; z-index: 100; top: 5rem; left: 50%; transform: translate(-50%, 0)">
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
  ${message}
</div>`;
});
