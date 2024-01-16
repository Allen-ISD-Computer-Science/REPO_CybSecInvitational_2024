async function submitPuzzle(id, answer) {
  const response = await fetch(location.protocol + "//" + location.host + "/submitPuzzle", {
    method: "POST",
    body: JSON.stringify({ id: id, answer: answer }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    console.log("error encountered");
    console.log(console.error());
    return;
  }

  const puzzle = await response.json();
  console.log(puzzle);
}

function generateCard(puzzle) {
  console.log(puzzle);
  const name = puzzle.name;
  const point_value = puzzle.point_value;
  const difficulty = puzzle.difficulty;
  const category = puzzle.category;

  console.log(difficulty);

  var diffColor = "";
  var diffString = "";

  switch (difficulty) {
    case 0:
      diffColor = "success";
      diffString = "Easy";
      break;
    case 1:
      diffColor = "warning";
      diffString = "Medium";
      break;
    case 2:
      diffColor = "danger";
      diffString = "Hard";
      break;
    case 3:
      diffColor = "dark";
      diffString = "Master";
      break;
    default:
      diffColor = "dark";
      diffString = "";
      break;
  }

  return `<div class="col-xl-3 col-md-6 mb-4">
                <div type="button" class="card border-left-${diffColor} shadow h-100 py-2 w-100" data-toggle="modal" data-target="#puzzleModal">
                  <div class="card-body">
                    <div class="row no-gutters align-items-center">
                      <div class="col mr-2">
                        <div class="text-xs font-weight-bold text-${diffColor} text-uppercase mb-1">${diffString}</div>
                        <div class="text-s font-weight-bold">${category}</div>
                        <div class="h5 mb-0 font-weight-bold text-gray-800">${name}<br />${point_value} Points</div>
                      </div>
                      <div class="col-auto">
                        <i class="fas fa-2x text-gray-300"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              `;
}

async function generatePage() {
  const puzzles = await queryPuzzles("WebExploitation", null, 0);

  var page = "";

  var count = 0;
  puzzles.forEach((puzzle) => {
    if (count == 0) {
      page += `<div class="row">`;
    }
    page += generateCard(puzzle);
    if (count == 3) {
      page += "</div>";
    }
    count += 1;
    if (count > 3) count = 0;
  });

  if (count != 0) {
    page += "</div>";
  }

  return page;
}
const pageHolder = document.getElementById("puzzlePage");
generatePage().then((res) => (pageHolder.innerHTML = res));

async function queryPuzzles(category, difficulty, skip) {
  const body = {
    query: { category: category, difficulty: difficulty },
    sort: { name: 1 },
    projection: {},
    count: 12,
    skip: skip,
  };

  if (!category) {
    delete body.query.category;
  }
  if (!difficulty) {
    delete body.query.difficulty;
  }

  console.log(body);

  const response = await fetch(location.protocol + "//" + location.host + "/getMultiplePuzzles", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    console.log("failed to fetch puzzles");
    return;
  }

  const data = await response.json();
  return data;
}
