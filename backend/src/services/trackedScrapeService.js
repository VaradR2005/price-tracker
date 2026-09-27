const {
  getTrackedProductById,
} = require("./trackedProductService");

const {
  runProductScrape,
} = require("./scrapeService");

const {
  saveScrapeAttempts,
  updateTrackedProductAfterScrape,
} = require("./scrapePersistenceService");

async function runTrackedProductScrape(trackedProductId) {
  if (!trackedProductId) {
    throw new Error("trackedProductId is required");
  }

  const trackedProduct =
    await getTrackedProductById(trackedProductId);

  if (!trackedProduct.active) {
    throw new Error("Tracked product is inactive");
  }

  const scrapeResult = await runProductScrape({
    productId: trackedProduct.product_id,
    productName: trackedProduct.product_name,
    option: trackedProduct.option,
  });

  await saveScrapeAttempts({
    trackedProductId: trackedProduct.id,
    scrapeResult,
  });

  /*
   * Only update the current product state when
   * the final scrape succeeded.
   */
  if (scrapeResult.success) {
    await updateTrackedProductAfterScrape({
      trackedProductId: trackedProduct.id,
      scrapeResult,
    });
  }

  return {
    trackedProduct,
    scrapeResult,
  };
}
async function runAllActiveTrackedProductScrapes() {
  const {
    getTrackedProducts,
  } = require("./trackedProductService");

  const trackedProducts = await getTrackedProducts();

  const activeProducts = trackedProducts.filter(
    (product) => product.active
  );

  const results = [];

  for (const product of activeProducts) {
    try {
      const result = await runTrackedProductScrape(
        product.id
      );

      results.push({
        trackedProductId: product.id,
        productId: product.product_id,
        success: result.scrapeResult.success,
        outcome: result.scrapeResult.outcome,
        price: result.scrapeResult.price,
        stock: result.scrapeResult.stock,
        error: result.scrapeResult.error,
      });
    } catch (error) {
      console.error(
        `Scheduled scrape failed for ${product.id}:`,
        error.message
      );

      results.push({
        trackedProductId: product.id,
        productId: product.product_id,
        success: false,
        outcome: "failed",
        price: null,
        stock: null,
        error: error.message,
      });
    }
  }

  return {
    total: activeProducts.length,
    results,
  };
}

module.exports = {
  runTrackedProductScrape,
  runAllActiveTrackedProductScrapes,
};