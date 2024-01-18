var scoreboard = null;
async function fetchScoreboard() {
  const response = await fetch(location.protocol + "//" + location.host + "/getScoreboard", {
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

// const table = $("#dataTable").DataTable();
const table = new DataTable("#dataTable", {
  columns: [{ title: "" }, { title: "Id" }, { title: "Division" }, { title: "Puzzle Points" }, { title: "Scenario Points" }, { title: "Total Points" }],
});
table
  .on("order.dt search.dt", function () {
    let i = 1;

    table.cells(null, 0, { search: "applied", order: "applied" }).every(function (cell) {
      this.data(i++);
    });
  })
  .draw();

console.log(table);

function updateUI(scoreboard) {
  const dataSet = [];
  console.log(scoreboard);

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

const usernameTextLabel = document.getElementById("username-text-label");
const pointsTextLabel = document.getElementById("points-text-label");
function updateUserUI(user) {
  console.log(user);
  usernameTextLabel.textContent = user.username;
  pointsTextLabel.textContent = `points : ${user.puzzle_points + user.scenario_points}`;
}

const socket = io();
socket.on("scoreboard_update", async (data) => {
  scoreboard = data;
  user = await fetchUser();
  updateUI(scoreboard);
  updateUserUI(user);
});

async function init() {
  scoreboard = await fetchScoreboard();
  updateUI(scoreboard);
  user = await fetchUser();
  updateUserUI(user);
}
init();
