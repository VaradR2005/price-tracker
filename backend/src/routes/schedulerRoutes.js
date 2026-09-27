const express = require("express");

const {
  runScheduledScrape,
} = require("../controllers/schedulerController");

const router = express.Router();

router.post(
  "/scheduler/scrape",
  runScheduledScrape
);

module.exports = router;