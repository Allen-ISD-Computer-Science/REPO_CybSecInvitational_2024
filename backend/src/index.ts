import { Request, Response } from "express";
import * as path from "path";

import { app, server } from "./server";
import { init as initSocketConnection, io } from "./socketApi";
import { Round, currentRound, startPuzzleRound } from "./roundApi";
import { router as loginRouter, validateLoginToken } from "./loginApi";
import { router as userRouter } from "./usersApi";
import { router as puzzleRouter, replicatePuzzles } from "./puzzleApi";
import { ScoreboardUser, fetchScoreboard } from "./mongoApi";

const config = require(path.join(__dirname, "../config.json"));
// Initialize Routes
app.get("/home", validateLoginToken, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/home.html"));
});

app.get("/", (req: Request, res: Response) => {
  res.redirect("login");
});

app.use("/", loginRouter);
app.use("/", userRouter);
app.use("/", puzzleRouter);

// Initialize Socket Server
initSocketConnection();

// Initialize Puzzles
replicatePuzzles();

// Host http server at port
server.listen(Number(config.host_port), function () {
  console.log(server.address());
  console.log("server at http://localhost:%s/", server.address().port);
});

interface UpdatePacket {
  scoreboard: ScoreboardUser[];
  currentRound: { [property: string]: any } | undefined;
}

// Update Loop
setInterval(async () => {
  console.log("Updating");
  const scoreboard: ScoreboardUser[] | null = await fetchScoreboard();
  if (!scoreboard) {
    console.warn("Failed to fetch scoreboard");
    return;
  }

  let updatePacket: UpdatePacket = {
    scoreboard: scoreboard,
    currentRound: currentRound?.getSummary(),
  };

  console.log(updatePacket);

  io.emit("update_event", updatePacket);
}, 5000);

startPuzzleRound(120000, "TestPuzzleRound");
