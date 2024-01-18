var user = null;
async function fetchUser() {
  const response = await fetch(location.protocol + "//" + location.host + "/getUser", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  localStorage.setItem("user", data);
  console.log(localStorage.getItem("user"));
  return data;
}

const usernameTextLabel = document.getElementById("username-text-label");
const pointsTextLabel = document.getElementById("points-text-label");

const puzzlePointsCardLabel = document.getElementById("puzzle-points-text-label");
const scenarioPointsCardLabel = document.getElementById("scenario-points-text-label");
const totalPointsCardLabel = document.getElementById("total-points-text-label");

function updateUI(user) {
  console.log(user);
  usernameTextLabel.textContent = user.username;
  pointsTextLabel.textContent = `points : ${user.puzzle_points + user.scenario_points}`;

  puzzlePointsCardLabel.textContent = String(user.puzzle_points);
  scenarioPointsCardLabel.textContent = String(user.scenario_points);
  totalPointsCardLabel.textContent = String(user.puzzle_points + user.scenario_points);
}

const socket = io();
socket.on("scoreboard_update", async (data) => {
  user = await fetchUser();
  updateUI(user);
});

async function init() {
  user = await fetchUser();
  updateUI(user);
}
init();
