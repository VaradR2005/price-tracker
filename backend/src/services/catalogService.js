const { chromium } = require("playwright");

const STORE_URL = "https://demo.inelabteamdev.com/";
const TOTAL_CATALOG_PAGES = 48;

// Keep the catalog in memory so every search does not rescan
// all 48 storefront pages.
let catalogCache = null;
let catalogCachePromise = null;

function extractProductIdFromSku(sku) {
  const match = String(sku || "").match(/SK-(\d+)-/i);

  if (!match) {
    return null;
  }

  return match[1];
}

async function loadCatalogPage(page, url, pageNumber) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector("article.card", {
        state: "attached",
        timeout: 15000,
      });

      return;
    } catch (error) {
      console.error(
        `Catalog page ${pageNumber} load attempt ${attempt}/${maxAttempts} failed: ${error.message}`
      );

      if (attempt === maxAttempts) {
        throw error;
      }

      await page.waitForTimeout(1000);
    }
  }
}

async function scanCatalog() {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();
  const products = [];

  try {
    for (
      let pageNumber = 1;
      pageNumber <= TOTAL_CATALOG_PAGES;
      pageNumber++
    ) {
      const catalogUrl =
        pageNumber === 1
          ? STORE_URL
          : `${STORE_URL}?page=${pageNumber}`;

      console.log(
        `Catalog cache: scanning page ${pageNumber}/${TOTAL_CATALOG_PAGES}`
      );

      await loadCatalogPage(page, catalogUrl, pageNumber);

      const pageProducts = await page
        .locator("article.card")
        .evaluateAll((cards) =>
          cards.map((card) => ({
            name:
              card.querySelector(".card-title")?.textContent?.trim() || "",
            maker:
              card.querySelector(".card-maker")?.textContent?.trim() || "",
            sku:
              card.querySelector(".card-code")?.textContent?.trim() || "",
          }))
        );

      for (const product of pageProducts) {
        const productId = extractProductIdFromSku(product.sku);

        if (!product.name || !productId) {
          continue;
        }

        products.push({
          ...product,
          productId,
        });
      }
    }

    return products;
  } finally {
    await browser.close();
  }
}

async function getCatalog() {
  if (catalogCache) {
    return catalogCache;
  }

  if (!catalogCachePromise) {
    catalogCachePromise = scanCatalog()
      .then((products) => {
        const unique = new Map();

        for (const product of products) {
          if (!unique.has(product.productId)) {
            unique.set(product.productId, product);
          }
        }

        catalogCache = Array.from(unique.values());

        console.log(
          `Catalog cache ready: ${catalogCache.length} products`
        );

        return catalogCache;
      })
      .finally(() => {
        catalogCachePromise = null;
      });
  }

  return catalogCachePromise;
}

async function discoverProductOptions(page, productId) {
  const productUrl = `${STORE_URL}item/${productId}`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(productUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(1000);

      const optionButtons = page.locator(
        'button[aria-pressed="true"], button[aria-pressed="false"]'
      );

      const count = await optionButtons.count();
      const options = [];

      for (let i = 0; i < count; i++) {
        const button = optionButtons.nth(i);

        try {
          if (!(await button.isVisible())) {
            continue;
          }

          const name = (await button.innerText())
            .replace(/\s+/g, " ")
            .trim();

          if (!name) {
            continue;
          }

          options.push({
            option: `o${options.length + 1}`,
            name,
          });
        } catch {
          // Ignore stale/inaccessible option buttons.
        }
      }

      if (options.length === 0) {
        throw new Error(
          `No visible selectable options found for product ${productId}`
        );
      }

      return options;
    } catch (error) {
      console.error(
        `Option discovery for product ${productId} attempt ${attempt}/${maxAttempts} failed: ${error.message}`
      );

      if (attempt === maxAttempts) {
        throw error;
      }

      await page.waitForTimeout(1000);
    }
  }

  throw new Error(`Could not discover options for product ${productId}`);
}

async function searchCatalog(query) {
  const searchTerm = String(query || "").trim().toLowerCase();

  if (!searchTerm) {
    throw new Error("Search query is required");
  }

  // Search the cached catalog instead of scanning 48 pages.
  const catalog = await getCatalog();

  const matchedProducts = catalog.filter((product) =>
    product.name.toLowerCase().includes(searchTerm)
  );

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();
  const matches = [];

  try {
    for (const product of matchedProducts) {
      console.log(
        `Found: ${product.name} -> ${product.productId}`
      );

      try {
        const options = await discoverProductOptions(
          page,
          product.productId
        );

        matches.push({
          productId: product.productId,
          productName: product.name,
          maker: product.maker,
          sku: product.sku,
          url: `${STORE_URL}item/${product.productId}`,
          options,
        });
      } catch (error) {
        console.error(
          `Could not discover options for "${product.name}" (${product.productId}): ${error.message}`
        );
      }
    }

    return matches;
  } finally {
    await browser.close();
  }
}

module.exports = {
  searchCatalog,
};