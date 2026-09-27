const express = require("express");

const {
  getHistory,
  getLog,
} = require("../controllers/scrapeQueryController");

const router = express.Router();

router.get(
  "/tracked-products/:id/history",
  getHistory
);

router.get(
  "/tracked-products/:id/log",
  getLog
);

module.exports = router;