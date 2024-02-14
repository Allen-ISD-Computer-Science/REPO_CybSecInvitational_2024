console.log(location.href);

var socket = null;
if (location.href.includes("/vapor/soohan-cho")) {
  socket = io({
    path: "/vapor/soohan-cho/socket.io",
  });
} else {
  socket = io();
}

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

const usernameTextLabel = document.getElementById("username-text-label");
const pointsTextLabel = document.getElementById("points-text-label");
function updateUserUI(user) {
  usernameTextLabel.textContent = user.username;
  pointsTextLabel.textContent = `points : ${user.puzzle_points + user.scenario_points}`;
}

socket.on("update_event", async () => {
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
