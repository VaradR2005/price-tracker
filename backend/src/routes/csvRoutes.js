const express = require("express");

const {
  exportCsv,
} = require("../controllers/csvController");

const router = express.Router();

router.get(
  "/tracked-products/:id/export",
  exportCsv
);

module.exports = router;