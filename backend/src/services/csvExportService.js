const { supabase } = require("../db/supabase");

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

async function getCsvRows(trackedProductId) {
  const { data, error } = await supabase
    .from("scrape_attempts")
    .select(
      "product_id, product_name, option, timestamp, price, stock, outcome"
    )
    .eq("tracked_product_id", trackedProductId)
    .order("timestamp", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch CSV data: ${error.message}`
    );
  }

  return data;
}

function buildCsv(rows) {
  const headers = [
    "product_id",
    "product_name",
    "selected_option",
    "timestamp",
    "price",
    "stock",
    "outcome",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) => {
      const timestamp = row.timestamp
        ? new Date(row.timestamp).toISOString()
        : "";

      return [
        escapeCsv(row.product_id),
        escapeCsv(row.product_name),
        escapeCsv(row.option),
        escapeCsv(timestamp),
        escapeCsv(row.price),
        escapeCsv(row.stock),
        escapeCsv(row.outcome),
      ].join(",");
    }),
  ];

  return lines.join("\r\n");
}

module.exports = {
  getCsvRows,
  buildCsv,
};