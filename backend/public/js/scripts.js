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

var converter = new showdown.Converter();

async function submitPuzzle(id, answer) {
  const response = await fetch(location.protocol + "//" + location.host + "/submitPuzzle", {
    method: "POST",
    body: JSON.stringify({ id: id, answer: answer }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    console.log("error encountered");
    console.log(console.error());
    return;
  }

  const puzzle = await response.json();
  console.log(puzzle);
}

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
  const response = await fetch(location.protocol + "//" + location.host + "/getAllPuzzles", { method: "GET" });
  // console.log(response);
  if (!response.ok) return;

  const data = await response.json();
  const puzzles = Object.values(data);
  console.log(puzzles);
}

async function fetchUser() {
  const response = await fetch(location.protocol + "//" + location.host + "/getUser", { method: "GET" });
  // console.log(response);
  if (!response.ok) return;

  const data = await response.json();
  console.log(data);
}

async function fetchAllUsers() {
  const response = await fetch(location.protocol + "//" + location.host + "/getAllUsers", { method: "GET" });
  // console.log(response);
  if (!response.ok) return;

  const data = await response.json();
  console.log(data);
}

// async function fetchUser() {
//   const response = await fetch(location.protocol + "//" + location.host + "/getAllPuzzles", { method: "POST" });
//   // console.log(response);
//   if (!response.ok) return;

//   const data = await response.json();
//   const object = Object.values(data);
//   console.log(object);
// }

// fetchUser;

// // fetchPuzzle();
// fetchAllPuzzles();
// submitPuzzle("templatePuzzle", "AHSINV{templateQuestionFlag}");
// fetchUser();
fetchAllUsers();
