var scoreboard = null;
async function fetchScoreboard() {
  const response = await fetch("getScoreboard", {
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

// const table = $("#dataTable").DataTable();
const table = new DataTable("#dataTable", {
  columns: [{ title: "" }, { title: "Id" }, { title: "Division" }, { title: "Puzzle Points" }, { title: "Scenario Points" }, { title: "Total Points" }],
  order: [[5, "desc"]],
});
table
  .on("order.dt search.dt", function () {
    let i = 1;

    table.cells(null, 0, { search: "applied", order: "applied" }).every(function (cell) {
      this.data(i++);
    });
  })
  .draw();

function updateUI(scoreboard) {
  const dataSet = [];
  for (let user of scoreboard) {
    switch (user.division) {
      case 0:
        user.division = "Silver";
        break;
      case 0:
        user.division = "Gold";
        break;
      case 0:
        user.division = "Platinum";
        break;
      default:
        user.division = "unknown";
        break;
    }
    dataSet.push(["", String(user.username), String(user.division), String(user.puzzle_points), String(user.scenario_points), String(user.puzzle_points + user.scenario_points)]);
  }

  table.clear();
  table.rows.add(dataSet);
  table.draw(false);
}

socket.on("update_event", async (data) => {
    console.log("updating")

    scoreboard = data;
  updateUI(scoreboard);
});

async function init() {
  scoreboard = await fetchScoreboard();
  updateUI(scoreboard);
}

init();
