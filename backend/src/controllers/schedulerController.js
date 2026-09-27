const {
  runAllActiveTrackedProductScrapes,
} = require("../services/trackedScrapeService");

async function runScheduledScrape(req, res) {
  try {
    const configuredSecret =
      process.env.SCHEDULER_SECRET;

    if (!configuredSecret) {
      return res.status(500).json({
        success: false,
        error: "SCHEDULER_SECRET is not configured",
      });
    }

    const providedSecret =
      req.headers["x-scheduler-secret"];

    if (
      !providedSecret ||
      providedSecret !== configuredSecret
    ) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized scheduler request",
      });
    }

    const result =
      await runAllActiveTrackedProductScrapes();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "SCHEDULED SCRAPE ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  runScheduledScrape,
};