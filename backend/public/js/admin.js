async function submitOperation(operation, operand, arguments) {
  console.log(operation, operand, arguments);

  const response = await fetch("admin/command", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      operation: operation,
      operand: operand,
      arguments: arguments,
    }),
  });
  console.log(response);

  return response;
}

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
