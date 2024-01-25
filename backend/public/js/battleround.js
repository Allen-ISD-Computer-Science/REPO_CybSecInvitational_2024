async function fetchPuzzles() {
  const response = await fetch("battleRound/getPuzzles", {
    method: "POST",
    body: JSON.stringify(),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function joinBattleRound() {
  const response = await fetch("battleRound/join", {
    method: "POST",
    body: JSON.stringify({
      bid: 0,
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function submitPuzzle(id, answer) {
  const response = await fetch("battleRound/submitPuzzle", {
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

const puzzleContainer = document.getElementById("puzzleRow");
function generateCardRow(puzzles) {
  var html = "";

  puzzles.forEach((puzzle) => {
    html += generateCard(puzzle);
  });
  puzzleContainer.innerHTML = html;
}

function generateCard(puzzle) {
  const name = puzzle.name;

  var diffColor = "";
  var diffString = "";

  var inactive = "";
  if (user.completed_puzzles[name]) {
    inactive = "background-color: #eaecf4 !important";
  }

  return `<div class="col-xl-3 col-md-6 mb-4">
                  <div type="button" data-puzzlename="${name}" class="card border-left-warning shadow h-100 py-2 w-100 puzzle-card-button" data-toggle="modal" data-target="#puzzleModal" style="${inactive}">
                    <div class="card-body">
                      <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                          <div class="h5 mb-0 font-weight-bold text-gray-800">${name}</div>
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

var puzzles = null;
async function attemptLoad() {
  puzzles = await fetchPuzzles();
  generateCardRow(puzzles);
}

document.addEventListener("user-loaded", async () => {
  await joinBattleRound();
  attemptLoad();
});

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
