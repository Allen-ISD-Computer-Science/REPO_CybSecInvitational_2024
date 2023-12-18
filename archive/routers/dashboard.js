const express = require("express");
const router = express.Router();
const path = require("node:path");

router.use(express.static(path.join(__dirname, "../public"), { index: false }));

router.get("/", (req, res) => {
  const session = req.session;
  console.log(session);
  // send them back to login if not logged in
  if (session.userid === undefined) res.redirect("/login");

  res.sendFile(path.join(__dirname, "../public/index.html"));
});

router.get("/scoreboard", function (req, res) {
  const session = req.session;
  console.log(session);
  // send them back to login if not logged in
  if (session.userid === undefined) res.redirect("/login");

  res.sendFile(path.join(__dirname, "../public/tables.html"));
  //   res.send("This is the dashboard scoreboard")
});

router.get("/timeline", function (req, res) {
  const session = req.session;
  console.log(session);
  // send them back to login if not logged in
  if (session.userid === undefined) res.redirect("/login");

  res.sendFile(path.join(__dirname, "../public/charts.html"));
  //   res.send("This is the dashboard timeline (area graph)");
});

router.get("/logout", (req, res) => {});

module.exports = router;
