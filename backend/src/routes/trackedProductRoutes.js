const express = require("express");

const {
  listTrackedProducts,
  addTrackedProduct,
} = require("../controllers/trackedProductController");

const router = express.Router();

router.get("/", listTrackedProducts);
router.post("/", addTrackedProduct);

module.exports = router;