const {
  runAllActiveTrackedProductScrapes,
} = require("../services/trackedScrapeService");

async function runScheduledScrape(req, res) {
  try {
    const configuredSecret = process.env.SCHEDULER_SECRET;

    if (!configuredSecret) {
      return res.status(500).json({
        success: false,
        error: "SCHEDULER_SECRET is not configured",
      });
    }

    const providedSecret = req.headers["x-scheduler-secret"];

    if (!providedSecret || providedSecret !== configuredSecret) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized scheduler request",
      });
    }

    // Start the scheduled scrape without making the external
    // cron service wait for every Playwright scrape to finish.
    runAllActiveTrackedProductScrapes()
      .then((result) => {
        const succeeded = result.results.filter(
          (item) => item.success
        ).length;

        const failed = result.results.length - succeeded;

        console.log(
          `SCHEDULED SCRAPE COMPLETE: total=${result.total}, succeeded=${succeeded}, failed=${failed}`
        );
      })
      .catch((error) => {
        console.error(
          "SCHEDULED SCRAPE BACKGROUND ERROR:",
          error
        );
      });

    return res.json({
      success: true,
      message: "Scheduled scrape started",
    });
  } catch (error) {
    console.error("SCHEDULED SCRAPE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  runScheduledScrape,
};