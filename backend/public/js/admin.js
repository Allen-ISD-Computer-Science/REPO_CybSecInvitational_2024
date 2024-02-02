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

  return response;
}

const pointsSection = document.getElementById("admin_points_section");
const pointsOperation = document.getElementById("admin_points_operation");
const pointsAmount = document.getElementById("admin_points_amount");
const pointsTarget = document.getElementById("admin_points_target");
const pointsSubmit = document.getElementById("admin_points_submit");

pointsSubmit.onclick = async (evt) => {
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
};
