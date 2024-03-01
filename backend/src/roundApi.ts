class Round {
  startTime: number;
  endTime: number;
  callback: Function;
  type: string;
  id: string;
  _endTimeout: NodeJS.Timeout; // Used to force end a timeout

  constructor(duration: number, type: string, id: string, callback: Function = () => {}) {
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.callback = callback;
    this.type = type;
    this.id = id;
    this._endTimeout = setTimeout(endCurrentRound, duration);
  }
}

class PuzzleRound extends Round {
  type: "PuzzleRound";

  private static _onEnd() {
    console.log("Puzzle Round Ended");
  }

  constructor(duration: number, id: string) {
    super(duration, "PuzzleRound", id, PuzzleRound._onEnd);
    this.type = "PuzzleRound";
  }
}

class BattleRound extends Round {
  type: "BattleRound";

  private static _onEnd() {
    console.log("Battle Round Ended");
  }

  constructor(duration: number, id: string) {
    super(duration, "PuzzleRound", id, BattleRound._onEnd);
    this.type = "BattleRound";
  }
}

// * Module Parameters
export var currentRound: Round | null = null;

//
export function endCurrentRound() {
  // * Callback is called before currentRound is set to null
  console.log("Attempting Round Closure");
  if (!currentRound) return;

  clearTimeout(currentRound._endTimeout); // Force stop timeout
  currentRound.callback();
  currentRound = null;
}

export function startRound(round: Round): boolean {
  if (currentRound) {
    return false;
  } else {
    currentRound = round;
    return true;
  }
}

export function startPuzzleRound(duration: number, id: string): boolean {
  let round = new PuzzleRound(duration, id);
  return startRound(round);
}

export function startBattleRound(duration: number, id: string): boolean {
  let round = new BattleRound(duration, id);
  return startRound(round);
}
