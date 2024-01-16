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

async function fetchPuzzle(id) {
  const response = await fetch(location.protocol + "//" + location.host + "/getMultiplePuzzles", {
    method: "POST",
    body: JSON.stringify({ id: id }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function queryPuzzles(category, difficulty, skip) {
  console.log(difficulty);
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
  if (difficulty !== 0 && !difficulty) {
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

function generateCard(puzzle) {
  console.log(puzzle);
  const name = puzzle.name;
  const point_value = puzzle.point_value;
  const difficulty = puzzle.difficulty;
  const category = puzzle.category;

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

async function generatePage(category, difficulty, pageNum) {
  const puzzles = await queryPuzzles(category, difficulty, Math.floor(pageNum) * 12);
  console.log(puzzles);
  if (!puzzles || puzzles.length <= 0) {
    return `<div class="container text-center text-lg pt-5 pb-5">No Puzzles Found <i class="fas fa-frown"></i></div>`;
  }

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

var puzzleCategory = null;
var puzzleDifficulty = null;
var pageNum = 0;

const categoryDropdown = document.getElementById("category-dropdown");
const categoryOptions = document.getElementsByClassName("puzzle-category-option");
for (let element of categoryOptions) {
  element.onclick = function () {
    puzzleCategory = element.dataset.option;
    categoryDropdown.textContent = element.textContent;
  };
}

const difficultyDropdown = document.getElementById("difficulty-dropdown");
const difficultyOptions = document.getElementsByClassName("puzzle-difficulty-option");
for (let element of difficultyOptions) {
  element.onclick = function () {
    difficultyDropdown.textContent = element.textContent;

    switch (element.dataset.option) {
      case "Easy":
        puzzleDifficulty = 0;
        break;
      case "Medium":
        puzzleDifficulty = 1;
        break;
      case "Hard":
        puzzleDifficulty = 2;
        break;
      case "Master":
        puzzleDifficulty = 3;
        break;
      default:
        puzzleDifficulty = null;
        console.log("Invalid difficulty option");
        break;
    }
  };
}

const searchButton = document.getElementById("puzzle-search");
const pageHolder = document.getElementById("puzzlePage");
searchButton.onclick = function () {
  console.log("clicked");

  console.log(puzzleCategory, puzzleDifficulty);
  generatePage(puzzleCategory, puzzleDifficulty, pageNum).then((res) => {
    pageHolder.innerHTML = res;
  });
};
generatePage(null, null, 0).then((res) => (pageHolder.innerHTML = res));

const puzzleModalHeader = document.getElementById("puzzle-header");
const puzzleModalBody = document.getElementById("puzzle-body");

async function generatePuzzleModal(id) {
  const puzzle = fetchPuzzle(id);

  puzzleModalHeader = puzzle.name;
  puzzleModalBody.innerHTML = puzzle.description;
}

generatePuzzleModal(" ");
