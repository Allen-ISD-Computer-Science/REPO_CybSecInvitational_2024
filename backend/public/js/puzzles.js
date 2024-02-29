async function fetchPuzzle(id) {
  const response = await fetch("getPuzzle", {
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

async function fetchAllPuzzles() {
  const response = await fetch("getAllPuzzles", {
    method: "POST",
    header: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
  try {
    const json = await response.json();
    return json;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function submitPuzzle(id, answer) {
  const response = await fetch("submitPuzzle", {
    method: "POST",
    body: JSON.stringify({ id: id, answer: answer }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
  return response;
}

let allPuzzles = null;
let fuse = null;
let initialized = false;
async function init() {
  let puzzles = await fetchAllPuzzles();
  if (!puzzles) {
    throw "Failed to fetch puzzles!";
  }

  allPuzzles = [...puzzles];

  puzzles.map((value) => {
    switch (value.difficulty) {
      case 0:
        value.difficulty = "Easy";
        break;
      case 1:
        value.difficulty = "Medium";
        break;
      case 2:
        value.difficulty = "Hard";
        break;
      case 3:
        value.difficulty = "Master";
        break;
      default:
        value.difficulty = "Undefined";
        break;
    }
  });

  const fuseOptions = {
    // isCaseSensitive: false,
    // includeScore: false,
    // shouldSort: true,
    // includeMatches: false,
    // findAllMatches: false,
    // minMatchCharLength: 1,
    // location: 0,
    // threshold: 0.6,
    // distance: 100,
    // useExtendedSearch: false,
    // ignoreLocation: false,
    // ignoreFieldNorm: false,
    // fieldNormWeight: 1,
    keys: ["name", "point_value", "difficulty", "category"],
  };

  fuse = new Fuse(puzzles, fuseOptions);
  currentPageNumber = 0;
  initialized = true;
}
init().then(() => {
  if (user) {
    render();
  } else {
    document.addEventListener("user-loaded", render);
  }
});

function queryPuzzles(searchPattern) {
  if (!fuse) return;
  let result = fuse.search(searchPattern);
  return result;
}

var currentPageNumber = 2;

const pageHolder = document.getElementById("puzzlePage");

const puzzleSearchInput = document.getElementById("puzzle-search-input");
const categoryInput = document.getElementById("category-select");
const difficultyInput = document.getElementById("difficulty-select");

function renderPage(puzzles) {
  if (categoryInput.value != "Any" && categoryInput.value != "Category") {
    puzzles = puzzles.filter((value) => {
      return value.category == categoryInput.value;
    });
  }

  if (difficultyInput.value != "Any" && difficultyInput.value != "Difficulty") {
    puzzles = puzzles.filter((value) => {
      return value.difficulty == difficultyInput.value;
    });
  }

  if (puzzles.length <= 0 || !puzzles) {
    pageHolder.innerHTML = `<div class="container text-center text-lg pt-5 pb-5">No Puzzles Found <i class="fas fa-frown"></i></div>`;
    return;
  }

  let inner = `<div class="row">`;
  puzzles.slice(Math.max(0, currentPageNumber * 12), currentPageNumber * 12 + 12).forEach((value) => {
    inner += generateCard(value);
  });

  inner += "</div>";
  pageHolder.innerHTML = inner;

  const buttons = document.getElementsByClassName("puzzle-card-button");
  for (let button of buttons) {
    button.onclick = function () {
      onPuzzleButtonClick(button);
    };
  }

  renderPageNumbers(Math.ceil(puzzles.length / 12));
}

function render() {
  if (!puzzleSearchInput.value) {
    renderPage(allPuzzles);
    return;
  }

  /**@type {Array} */
  let query = queryPuzzles(puzzleSearchInput.value);

  let puzzles = query.map((value) => {
    return value.item;
  });

  renderPage(puzzles);
}

categoryInput.oninput = () => {
  currentPageNumber = 0;
  render();
};
difficultyInput.oninput = () => {
  currentPageNumber = 0;
  render();
};

puzzleSearchInput.addEventListener("input", () => {
  currentPageNumber = 0;
  render();
});

function generateCard(puzzle) {
  const name = puzzle.name;

  const point_value = puzzle.point_value;
  const difficulty = puzzle.difficulty;
  const category = puzzle.category;

  var diffColor = "";
  var diffString = "";

  switch (difficulty) {
    case "Easy":
      diffColor = "success";
      diffString = "Easy";
      break;
    case "Medium":
      diffColor = "warning";
      diffString = "Medium";
      break;
    case "Hard":
      diffColor = "danger";
      diffString = "Hard";
      break;
    case "Master":
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

const puzzleAlert = document.getElementById("puzzle-submit-alert-holder");
const puzzleModalHeader = document.getElementById("puzzle-header");
const puzzleModalBody = document.getElementById("puzzle-body");
const puzzleSubmitInput = document.getElementById("puzzle-submit-input");
const puzzleSubmitButton = document.getElementById("puzzle-submit-button");

async function generatePuzzleModal(id) {
  puzzleSubmitInput.value = "";
  puzzleAlert.innerHTML = "";
  puzzleModalHeader.innerHTML = `<img style="width: 3rem; height: 3rem" src="img/sharp_reloading.svg" />`;
  puzzleModalBody.innerHTML = `<img style="width: 5rem; height: 5rem" src="img/sharp_reloading.svg" />`;

  const puzzle = await fetchPuzzle(id);

  puzzleModalHeader.innerHTML = puzzle.name;
  puzzleModalBody.innerHTML = puzzle.description;
}

async function onPuzzleButtonClick(button) {
  generatePuzzleModal(button.dataset.puzzlename);
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

  if (!result.ok) {
    puzzleAlert.innerHTML = `<p class="text-danger mb-0 align-self-center">${await result.text()}</p>`;
    return;
  }

  const data = await result.json();
  if (data.correct) {
    puzzleAlert.innerHTML = `<p class="text-success mb-0 align-self-center">Success!</p>`;
    return;
  } else if (data.alreadyCompleted) {
    puzzleAlert.innerHTML = `<p class="text-warning mb-0 align-self-center">Already Completed</p>`;
    return;
  } else {
    puzzleAlert.innerHTML = `<p class="text-danger mb-0 align-self-center">Incorrect Flag !!!</p>`;
    return;
  }
};

const currentPageBefore = document.getElementById("current-page-before");
const currentPage = document.getElementById("current-page");
const currentPageAfter = document.getElementById("current-page-after");

const previousPage = document.getElementById("previous-page-button");
const nextPage = document.getElementById("next-page-button");

function renderPageNumbers(maxPages) {
  const currentNum = currentPageNumber + 1;
  const prevNum = currentNum - 1;
  const nextNum = currentNum + 1;

  currentPage.textContent = String(currentNum);

  if (prevNum <= 0) {
    currentPageBefore.parentElement.classList.add("disabled");
    currentPageBefore.textContent = "";
    previousPage.parentElement.classList.add("disabled");
  } else {
    currentPageBefore.parentElement.classList.remove("disabled");
    currentPageBefore.textContent = String(prevNum);
    previousPage.parentElement.classList.remove("disabled");
  }

  if (nextNum > maxPages) {
    currentPageAfter.parentElement.classList.add("disabled");
    currentPageAfter.textContent = "";
    nextPage.parentElement.classList.add("disabled");
  } else {
    currentPageAfter.parentElement.classList.remove("disabled");
    currentPageAfter.textContent = String(nextNum);
    nextPage.parentElement.classList.remove("disabled");
  }

  previousPage.onclick = () => {
    currentPageNumber -= 1;
    render();
  };
  nextPage.onclick = () => {
    currentPageNumber += 1;
    render();
  };
}

socket.on("update_event", async () => {
  render();
});
