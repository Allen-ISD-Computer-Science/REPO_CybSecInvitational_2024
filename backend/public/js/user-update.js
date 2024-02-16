var socket = null;
if (location.href.includes("/vapor/soohan-cho")) {
  socket = io({
    path: "/vapor/soohan-cho/socket.io",
  });
} else {
  socket = io();
}

//alerts
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

  holder.innerHTML += `<div class="fixed-top alert alert-${level} alert-dismissible fade show" role="alert" style="display: block; z-index: 100; top: 5rem; left: 50%; transform: translate(-50%, 0)">
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
  ${message}
</div>`;
});

const userLoaded = new CustomEvent("user-loaded");
const userUpdated = new CustomEvent("user-updated");

var user = null;

async function fetchUser() {
  const response = await fetch("getUser", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data;
}

const label = document.getElementById("current_round_label");
const timer = document.getElementById("current_round_timer");

let timerInterval = null;
let currentEndTime = null;

function pad(number, length) {
  return ("000" + number).slice(-length);
}

function updateTimer() {
  let currentTime = Date.now();
  let timeLeft = new Date(currentEndTime - currentTime);

  if (timeLeft <= 0) return;

  let timeStr = "";

  timeStr += pad(timeLeft.getUTCHours(), 2) + ":";
  timeStr += pad(timeLeft.getUTCMinutes(), 2) + ":";
  timeStr += pad(timeLeft.getUTCSeconds(), 2) + " ";
  timeStr += "<small>" + pad(timeLeft.getUTCMilliseconds(), 3) + "</small>";

  timer.innerHTML = timeStr;
  requestAnimationFrame(updateTimer);
}

function updateCurrentRoundUI(data) {
  if (!data) {
    label.textContent = "";
    timer.innerHTML = "";

    return;
  }

  currentEndTime = data.endTime;
  console.log(data);
  label.textContent = data.type;
  updateTimer();
}

const usernameTextLabel = document.getElementById("username-text-label");
const pointsTextLabel = document.getElementById("points-text-label");

console.log(pointsTextLabel, usernameTextLabel);
function updateUserUI(user) {
  console.log("updating!");
  console.log(user);
  usernameTextLabel.textContent = user.username;
  pointsTextLabel.textContent = `points : ${user.puzzle_points + user.scenario_points}`;
}

socket.on("update_event", async (data) => {
  updateCurrentRoundUI(data.currentRound);

  console.log(data);
  user = await fetchUser();
  updateUserUI(user);
  document.dispatchEvent(userUpdated);
});

async function init() {
  user = await fetchUser();
  updateUserUI(user);
  document.dispatchEvent(userLoaded);
}
init();

socket.on("round_start", (data) => {
  switch (data?.type) {
    case "BattleRound":
      window.location.replace("battleRound");
      break;
    case "PuzzleRound":
      window.location.replace("puzzles");
      break;
    default:
      break;
  }
});

socket.on("round_end", (data) => {
  window.location.replace("home");
});
