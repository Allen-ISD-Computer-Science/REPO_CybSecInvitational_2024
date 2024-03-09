async function submitOperation(command) {
  const response = await fetch("adminCommand", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      command: command,
    }),
  });
  console.log(response);

  return response;
}

const commandBar = document.getElementById("admin_command_bar");
const output = document.getElementById("admin_output");

commandBar.addEventListener("keypress", async (evt) => {
  if (evt.key === "Enter") {
    evt.preventDefault();
    console.log(commandBar.value);
    const result = await submitOperation(commandBar.value);
    if (result.ok) {
      output.innerHTML += "Success!" + "<br />";
    } else {
      output.innerHTML += (await result.text()) + "<br />";
    }
  }
});

const pointsSection = document.getElementById("admin_points_section");
const pointsOperation = document.getElementById("admin_points_operation");
const pointsAmount = document.getElementById("admin_points_amount");
const pointsTarget = document.getElementById("admin_points_target");
const pointsSubmit = document.getElementById("admin_points_submit");

pointsSubmit.addEventListener("click", async (evt) => {
  evt.preventDefault();

  let section = pointsSection.value;
  if (section == "Select Section") return;

  let operation = pointsOperation.value;
  if (operation == "Select Operation") return;

  let amount = Number(pointsAmount.value);
  let target = pointsTarget.value;

  let result = await submitOperation(operation, section, {
    target: target,
    amount: amount,
  });

  console.log(result);
});

const completedPuzzlesOperation = document.getElementById("admin_puzzles_operation");
const completedPuzzlesId = document.getElementById("admin_puzzles_id");
const completedPuzzlesTarget = document.getElementById("admin_puzzles_target");
const completedPuzzlesSubmit = document.getElementById("admin_puzzles_submit");

completedPuzzlesSubmit.addEventListener("click", async (evt) => {
  evt.preventDefault();

  let target = completedPuzzlesTarget.value;
  let puzzleId = completedPuzzlesId.value;
  let operation = completedPuzzlesOperation.value;

  if (!puzzleId || !target || !operation) return; //incomplete command

  let result = await submitOperation(operation, "COMPLETED_PUZZLE", {
    target: target,
    id: puzzleId,
  });
});

const divisionSelection = document.getElementById("admin_division_selection");
const divisionTarget = document.getElementById("admin_division_target");
const divisionSubmit = document.getElementById("admin_division_submit");

divisionSubmit.addEventListener("click", async (evt) => {
  evt.preventDefault();

  let division = divisionSelection.value;
  let target = divisionTarget.value;

  if (!division || !target) return;

  console.log(Number(division));

  let result = await submitOperation("SET", "DIVISION", {
    target: target,
    division: Number(division),
  });
});

const roundTypeSelection = document.getElementById("admin_round_type");
const roundIdSelection = document.getElementById("admin_round_id");
const roundDuration = document.getElementById("admin_round_duration");
const roundStart = document.getElementById("admin_round_start");
const roundEnd = document.getElementById("admin_round_end");

roundStart.addEventListener("click", async (evt) => {
  evt.preventDefault();

  let id = roundIdSelection.value;
  let duration = roundDuration.value;
  let type = roundTypeSelection.value;

  if (!id || !duration || !type) return;

  let result = await submitOperation("START", type, {
    id: id,
    duration: duration,
  });
});

roundEnd.addEventListener("click", async (evt) => {
  evt.preventDefault();

  let result = await submitOperation("END", "ROUND", {});
});

const alertLevelSelection = document.getElementById("admin_alert_selection");
const alertMessage = document.getElementById("admin_alert_message");
const alertSend = document.getElementById("admin_alert_send");

alertSend.addEventListener("click", async (evt) => {
  evt.preventDefault();

  let message = alertMessage.value;
  let level = alertLevelSelection.value;

  if (!message || !level) return;

  let result = await submitOperation("ALERT", level, { message: message });
});
