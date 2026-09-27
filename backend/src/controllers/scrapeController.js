const {
  runTrackedProductScrape,
} = require("../services/trackedScrapeService");

async function scrapeTrackedProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "tracked product id is required",
      });
    }

    const result = await runTrackedProductScrape(id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("SCRAPE TRACKED PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  scrapeTrackedProduct,
};