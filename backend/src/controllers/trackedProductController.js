const {
  createTrackedProduct,
  getTrackedProducts,
} = require("../services/trackedProductService");

async function listTrackedProducts(req, res) {
  try {
    const products = await getTrackedProducts();

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("LIST TRACKED PRODUCTS ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function addTrackedProduct(req, res) {
  try {
    const {
      productId,
      productName,
      option = "o1",
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "productId is required",
      });
    }

    const product = await createTrackedProduct({
      productId,
      productName,
      option,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("CREATE TRACKED PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  listTrackedProducts,
  addTrackedProduct,
};