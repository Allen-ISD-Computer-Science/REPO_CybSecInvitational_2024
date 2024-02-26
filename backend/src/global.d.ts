declare global {
  type User = {
    _id: ObjectId;
    division: 0 | 1 | 2; // Silver, Gold, Platinum
    username: string;
    password: string;
    completed_puzzles: { String: boolean };
    puzzle_points: number;
    scenario_points: number;
  };

  //TODO Add categories to Puzzle class
  type Puzzle = {
    _id: ObjectId;
    name: string;
    description: string;
    point_value: number;
    difficulty: 0 | 1 | 2 | 3; // Easy, Medium, Hard, Master
    category: string; //
    answer: string;
  };

  type TyperType = {};
}

export {};
