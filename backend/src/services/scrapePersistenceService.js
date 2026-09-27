const { supabase } = require("../db/supabase");

async function saveScrapeAttempts({
  trackedProductId,
  scrapeResult,
}) {
  if (!trackedProductId) {
    throw new Error("trackedProductId is required");
  }

  if (!scrapeResult) {
    throw new Error("scrapeResult is required");
  }

  const attempts = scrapeResult.attempts || [];

  if (attempts.length === 0) {
    throw new Error("No scrape attempts to save");
  }

  const rows = attempts.map((attempt) => ({
    tracked_product_id: trackedProductId,
    product_id: String(scrapeResult.productId),
    product_name: scrapeResult.productName || null,
    option: String(scrapeResult.option),
    attempt_number: attempt.attempt,
    timestamp: attempt.timestamp,
    finished_at: attempt.finishedAt || null,
    price: attempt.price,
    stock: attempt.stock,
    currency: attempt.currency || null,
    outcome: attempt.outcome,
    error: attempt.error || null,
  }));

  const { data, error } = await supabase
    .from("scrape_attempts")
    .insert(rows)
    .select();

  if (error) {
    throw new Error(
      `Failed to save scrape attempts: ${error.message}`
    );
  }

  return data;
}

async function updateTrackedProductAfterScrape({
  trackedProductId,
  scrapeResult,
}) {
  if (!trackedProductId) {
    throw new Error("trackedProductId is required");
  }

  if (!scrapeResult) {
    throw new Error("scrapeResult is required");
  }

  const { data, error } = await supabase
    .from("tracked_products")
    .update({
      current_price: scrapeResult.price,
      current_stock: scrapeResult.stock,
      currency: scrapeResult.currency,
      last_scraped_at: scrapeResult.timestamp,
    })
    .eq("id", trackedProductId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to update tracked product: ${error.message}`
    );
  }

  return data;
}

module.exports = {
  saveScrapeAttempts,
  updateTrackedProductAfterScrape,
};