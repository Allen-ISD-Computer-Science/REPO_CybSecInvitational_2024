/*!
 * Start Bootstrap - Simple Sidebar v6.0.6 (https://startbootstrap.com/template/simple-sidebar)
 * Copyright 2013-2023 Start Bootstrap
 * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-simple-sidebar/blob/master/LICENSE)
 */
//
// Scripts
//

window.addEventListener("DOMContentLoaded", (event) => {
  // Toggle the side navigation
  const sidebarToggle = document.body.querySelector("#sidebarToggle");
  if (sidebarToggle) {
    // Uncomment Below to persist sidebar toggle between refreshes
    // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
    //     document.body.classList.toggle('sb-sidenav-toggled');
    // }
    sidebarToggle.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.classList.toggle("sb-sidenav-toggled");
      localStorage.setItem("sb|sidebar-toggle", document.body.classList.contains("sb-sidenav-toggled"));
    });
  }
});
// const  = window.location;
console.log(location.protocol + "//" + location.host);

var converter = new showdown.Converter();

async function fetchPuzzle() {
  const response = await fetch(location.protocol + "//" + location.host + "/getPuzzle", {
    method: "POST",
    body: JSON.stringify({ id: "templatePuzzle" }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
  console.log(response);
  if (!response.ok) return;

  const json = await response.json();
  console.log(json);
  const text = json.description;
  const html = converter.makeHtml(text);

  console.log(html);
}

const card = document.getElementById("puzzleCard");
var converter = new showdown.Converter();
async function fetchAllPuzzles() {
  const response = await fetch(location.protocol + "//" + location.host + "/getAllPuzzles", { method: "POST" });
  // console.log(response);
  if (!response.ok) return;

  const data = await response.json();
  const puzzles = Object.values(data);

  puzzles.forEach((puzzle) => {
    const cardBody = card.getElementsByClassName("card-body");

    console.log(cardBody);
    const cardText = cardBody[0].getElementsByClassName("card-text");
    console.log(cardText);
    cardText[0].innerHTML = converter.makeHtml(puzzle.description);
    // console.log();
  });
}

// fetchPuzzle();
fetchAllPuzzles();
