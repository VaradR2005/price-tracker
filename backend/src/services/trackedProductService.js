const { supabase } = require("../db/supabase");

async function createTrackedProduct({
  productId,
  productName,
  option = "o1",
}) {
  if (!productId) {
    throw new Error("productId is required");
  }

  const { data, error } = await supabase
    .from("tracked_products")
    .insert({
      product_id: String(productId),
      product_name: productName || null,
      option: String(option),
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to create tracked product: ${error.message}`
    );
  }

  return data;
}

async function getTrackedProducts() {
  const { data, error } = await supabase
    .from("tracked_products")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Failed to fetch tracked products: ${error.message}`
    );
  }

  return data;
}

async function getTrackedProductById(id) {
  const { data, error } = await supabase
    .from("tracked_products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch tracked product: ${error.message}`
    );
  }

  return data;
}

module.exports = {
  createTrackedProduct,
  getTrackedProducts,
  getTrackedProductById,
};