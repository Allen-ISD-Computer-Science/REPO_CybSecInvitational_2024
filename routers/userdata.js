const express = require("express");
const router = express.Router();
const path = require("node:path");

var data = {
  user1: {
    id: "user1",
    score: 15,
  },
  bob: {
    id: "bob",
    score: 7,
  },
  john: {
    id: "john",
    score: 69,
  },
  billy: {
    id: "billy",
    score: 70,
  },
  scanlan: {
    id: "scalan",
    score: 249,
  },
  luigi: {
    id: "luigi",
    score: 1,
  },
  sloan: {
    id: "sloan",
    score: 8,
  },
};

// Home page route.
router.get("/", (req, res) => {
  const query = req.query;
  console.log(query);

  const limit = query.limit;
  const ordered = query.ordered; // alphabetic, score, time, etc.
  const direction = query.direction;

  switch (ordered) {
    case "alphabetic":
      res.json(sortUsersAlphabetically(data));
      break;
    case "score":
      if (direction == "ascending") {
        console.log(sortUsersByScoreAsc(data));
        res.json(sortUsersByScoreAsc(data));
        break;
      } else {
        res.json(sortUsersByScoreDesc(data));
        break;
      }
    default:
      res.sendStatus(400);
      break;
  }
  //   res.sendStatus(400);
  //   res.sendFile(path.join(__dirname, "../public/index.html"));
});

function sortUsersByScoreDesc(data) {
  const array = Object.values(data);
  array.sort((a, b) => {
    return a.score - b.score;
  });
  return array;
}

function sortUsersByScoreAsc(data) {
  const array = Object.values(data);
  array.sort((a, b) => {
    return b.score - a.score;
  });
  return array;
}

function sortUsersAlphabetically(data) {
  const array = Object.values(data);
  array.sort((a, b) => {
    var textA = a.id.toUpperCase();
    var textB = b.id.toUpperCase();
    return textA < textB ? -1 : textA > textB ? 1 : 0;
  });
  return array;
}

router.get("/all", (req, res) => {});

module.exports = router;
module.exports.getUserData = function () {
  return data;
};

module.exports.sortUsersAlphabetically = sortUsersAlphabetically;
