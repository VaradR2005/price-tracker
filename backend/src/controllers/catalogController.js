const { searchCatalog } = require("../services/catalogService");

async function searchProducts(req, res) {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    const products = await searchCatalog(query);

    return res.json({
      query,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      `Catalog search failed: ${error.message}`
    );

    return res.status(500).json({
      error: "Catalog search failed",
      message: error.message,
    });
  }
}

module.exports = {
  searchProducts,
};