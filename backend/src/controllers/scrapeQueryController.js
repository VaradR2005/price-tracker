const {
  getScrapeHistory,
  getScrapeLog,
} = require("../services/scrapeQueryService");

async function getHistory(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "tracked product id is required",
      });
    }

    const history = await getScrapeHistory(id);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("GET HISTORY ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function getLog(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "tracked product id is required",
      });
    }

    const log = await getScrapeLog(id);

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("GET LOG ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  getHistory,
  getLog,
};