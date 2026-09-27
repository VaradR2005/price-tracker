const {
  getCsvRows,
  buildCsv,
} = require("../services/csvExportService");

async function exportCsv(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "tracked product id is required",
      });
    }

    const rows = await getCsvRows(id);
    const csv = buildCsv(rows);

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="price-history-${id}.csv"`
    );

    res.send(csv);
  } catch (error) {
    console.error("CSV EXPORT ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  exportCsv,
};