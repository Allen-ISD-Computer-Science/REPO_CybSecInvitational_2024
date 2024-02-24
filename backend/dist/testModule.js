"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// Create a new router
const router = express_1.default.Router();
// Define routes
router.get("/", (req, res) => {
    res.send("GET request to the homepage");
});
router.post("/", (req, res) => {
    res.send("POST request to the homepage");
});
// Define more routes as needed
// Export the router
module.exports = router;
