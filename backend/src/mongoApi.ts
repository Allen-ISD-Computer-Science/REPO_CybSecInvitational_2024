import * as env from "dotenv";
env.config();
const config = require("../config.json");

if (!process.env.MONGODB_USERNAME) throw Error("Process missing MongoDB Username");
if (!process.env.MONGODB_PASSWORD) throw Error("Process missing MongoDB Password");
if (!process.env.MAIN_DATABASE_NAME) throw Error("Missing main database name");
if (!process.env.USERS_COLLECTION) throw Error("Missing users collection name");
if (!process.env.PUZZLES_COLLECTION) throw Error("Missing puzzles collection name");
if (!process.env.BATTLE_ROUND_COLLECTION) throw Error("Missing battle round collection name");
if (!process.env.ADMINISTRATOR_COLLECTION) throw Error("Missing administrator collection name");

import { UpdateResult, MongoClient, ServerApiVersion, UnorderedBulkOperation, Collection, InsertOneResult, InsertManyResult } from "mongodb";

const mongo_username = encodeURIComponent(process.env.MONGODB_USERNAME);
const mongo_password = encodeURIComponent(process.env.MONGODB_PASSWORD);

// * Module Parameters
export const mainDbName = process.env.MAIN_DATABASE_NAME;
export const usersColName = process.env.USERS_COLLECTION;
export const puzzlesColName = process.env.PUZZLES_COLLECTION;
export const battleRoundPuzzlesColName = process.env.BATTLE_ROUND_COLLECTION;
export const adminColName = process.env.ADMINISTRATOR_COLLECTION;

const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;

// * Module Initialization
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Close connection when server stops
process.on("SIGINT", () => {
  client.close().then(() => {
    console.info("Mongoose primary connection disconnected through app termination!");
    process.exit(0);
  });
});

interface BattleRoundConfig {
  puzzles: string[];
  min_bid: number;
}

// * Methods
export async function searchForEmails(emails: string[]) {
  console.log(emails);
  let result = await client
    .db(mainDbName)
    .collection(usersColName)
    .findOne({ members: { $elemMatch: { email: { $in: emails } } } });
  console.log(result);
  return result;
}

function genRandPassword(): string {
  return Math.random().toString(36).slice(-8);
}

function genRandHex(size: number): string {
  return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

export async function createUser(participants: Registrant[]): Promise<User | null> {
  try {
    const user: User = {
      division: 0,
      username: `${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}`,
      password: genRandPassword(),
      completed_puzzles: {},
      members: participants,
      puzzle_points: 0,
      scenario_points: 0,
    };

    let result = await client.db(mainDbName).collection(usersColName).insertOne(user);

    if (result.acknowledged) {
      return user;
    } else {
      return null;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function fetchAdmin(username: string): Promise<User | null> {
  try {
    const result = await client.db(mainDbName).collection(adminColName).findOne({ username: username });
    return result as unknown as Promise<User | null>;
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function fetchBattleRoundPuzzles(roundId: string): Promise<{ [name: string]: Puzzle } | null> {
  const roundConfig: BattleRoundConfig | null = config.battle_rounds[roundId];
  if (!roundConfig || !roundConfig.puzzles || !roundConfig.min_bid) {
    return null;
  }

  console.log(roundConfig);
  try {
    const result = (await client
      .db(mainDbName)
      .collection(battleRoundPuzzlesColName)
      .find({ name: { $in: roundConfig.puzzles } })
      .toArray()) as unknown as Puzzle[];

    let retVal: { [name: string]: Puzzle } = {};
    result.forEach((puzzle) => {
      retVal[puzzle.name] = puzzle;
    });
    return retVal;
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function fetchUser(username: string): Promise<User | null> {
  try {
    const result = await client.db(mainDbName).collection(usersColName).findOne({ username: username });
    return result as unknown as Promise<User | null>;
  } catch (err) {
    console.log(err);
    return null;
  }
}

// fetches all users, includes ALL data present in the db
export async function fetchAllUsers(): Promise<User[] | null> {
  try {
    const cursor = await client.db(mainDbName).collection(usersColName).find();
    return cursor.toArray() as unknown as User[];
  } catch (err) {
    console.log(err);
    return null;
  }
}

// fetches all users with only data pertaining to scoreboard
export interface ScoreboardUser {
  division: number;
  username: string;
  puzzle_points: number;
  scenario_points: number;
}

// fetches every users data sorted according to total number of points
export async function fetchScoreboard(): Promise<ScoreboardUser[] | null> {
  const allUsers: User[] | null = await fetchAllUsers();
  if (!allUsers) return null;

  const scoreboard: ScoreboardUser[] = [];

  allUsers.forEach((user) => {
    scoreboard.push({
      division: user.division,
      username: user.username,
      puzzle_points: user.puzzle_points,
      scenario_points: user.scenario_points,
    });
  });

  scoreboard.sort((a: ScoreboardUser, b: ScoreboardUser): number => {
    return a.puzzle_points + a.scenario_points - (b.puzzle_points + b.scenario_points);
  });

  return scoreboard;
}

// returns true if successfully added, false if not
export async function addPointsToUser(username: string, amount: number, category: "puzzle_points" | "scenario_points"): Promise<boolean> {
  try {
    const result: UpdateResult = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username, [category]: { $exists: true } }, { $inc: { [category]: amount } });
    if (result.matchedCount <= 0 || result.modifiedCount <= 0) return false;
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

// adds puzzle points to user and sets puzzle as completed
export async function onPuzzleCorrect(username: string, amount: number, puzzleName: string): Promise<boolean> {
  try {
    const result: UpdateResult = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username }, { $inc: { puzzle_points: amount }, $set: { [`completed_puzzles.${puzzleName}`]: true } });
    if (result.matchedCount <= 0 || result.modifiedCount <= 0) return false;
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

// returns true if successfully set, false if not
export async function setPointsOfUser(username: string, amount: number, category: "puzzle_points" | "scenario_points"): Promise<boolean> {
  try {
    const cursor: UpdateResult = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username, [category]: { $exists: true } }, { $set: { [category]: amount } });
    if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0) return false;
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

// sets a puzzle as completed in a specified user
export async function markPuzzleAsCompleted(username: string, name: string): Promise<boolean> {
  try {
    const cursor: UpdateResult = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username }, { $set: { [`completed_puzzles.${name}`]: true } });
    if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0) return false;
    return true;
  } catch {
    return false;
  }
}

// sets a puzzle as not completed in a specified user
export async function markPuzzleAsNotCompleted(username: string, name: string): Promise<boolean> {
  try {
    const cursor: UpdateResult = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username }, { $unset: { [`completed_puzzles.${name}`]: true } });
    if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0) return false;
    return true;
  } catch {
    return false;
  }
}

// sets the division of specified user
export async function setDivisionOfUser(username: string, division: number): Promise<boolean> {
  try {
    const cursor: UpdateResult = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username }, { $set: { division: division } });
    if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0) return false;
    return true;
  } catch {
    return false;
  }
}

export async function createPuzzles(puzzles: Puzzle[]): Promise<boolean> {
  try {
    const result: InsertManyResult = await client.db(mainDbName).collection(puzzlesColName).insertMany(puzzles);
    if (result.acknowledged && result.insertedCount != puzzles.length) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}
