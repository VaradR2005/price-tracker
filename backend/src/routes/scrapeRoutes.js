const express = require("express");

const {
  scrapeTrackedProduct,
} = require("../controllers/scrapeController");

const router = express.Router();

router.post("/tracked-products/:id/scrape", scrapeTrackedProduct);

module.exports = router;