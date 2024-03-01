import { ObjectId } from "mongodb";

declare global {
  interface User {
    _id: ObjectId;
    division: 0 | 1 | 2; // Silver, Gold, Platinum
    username: string;
    password: string;
    completed_puzzles: { String: boolean };
    puzzle_points: number;
    scenario_points: number;
  }

  //TODO Add categories to Puzzle class
  interface Puzzle {
    _id: ObjectId;
    name: string;
    description: string;
    point_value: number;
    difficulty: 0 | 1 | 2 | 3; // Easy, Medium, Hard, Master
    category: string; //
    answer: string;
  }

  interface BattleRoundPuzzle {
    _id: ObjectId;
    name: string;
    description: string;
    answer: string;
  }

  export const lerp = (a: number, b: number, t: number) => a + t * (b - a);
}

export {};
