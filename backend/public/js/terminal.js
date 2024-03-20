function init_terminal() {
  console.log("initializing terminal");
  const src = `
  <div>
  <div class="position-absolute" style="z-index: 5; right: 1rem; bottom: 1rem">
    <button id="terminal_open" type="button" class="btn btn-dark"><i class="m-0 p-0 h3 lh-1 bi bi-terminal"></i></button>
  </div>
  <div id="terminal_main" class="position-absolute d-flex flex-row" style="visibility: hidden; z-index: 6; right: 1rem; bottom: 1rem">
    <button id="terminal_close" type="button" class="t-1 p-2 rounded-left bg-danger text-light align-self-baseline" style="all: unset"><i class="bi bi-x-lg"></i></button>
    <div class="overflow-hidden" style="background-color: black; width: 50vw; height: 90vh">
      <iframe src="https://tty.codermerlin.academy/" class="w-100 h-100"></iframe>
    </div>
  </div>
</div>
    `;

  const body = document.getElementsByTagName("body")[0];
  console.log(body);
  if (!body) {
    console.error("Missing Body Element");
    return;
  }
  body.insertAdjacentHTML("afterbegin", src);

  document.addEventListener("DOMContentLoaded", () => {
    console.log(document);
    const main = document.getElementById("terminal_main");
    console.log(main);
    console.log(document.getElementById("terminal_open"));

    document.getElementById("terminal_open").addEventListener("click", (event) => {
      event.preventDefault();
      console.log("clicked");
      main.style.visibility = "visible";
    });

    document.getElementById("terminal_close").addEventListener("click", (event) => {
      event.preventDefault();
      console.log("clicked");
      main.style.visibility = "hidden";
    });
  });
}

init_terminal();
