import * as env from "dotenv";
env.config();

if (!process.env.MONGODB_USERNAME) throw Error("Process missing MongoDB Username");
if (!process.env.MONGODB_PASSWORD) throw Error("Process missing MongoDB Password");
if (!process.env.MAIN_DATABASE_NAME) throw Error("Missing main database name");
if (!process.env.USERS_COLLECTION) throw Error("Missing users collection name");
if (!process.env.PUZZLES_COLLECTION) throw Error("Missing puzzles collection name");
if (!process.env.BATTLE_ROUND_COLLECTION) throw Error("Missing battle round collection name");
if (!process.env.ADMINISTRATOR_COLLECTION) throw Error("Missing administrator collection name");

const mongo_username = encodeURIComponent(process.env.MONGODB_USERNAME);
const mongo_password = encodeURIComponent(process.env.MONGODB_PASSWORD);

export const mainDbName = process.env.MAIN_DATABASE_NAME;
export const usersColName = process.env.USERS_COLLECTION;
export const puzzlesColName = process.env.PUZZLES_COLLECTION;
export const battleRoundPuzzlesColName = process.env.BATTLE_ROUND_COLLECTION;
export const adminColName = process.env.ADMINISTRATOR_COLLECTION;
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;

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

export async function fetchUser(username: string): Promise<User | null> {
  try {
    const result = await client.db(mainDbName).collection(usersColName).findOne({ username: username });
    return result as unknown as Promise<User | null>;
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function fetchAllUsers(): Promise<User[] | null> {
  try {
    const cursor = await client.db(mainDbName).collection(usersColName).find();
    return cursor.toArray() as unknown as User[];
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function fetchScoreboard(): Promise<Object[] | null> {
  const allUsers: User[] | null = await fetchAllUsers();
  if (!allUsers) return null;

  const scoreboard: Object[] = [];

  allUsers.forEach((user) => {
    scoreboard.push({
      division: user.division,
      username: user.username,
      puzzle_points: user.puzzle_points,
      scenario_points: user.scenario_points,
    });
  });

  return scoreboard;
}
