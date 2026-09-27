const { supabase } = require("../db/supabase");

async function getScrapeHistory(trackedProductId) {
  const { data, error } = await supabase
    .from("scrape_attempts")
    .select(
      "id, product_id, product_name, option, timestamp, price, stock, currency, outcome"
    )
    .eq("tracked_product_id", trackedProductId)
    .order("timestamp", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch scrape history: ${error.message}`
    );
  }

  return data;
}

async function getScrapeLog(trackedProductId) {
  const { data, error } = await supabase
    .from("scrape_attempts")
    .select("*")
    .eq("tracked_product_id", trackedProductId)
    .order("timestamp", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch scrape log: ${error.message}`
    );
  }

  return data;
}

module.exports = {
  getScrapeHistory,
  getScrapeLog,
};