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
  return data;
}

const usernameTextLabel = document.getElementById("username-text-label");
const pointsTextLabel = document.getElementById("points-text-label");

function updateUI(user) {
  if (usernameTextLabel) usernameTextLabel.textContent = user.username;
  if (pointsTextLabel) pointsTextLabel.textContent = `points : ${user.points}`;
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
