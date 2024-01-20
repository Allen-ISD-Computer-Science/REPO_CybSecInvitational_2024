async function fetchPuzzle(id) {
  const response = await fetch(location.protocol + "//" + location.host + "/getPuzzle", {
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

const puzzleSearchInput = document.getElementById("puzzle-search-input");
async function queryPuzzles(category, difficulty, skip) {
  console.log(skip);
  const body = {
    query: { category: category, difficulty: difficulty },
    sort: { name: 1 },
    projection: {},
    count: 12,
    skip: skip,
  };

  if (puzzleSearchInput.value) {
    body.query.name = puzzleSearchInput.value;
  }

  if (!category) {
    delete body.query.category;
  }
  if (difficulty !== 0 && !difficulty) {
    delete body.query.difficulty;
  }

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

const currentPageLabel = document.getElementById("current-page");
const prevPageButton = document.getElementById("previous-page-button");
const nextPageButton = document.getElementById("next-page-button");

var pageDebounce = false;
prevPageButton.onclick = function (evt) {
  evt.preventDefault();
  pageNum -= 1;
  pageNum = Math.max(0, pageNum);
  generatePage(puzzleCategory, puzzleDifficulty, pageNum);
};
nextPageButton.onclick = function (evt) {
  evt.preventDefault();
  pageNum += 1;
  pageNum = Math.min(pageNum, pageNum); //add some way to get max # of pages
  generatePage(puzzleCategory, puzzleDifficulty, pageNum);
};

function generateCard(puzzle) {
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

  var inactive = "";
  if (user.completed_puzzles[name]) {
    inactive = "background-color: #eaecf4 !important";
  }

  return `<div class="col-xl-3 col-md-6 mb-4">
                <div type="button" data-puzzlename="${name}" class="card border-left-${diffColor} shadow h-100 py-2 w-100 puzzle-card-button" data-toggle="modal" data-target="#puzzleModal" style="${inactive}">
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
const pageHolder = document.getElementById("puzzlePage");
async function generatePage(category, difficulty, pageNum) {
  currentPageLabel.innerHTML = String(pageNum + 1);
  pageHolder.innerHTML = `<div class="container-fluid d-flex justify-content-center p-5">
  <img src="img/sharp_reloading.svg" />
  </div>`;

  const puzzles = await queryPuzzles(category, difficulty, Math.floor(pageNum) * 12);
  if (!puzzles || puzzles.length <= 0) {
    pageHolder.innerHTML = `<div class="container text-center text-lg pt-5 pb-5">No Puzzles Found <i class="fas fa-frown"></i></div>`;
    return;
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

  pageHolder.innerHTML = page;

  const buttons = document.getElementsByClassName("puzzle-card-button");
  for (let button of buttons) {
    button.onclick = function () {
      onPuzzleButtonClick(button);
    };
  }
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

function navigateToPage() {
  generatePage(puzzleCategory, puzzleDifficulty, pageNum);
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
        break;
    }
  };
}

var searchDebounce = false;
const searchButton = document.getElementById("puzzle-search");
searchButton.onclick = function () {
  if (searchDebounce) return;

  searchDebounce = true;
  pageNum = 0;
  generatePage(puzzleCategory, puzzleDifficulty, pageNum);
  setTimeout(() => {
    searchDebounce = false;
  }, 1500);
};

document.addEventListener("user-loaded", () => {
  generatePage(null, null, 0);
});

const puzzleAlert = document.getElementById("puzzle-submit-alert-holder");
const puzzleModalHeader = document.getElementById("puzzle-header");
const puzzleModalBody = document.getElementById("puzzle-body");
const puzzleSubmitInput = document.getElementById("puzzle-submit-input");
const puzzleSubmitButton = document.getElementById("puzzle-submit-button");

async function generatePuzzleModal(id) {
  puzzleSubmitInput.value = "";
  puzzleAlert.innerHTML = "";
  puzzleModalHeader.innerHTML = `<img style="width: 3rem; height: 3rem" src="img/Eclipse-1s-200px(1).svg" />`;
  puzzleModalBody.innerHTML = `<img style="width: 5rem; height: 5rem" src="img/sharp_reloading.svg" />`;

  const puzzle = await fetchPuzzle(id);

  puzzleModalHeader.innerHTML = puzzle.name;
  puzzleModalBody.innerHTML = puzzle.description;
}

async function onPuzzleButtonClick(button) {
  generatePuzzleModal(button.dataset.puzzlename);
}

async function submitPuzzle(id, answer) {
  const response = await fetch(location.protocol + "//" + location.host + "/submitPuzzle", {
    method: "POST",
    body: JSON.stringify({ id: id, answer: answer }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return;
  }

  const data = await response.json();
  return data;
}

var submitDebounce = false;
puzzleSubmitButton.onclick = async function (evt) {
  evt.preventDefault();
  if (submitDebounce) return;
  submitDebounce = true;
  setTimeout(() => {
    submitDebounce = false;
  }, 3000);

  if (!puzzleSubmitInput.value) {
    puzzleAlert.innerHTML = `<p class="text-warning mb-0 align-self-center">Enter a flag in!</p>`;
    return;
  }

  const result = await submitPuzzle(puzzleModalHeader.textContent, puzzleSubmitInput.value);
  if (!result) {
    puzzleAlert.innerHTML = `<p class="text-dark mb-0 align-self-center"><b>something went wrong on the server</b></p>`;
    return;
  }

  if (result.correct) {
    puzzleAlert.innerHTML = `<p class="text-success mb-0 align-self-center">Success!</p>`;
    return;
  } else if (result.alreadyCompleted) {
    puzzleAlert.innerHTML = `<p class="text-warning mb-0 align-self-center">Already Completed</p>`;
    return;
  } else {
    puzzleAlert.innerHTML = `<p class="text-danger mb-0 align-self-center">Incorrect Flag !!!</p>`;
    return;
  }
};
