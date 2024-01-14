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

submitPuzzle("templatePuzzleName", "AHSINV{templateFlag}");
