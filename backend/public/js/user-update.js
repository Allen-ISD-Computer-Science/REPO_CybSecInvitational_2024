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

  if (timeLeft <= 0) {
    timer.innerHTML = "Round Ended!";
    return;
  }

  let timeStr = "";

  timeStr += pad(timeLeft.getUTCHours(), 2) + ":";
  timeStr += pad(timeLeft.getUTCMinutes(), 2) + ":";
  timeStr += pad(timeLeft.getUTCSeconds(), 2) + " ";
  timeStr += "<small>" + pad(timeLeft.getUTCMilliseconds(), 3) + "</small>";

  timer.innerHTML = timeStr;
  requestAnimationFrame(updateTimer);
}

function updateCurrentRoundUI(data) {
  if (!data) return;

  if (Object.values(data).length <= 0) {
    label.textContent = "No Round Started Yet!";
    timer.innerHTML = "";
    currentEndTime = Date.now();
  } else {
    currentEndTime = data.endTime;
    label.textContent = data.type;
    updateTimer();
  }
}

const usernameTextLabel = document.getElementById("username-text-label");
const pointsTextLabel = document.getElementById("points-text-label");

function updateUserUI(user) {
  usernameTextLabel.textContent = user.username;
  pointsTextLabel.textContent = `points : ${user.puzzle_points + user.scenario_points}`;
}

socket.on("update_event", async (data) => {
  console.log(data);
  updateCurrentRoundUI(data.currentRound);
  user = await fetchUser();
  updateUserUI(user);
  document.dispatchEvent(userUpdated);

  localStorage.setItem("user_update_current_round", JSON.stringify(data.currentRound));
});

function fetchLocalData() {
  try {
    return JSON.parse(localStorage.getItem("user_update_current_round"));
  } catch {
    return null;
  }
}

async function init() {
  console.log("initializing");

  let localCurrentRound = fetchLocalData();
  if (localCurrentRound) {
    updateCurrentRoundUI(localCurrentRound);
  }

  user = await fetchUser();
  updateUserUI(user);
  document.dispatchEvent(userLoaded);
}
init();

socket.on("round_start", (data) => {
  switch (data?.type) {
    case "BattleRound":
      localStorage.setItem("user_update_current_round", JSON.stringify(data));
      window.location.replace("battleRound");
      break;

    case "PuzzleRound":
      localStorage.setItem("user_update_current_round", JSON.stringify(data));
      window.location.replace("puzzles");
      break;

    default:
      break;
  }
});

socket.on("round_end", (data) => {
  localStorage.removeItem("user_update_current_round");
  window.location.replace("home");
});
