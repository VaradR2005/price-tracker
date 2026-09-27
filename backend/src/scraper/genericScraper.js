const { scrapeProduct } = require("./priceScraper");

async function scrapeWithRetry(productId, option = "o1", maxAttempts = 3) {
  const attempts = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = new Date().toISOString();

    try {
      console.log(
        `Scrape attempt ${attempt}/${maxAttempts} — product ${productId}, option ${option}`
      );

      const result = await scrapeProduct(productId, option);

      const finishedAt = new Date().toISOString();

      const attemptRecord = {
        attempt,
        timestamp: startedAt,
        finishedAt,
        productId: String(productId),
        option,
        outcome: attempt === 1 ? "success" : "retried",
        price: result.price,
        stock: result.stock,
        currency: result.currency,
        error: null,
      };

      attempts.push(attemptRecord);

      return {
        success: true,
        productId: String(productId),
        option,
        price: result.price,
        stock: result.stock,
        currency: result.currency,
        timestamp: result.timestamp,
        outcome: attempt === 1 ? "success" : "retried",
        attempts,
        raw: result,
      };
    } catch (error) {
      const finishedAt = new Date().toISOString();

      const attemptRecord = {
        attempt,
        timestamp: startedAt,
        finishedAt,
        productId: String(productId),
        option,
        outcome: "failed",
        price: null,
        stock: null,
        currency: null,
        error: error.message,
      };

      attempts.push(attemptRecord);

      console.error(
        `Scrape attempt ${attempt} failed: ${error.message}`
      );

      if (attempt === maxAttempts) {
        return {
          success: false,
          productId: String(productId),
          option,
          price: null,
          stock: null,
          currency: null,
          timestamp: startedAt,
          outcome: "failed",
          attempts,
          error: error.message,
        };
      }

      console.log("Retrying...");
    }
  }
}

module.exports = {
  scrapeWithRetry,
};