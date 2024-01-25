const socket = io();

const userLoaded = new CustomEvent("user-loaded");

var user = null;

async function fetchUser() {
  const response = await fetch(location.protocol + "//" + location.host + relative_path + "/getUser", {
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
function updateUserUI(user) {
  usernameTextLabel.textContent = user.username;
  pointsTextLabel.textContent = `points : ${user.puzzle_points + user.scenario_points}`;
}

socket.on("update_event", async () => {
  user = await fetchUser();
  updateUserUI(user);
});

async function init() {
  user = await fetchUser();
  updateUserUI(user);
  document.dispatchEvent(userLoaded);
}
init();
