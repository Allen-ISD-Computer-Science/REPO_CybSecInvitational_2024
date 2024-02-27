import express, { Request, Response, Router } from "express";
import { Socket } from "socket.io";
import * as loginApi from "./loginApi";

// Create a new router
const router: Router = express.Router();

// Define routes
router.get("/puzzle", loginApi.validateLoginToken, (req: Request, res: Response) => {
  res.send("GET request to the homepage");
});

router.post("/puzzle", loginApi.validateLoginToken, (req: Request, res: Response) => {
  res.send("POST request to the homepage");
});

// Define more routes as needed

// Export the router
module.exports = router;
