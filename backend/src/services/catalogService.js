const { chromium } = require("playwright");

const STORE_URL = "https://demo.inelabteamdev.com/";
const TOTAL_CATALOG_PAGES = 48;

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

  throw new Error(
    `Could not discover options for product ${productId}`
  );
}

async function searchCatalog(query) {
  const searchTerm = String(query || "").trim().toLowerCase();

  if (!searchTerm) {
    throw new Error("Search query is required");
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  const matches = [];
  const seenProductIds = new Set();

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
        `Catalog search: scanning page ${pageNumber}/${TOTAL_CATALOG_PAGES}`
      );

      await loadCatalogPage(
        page,
        catalogUrl,
        pageNumber
      );

      const products = await page
        .locator("article.card")
        .evaluateAll((cards) =>
          cards.map((card) => ({
            name:
              card
                .querySelector(".card-title")
                ?.textContent
                ?.trim() || "",

            maker:
              card
                .querySelector(".card-maker")
                ?.textContent
                ?.trim() || "",

            sku:
              card
                .querySelector(".card-code")
                ?.textContent
                ?.trim() || "",
          }))
        );

      for (const product of products) {
        if (
          !product.name
            .toLowerCase()
            .includes(searchTerm)
        ) {
          continue;
        }

        const productId =
          extractProductIdFromSku(product.sku);

        if (!productId) {
          console.error(
            `Could not extract product ID from SKU for "${product.name}": ${product.sku}`
          );

          continue;
        }

        if (seenProductIds.has(productId)) {
          console.log(
            `Duplicate skipped: ${product.name} -> ${productId}`
          );

          continue;
        }

        console.log(
          `Found: ${product.name} -> ${productId}`
        );

        let options;

        try {
          options = await discoverProductOptions(
            page,
            productId
          );

          console.log(
            `Options for ${product.name}: ${options
              .map(
                (item) =>
                  `${item.option}=${item.name}`
              )
              .join(", ")}`
          );
        } catch (error) {
          console.error(
            `Could not discover options for "${product.name}" (${productId}): ${error.message}`
          );

          continue;
        }

        const result = {
          productId,
          productName: product.name,
          maker: product.maker,
          sku: product.sku,
          url: `${STORE_URL}item/${productId}`,
          options,
        };

        matches.push(result);
        seenProductIds.add(productId);
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