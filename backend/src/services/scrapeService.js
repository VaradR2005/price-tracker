const {
  scrapeWithRetry,
} = require("../scraper/genericScraper");

/**
 * Run one product scrape and normalize the result
 * into the format our backend/database will use.
 *
 * IMPORTANT:
 * priceScraper.js and genericScraper.js are intentionally
 * kept separate from this service.
 */
async function runProductScrape({
  productId,
  productName,
  option,
  maxAttempts = 3,
}) {
  if (!productId) {
    throw new Error("productId is required");
  }

  if (!option) {
    throw new Error("option is required");
  }

  const result = await scrapeWithRetry(
    productId,
    option,
    maxAttempts
  );

  /*
   * The assignment requires ISO 8601 UTC timestamps.
   */
  const timestamp =
    new Date().toISOString();

  /*
   * Build one normalized scrape result.
   */
  const scrapeResult = {
    productId: String(productId),
    productName: productName || null,
    option: String(option),

    timestamp,

    price:
      result.success
        ? result.price
        : null,

    stock:
      result.success
        ? result.stock
        : null,

    currency:
      result.success
        ? result.currency
        : null,

    outcome: result.outcome,

    success: result.success,

    attempts: result.attempts,

    error:
      result.success
        ? null
        : result.error,
  };

  return scrapeResult;
}

module.exports = {
  runProductScrape,
};