async function joinBattleRound(bid) {
  const response = await fetch("battleRound/join", {
    method: "POST",
    body: JSON.stringify({
      bid: bid,
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

async function fetchStatus() {
  const response = await fetch("battleRound/getStatus", {
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

async function fetchPuzzle(id) {
  const response = await fetch("battleRound/getPuzzle", {
    method: "POST",
    body: JSON.stringify({
      id: id,
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

  const buttons = document.getElementsByClassName("puzzle-card-button");
  for (let button of buttons) {
    button.onclick = function () {
      onPuzzleButtonClick(button);
    };
  }
}

function generateCard(puzzle) {
  const name = puzzle.name;

  var diffColor = "";
  var diffString = "";

  var inactive = "";
  if (puzzle.completed) {
    inactive = "background-color: #eaecf4 !important";
  }

  return `<div class="col-xl-6 col-md-6 mb-4">
                  <div type="button" id="puzzle_${name}" data-puzzlename="${name}" class="sheen card border-left-warning shadow h-100 py-5 w-100 puzzle-card-button" data-toggle="modal" data-target="#puzzleModal" style="${inactive}">
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

var puzzles = null;
async function attemptLoad() {
  puzzles = await fetchPuzzles();
  console.log(puzzles);

  if (puzzles["notStarted"]) {
    puzzleContainer.innerHTML = `<div class="container text-center text-lg pt-5 pb-5">No Current Battle Round <i class="fas fa-frown"></i></div>`;
    return;
  }

  generateCardRow(puzzles);
}
// Modal
const puzzleAlert = document.getElementById("puzzle-submit-alert-holder");
const puzzleModalHeader = document.getElementById("puzzle-header");
const puzzleModalBody = document.getElementById("puzzle-body");
const puzzleSubmitInput = document.getElementById("puzzle-submit-input");
const puzzleSubmitButton = document.getElementById("puzzle-submit-button");

async function generatePuzzleModal(id) {
  console.log(id);
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
    const puzzleCard = document.getElementById("puzzle_" + puzzleModalHeader.textContent);
    console.log(puzzleCard);
    if (puzzleCard) {
      puzzleCard.style = "background-color: #eaecf4 !important";
    }

    return;
  } else if (result.alreadyCompleted) {
    puzzleAlert.innerHTML = `<p class="text-warning mb-0 align-self-center">Already Completed</p>`;
    return;
  } else {
    puzzleAlert.innerHTML = `<p class="text-danger mb-0 align-self-center">Incorrect Flag !!!</p>`;
    return;
  }
};

const joinUi = document.getElementById("battle_round_join");
const mainUi = document.getElementById("battle_round_main");

const amountSlider = document.getElementById("battle_round_bid_slider");
const amountDisplay = document.getElementById("battle_round_bid_amount");
const loadingDisplay = document.getElementById("battle_round_loading");

amountSlider.oninput = function () {
  let percentage = Math.max(amountSlider.value / 100, minBid);
  let bid = Math.max(Math.min(Math.floor(user.puzzle_points * percentage), user.puzzle_points), 0);
  amountDisplay.textContent = `Points: ${bid}`;
};

const confirmButton = document.getElementById("battle_round_bid_confirm");
var doubleCheck = false;
confirmButton.onclick = async function (ev) {
  if (!doubleCheck) {
    confirmButton.value = "Are you sure?";
    doubleCheck = true;
    return;
  } else {
    let result = await joinBattleRound(Math.max(amountSlider.value / 100, minBid));
    console.log(result);
    if (result.alreadyJoined) return;

    joinUi.style.display = "none";
    mainUi.style.display = "block";

    attemptLoad();
  }
};

const minutesDisplay = document.getElementById("battle_round_minutes");
const secondsDisplay = document.getElementById("battle_round_seconds");
const millisecondsDisplay = document.getElementById("battle_round_milliseconds");

const timeText = document.getElementById("battle_round_time_text");

var endTime = 0;
function msToTime(duration) {
  var date = new Date(duration);
  return { ms: date.getUTCMilliseconds(), s: date.getUTCSeconds(), m: date.getUTCMinutes() };
}

function pad(number, length) {
  return ("000" + number).slice(-length);
}

const clockUpdateInterval = 20;
var warningStage = false;
var dangerStage = false;
function updateBattleRoundTime() {
  let timeLeft = Math.max(0, endTime - Date.now());
  const time = msToTime(timeLeft);

  if (!warningStage && timeLeft < 60000) {
    timeText.classList.add("text-warning");
    timeText.classList.add("shakeSmall");

    warningStage = true;
  } else if (!dangerStage && timeLeft < 30000) {
    timeText.classList.remove("text-warning");
    timeText.classList.remove("shakeSmall");
    timeText.classList.add("text-danger");
    timeText.classList.add("shakeBig");
    dangerStage = true;
  }

  minutesDisplay.textContent = pad(time.m, 2);
  secondsDisplay.textContent = pad(time.s, 2);
  millisecondsDisplay.textContent = pad(time.ms, 3);

  setTimeout(updateBattleRoundTime, clockUpdateInterval);
}

let minBid = 0.1;
document.addEventListener("user-loaded", async () => {
  const result = await fetchStatus();
  if (result.alreadyJoined) {
    loadingDisplay.style.display = "none";
    mainUi.style.display = "block";
    attemptLoad();
  } else if (result.notStarted) {
    window.location.replace("home");
  } else {
    loadingDisplay.style.display = "none";
    joinUi.style.display = "block";
  }

  minBid = result.minBid;
  amountSlider.min = Math.floor(minBid * 100);

  if (result.endTime) {
    endTime = result.endTime;
    updateBattleRoundTime();
  }
});

socket.on("round_end", () => {
  window.location.replace("home");
  console.log("battle round ended");
});
