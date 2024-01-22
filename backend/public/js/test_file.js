async function joinBattleRound() {
  const response = await fetch(location.protocol + "//" + location.host + "/battleRound/join", {
    method: "POST",
    body: JSON.stringify({
      bid: 0.5,
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  console.log(response);

  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  console.log(data);
  return data;
}

async function submitBattleRoundPuzzle() {
  const response = await fetch(location.protocol + "//" + location.host + "/battleRound/submitPuzzle", {
    method: "POST",
    body: JSON.stringify({
      id: "battleRound1Puzzle1",
      answer: "AHSINV{battleRound1Puzzle1}",
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  console.log(response);

  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  console.log(data);
  return data;
}

console.log("joining battle round");
joinBattleRound().then(() => {
  submitBattleRoundPuzzle();
});
