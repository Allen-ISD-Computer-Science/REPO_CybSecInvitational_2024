var socket = null;
if (location.href.includes("/vapor/soohan-cho")) {
  socket = io({
    path: "/vapor/soohan-cho/socket.io",
  });
} else {
  socket = io();
}

var scoreboard = null;

const cardHolder = document.getElementById("card_holder");
const templateCard = document.getElementById("template_card");
const cardHeight = templateCard.getBoundingClientRect().height;
console.log(cardHeight);

function getHeightAtRank(card, rank) {
  let currentHeight = card.offsetTop - cardHolder.offsetTop;
  let height = rank * card.offsetHeight + 4 * (rank + 1);
  if (rank > 0) {
    height - 5;
  }
  return height - currentHeight;
}

function updateUserScore(user, rank) {
  console.log(user);
  let card = cardHolder.getElementsByClassName(user.username).item(0);

  cardHolder.child;

  if (!card) {
    let newCard = templateCard.cloneNode(true);
    newCard.style.display = "block";
    newCard.classList.add(user.username);
    cardHolder.append(newCard);
    card = newCard;
  }

  const ranking = card.getElementsByClassName("card_ranking").item(0);
  const teamid = card.getElementsByClassName("card_teamid").item(0);
  const school = card.getElementsByClassName("card_school").item(0);
  const division = card.getElementsByClassName("card_division").item(0);
  const puzzlePoints = card.getElementsByClassName("card_puzzle_points").item(0);
  const scenarioPoints = card.getElementsByClassName("card_scenario_points").item(0);
  const totalPoints = card.getElementsByClassName("card_total_points").item(0);

  ranking.textContent = String(rank + 1);
  teamid.textContent = String(user.username);
  school.textContent = "Placeholder";
  switch (user.division) {
    case 0:
      card.classList.add("border-left-light");
      division.textContent = "Silver";
      break;
    case 1:
      card.classList.add("border-left-warning");
      division.textContent = "Gold";
      break;
    case 2:
      division.textContent = "Platinum";
      card.classList.add("border-left-secondary");
      break;
    default:
      division.textContent = "unknown";
      break;
  }
  puzzlePoints.textContent = String(user.puzzle_points);
  scenarioPoints.textContent = String(user.scenario_points);
  totalPoints.textContent = String(user.puzzle_points + user.scenario_points);

  console.log(getHeightAtRank(card, rank));
  anime({
    targets: `.${user.username}`,
    translateY: `${getHeightAtRank(card, rank)}px`,
  });
}

function updateUI() {
  if (!scoreboard) return;
  scoreboard.forEach((user, index) => {
    updateUserScore(user, index);
  });
}

window.onresize = function () {
  updateUI();
};

socket.on("update_event", async (data) => {
  console.log("updating");

  data.sort((a, b) => {
    return -(a.puzzle_points + a.scenario_points - (b.puzzle_points + b.scenario_points));
  });

  scoreboard = data;

  updateUI();
});
