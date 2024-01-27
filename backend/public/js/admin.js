async function startBattleRound() {
  const response = await fetch("admin/startBattleRound", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      id: "battle_round_1",
      duration: 30000,
    }),
  });

  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data;
}

async function endBattleRound() {
  const response = await fetch("admin/startBattleRound", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      id: "battle_round_1",
      duration: 30000,
    }),
  });

  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data;
}

// startBattleRound().then((res) => console.log(res));
