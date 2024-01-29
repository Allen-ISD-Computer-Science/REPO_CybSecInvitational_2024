var socket = null;
if (location.href.includes("/vapor/soohan-cho")) {
  socket = io({
    path: "/vapor/soohan-cho/socket.io",
  });
} else {
  socket = io();
}

//<div id="template_card" class="border rounded border-left-light p-0 m-0 mb-1" style="display: none">
{
  /* <div class="row p-3 border-left-primary m-0">
<div class="pr-3 card_ranking"></div>
<div class="vr bg-secondary" style="width: 1px"></div>
<div class="col-sm-3 card_teamid"></div>
<div class="vr bg-secondary" style="width: 1px"></div>
<div class="col-sm card_schoolcard_school"></div>
<div class="vr bg-secondary" style="width: 1px"></div>
<div class="col-sm card_division"></div>
<div class="vr bg-secondary" style="width: 1px"></div>
<div class="col-sm card_puzzle_points"></div>
<div class="vr bg-secondary" style="width: 1px"></div>
<div class="col-sm card_scenario_points"></div>
<div class="vr bg-secondary" style="width: 1px"></div>
<div class="col-sm card_total_points"></div>
</div> */
}
const cardHolder = document.getElementById("card_holder");
const templateCard = document.getElementById("template_card");
const cardHeight = templateCard.style.height;
console.log(cardHeight);

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

  ranking.textContent = String(rank);
  teamid.textContent = String(user.username);
  school.textContent = "Placeholder";
  switch (user.division) {
    case 0:
      division.textContent = "Silver";
      break;
    case 1:
      division.textContent = "Gold";
      break;
    case 2:
      division.textContent = "Platinum";
      break;
    default:
      division.textContent = "unknown";
      break;
  }
  puzzlePoints.textContent = String(user.puzzle_points);
  scenarioPoints.textContent = String(user.scenario_points);
  totalPoints.textContent = String(user.puzzle_points + user.scenario_points);

  console.log(card.getBoundingClientRect().top);

  // anime({
  //   targets: `.${user.username}`,
  //   translateX: "250px",
  // });
}

function updateUI(scoreboard) {
  console.log(scoreboard);
  scoreboard.forEach((user, index) => {
    updateUserScore(user, index);
  });
}

socket.on("update_event", async (data) => {
  console.log("updating");

  data.sort((a, b) => {
    return a.puzzle_points + a.scenario_points - (b.puzzle_points + b.scenario_points);
  });

  updateUI(data);
});
