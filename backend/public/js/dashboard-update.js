const puzzlePointsCardLabel = document.getElementById("puzzle-points-text-label");
const scenarioPointsCardLabel = document.getElementById("scenario-points-text-label");
const totalPointsCardLabel = document.getElementById("total-points-text-label");

function updateUI(user) {
  puzzlePointsCardLabel.textContent = String(user.puzzle_points);
  scenarioPointsCardLabel.textContent = String(user.scenario_points);
  totalPointsCardLabel.textContent = String(user.puzzle_points + user.scenario_points);
}

socket.on("scoreboard_update", async (data) => {
  updateUI(user);
});

document.addEventListener("user-loaded", () => {
  updateUI(user);
});
