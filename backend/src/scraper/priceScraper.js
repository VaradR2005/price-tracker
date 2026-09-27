const crypto = require("crypto");
const { chromium } = require("playwright");

const STORE_BASE_URL =
  "https://demo.inelabteamdev.com";

const DR =
  "feffd924900aae681d40425da2e3f3ef53e3ab0a8c2e6acd330b5265f3794b56";

/* =========================================================
   VERIFIED QUOTE DECRYPTION
   ========================================================= */

function sha256Hex(value) {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function base64ToBytes(base64) {
  return Buffer.from(base64, "base64");
}

function xorDecrypt(base64Blob, keyHex) {
  const data = base64ToBytes(base64Blob);
  const key = Buffer.from(keyHex, "hex");
  const output = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i++) {
    output[i] =
      data[i] ^ key[i % key.length];
  }

  return output.toString("utf8");
}

function decryptQuote(blob, pass) {
  const keyHex =
    sha256Hex(`${DR}|enc|${pass}`);

  const plaintext =
    xorDecrypt(blob, keyHex);

  return JSON.parse(plaintext);
}

/* =========================================================
   COOKIE CONSENT
   ========================================================= */

async function dismissCookieBanner(page) {
  /*
   * Try the real consent button first.
   */
  const consentButton =
    page
      .locator("button")
      .filter({
        hasText:
          /^(ALLOW|ACCEPT|I AGREE|AGREE|OK)$/i,
      })
      .first();

  try {
    if (
      (await consentButton.count()) > 0 &&
      (await consentButton.isVisible())
    ) {
      console.log("Cookie consent detected.");

      try {
        await consentButton.click({
          force: true,
          timeout: 3000,
        });

        await page.waitForTimeout(500);

        console.log("Cookie consent accepted.");

        return true;
      } catch (error) {
        console.log(
          `Cookie click failed: ${error.message}`
        );
      }
    }
  } catch {
    // Continue to DOM fallback.
  }

  /*
   * Fallback for consent UI that blocks interaction.
   */
  try {
    const removed = await page.evaluate(() => {
      const selectors = [
        ".consent-scrim",
        ".consent-dialog",
        '[class*="consent"]',
        '[id*="consent"]',
        '[class*="cookie"]',
        '[id*="cookie"]',
      ];

      let removedSomething = false;

      for (const selector of selectors) {
        document
          .querySelectorAll(selector)
          .forEach((element) => {
            element.remove();
            removedSomething = true;
          });
      }

      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty(
        "overflow"
      );

      return removedSomething;
    });

    if (removed) {
      console.log(
        "Cookie consent UI removed from DOM."
      );

      await page.waitForTimeout(300);

      return true;
    }
  } catch (error) {
    console.log(
      `Cookie DOM cleanup failed: ${error.message}`
    );
  }

  return false;
}

/* =========================================================
   PRODUCT OPTION
   ========================================================= */

/*
 * The storefront uses option identifiers such as:
 *
 *   o1
 *   o2
 *   o3
 *
 * but the visible names are product-specific.
 *
 * Example:
 *
 *   o1 -> Solo
 *   o2 -> Duo
 *
 * or:
 *
 *   o1 -> Oak
 *   o2 -> Walnut
 *   o3 -> Charcoal
 *
 * Therefore we must NOT hard-code option names.
 *
 * We use the visible buttons carrying aria-pressed,
 * which are the storefront's option controls.
 */
async function selectOption(page, option) {
  const optionNumber =
    Number(
      String(option).replace(/^o/, "")
    );

  if (
    !Number.isInteger(optionNumber) ||
    optionNumber < 1
  ) {
    throw new Error(
      `Invalid option: ${option}`
    );
  }

  /*
   * Find product option buttons generically.
   *
   * The storefront marks selectable options with
   * aria-pressed="true" / "false".
   */
  const optionButtons =
    page.locator(
      'button[aria-pressed="true"], button[aria-pressed="false"]'
    );

  const count =
    await optionButtons.count();

  if (count === 0) {
    throw new Error(
      `No selectable product options found for ${option}.`
    );
  }

  /*
   * Make sure we only consider visible controls with
   * actual text.
   */
  const visibleOptions = [];

  for (let i = 0; i < count; i++) {
    const button =
      optionButtons.nth(i);

    try {
      if (!(await button.isVisible())) {
        continue;
      }

      const text =
        (
          await button.innerText()
        )
          .replace(/\s+/g, " ")
          .trim();

      if (!text) {
        continue;
      }

      visibleOptions.push({
        index: i,
        name: text,
        button,
      });
    } catch {
      // Ignore stale/inaccessible buttons.
    }
  }

  if (visibleOptions.length === 0) {
    throw new Error(
      `No visible selectable product options found for ${option}.`
    );
  }

  /*
   * o1 = first visible option
   * o2 = second visible option
   * o3 = third visible option
   * etc.
   */
  const selectedIndex =
    optionNumber - 1;

  if (
    selectedIndex >=
    visibleOptions.length
  ) {
    throw new Error(
      `Option ${option} is not available. ` +
        `Product has ${visibleOptions.length} selectable options: ` +
        `${visibleOptions
          .map((item) => item.name)
          .join(", ")}`
    );
  }

  const selectedOption =
    visibleOptions[selectedIndex];

  const optionButton =
    selectedOption.button;

  const pressed =
    await optionButton.getAttribute(
      "aria-pressed"
    );

  if (pressed === "true") {
    console.log(
      `${selectedOption.name} (${option}) is already selected.`
    );

    return;
  }

  console.log(
    `Selecting ${selectedOption.name} (${option})...`
  );

  try {
    await optionButton.click({
      timeout: 5000,
    });
  } catch {
    await dismissCookieBanner(page);

    await optionButton.click({
      force: true,
      timeout: 5000,
    });
  }

  await page.waitForTimeout(500);
}

/* =========================================================
   PRICE BUTTON
   ========================================================= */

async function findPriceButton(page) {
  const buttons =
    page.locator("button:visible");

  const count =
    await buttons.count();

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const button =
      buttons.nth(i);

    let text = "";

    try {
      text =
        (
          await button.innerText()
        )
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
    } catch {
      continue;
    }

    const normalized =
      text.replace(
        /[\u2018\u2019]/g,
        "'"
      );

    if (
      normalized.includes(
        "check today's price"
      ) ||
      normalized === "check again"
    ) {
      return button;
    }
  }

  return null;
}

async function activatePriceArea(page) {
  console.log(
    "Hovering over price area to unlock current price..."
  );

  const priceButton =
    await findPriceButton(page);

  if (priceButton) {
    try {
      await priceButton.hover({
        timeout: 3000,
      });
    } catch {
      // Continue with mouse fallback.
    }

    try {
      const box =
        await priceButton.boundingBox();

      if (box) {
        await page.mouse.move(
          box.x + box.width / 2,
          box.y + box.height / 2
        );
      }
    } catch {
      // Continue.
    }
  }

  const priceText =
    page.getByText(
      /price locked|hover over the price area/i
    ).first();

  try {
    if (
      (await priceText.count()) > 0 &&
      (await priceText.isVisible())
    ) {
      await priceText.hover({
        timeout: 3000,
      });

      const box =
        await priceText.boundingBox();

      if (box) {
        await page.mouse.move(
          box.x + box.width / 2,
          box.y + box.height / 2
        );
      }
    }
  } catch {
    // Button hover remains sufficient if available.
  }

  await page.waitForTimeout(1000);
}

async function waitForPriceButton(page) {
  const deadline =
    Date.now() + 20000;

  let lastButton = null;

  while (
    Date.now() < deadline
  ) {
    await dismissCookieBanner(page);

    await activatePriceArea(page);

    const button =
      await findPriceButton(page);

    if (button) {
      lastButton = button;

      try {
        const disabled =
          await button.isDisabled();

        if (!disabled) {
          console.log(
            "Price-check button is enabled."
          );

          return button;
        }
      } catch {
        // Button may have been replaced.
      }
    }

    await page.waitForTimeout(500);
  }

  const visibleButtons =
    await page
      .locator("button:visible")
      .allTextContents();

  let disabledState = "unknown";

  if (lastButton) {
    try {
      disabledState =
        String(
          await lastButton.isDisabled()
        );
    } catch {
      // Keep unknown.
    }
  }

  throw new Error(
    "Price-check control did not become enabled. " +
      `Disabled: ${disabledState}. ` +
      `Visible buttons: ${JSON.stringify(
        visibleButtons.map(
          (x) => x.trim()
        )
      )}`
  );
}

/* =========================================================
   QUOTE REQUEST
   ========================================================= */

async function requestQuote(
  page,
  productId,
  priceButton
) {
  const [response] =
    await Promise.all([
      page.waitForResponse(
        (response) => {
          const url =
            response.url();

          return (
            response
              .request()
              .method() === "GET" &&
            url.includes(
              `/api/v2/items/${productId}/quote`
            )
          );
        },
        {
          timeout: 30000,
        }
      ),

      priceButton.click({
        timeout: 10000,
      }),
    ]);

  return response;
}

/*
 * A 5xx response is treated as a retryable
 * server/request failure.
 *
 * We create a fresh page state for each retry
 * instead of repeatedly sending the same request.
 */
async function triggerQuoteWithRetry(
  context,
  productId,
  option,
  maxQuoteAttempts = 3
) {
  let page = await context.newPage();

  try {
    for (
      let quoteAttempt = 1;
      quoteAttempt <= maxQuoteAttempts;
      quoteAttempt++
    ) {
      try {
        console.log(
          `Quote attempt ${quoteAttempt}/${maxQuoteAttempts}`
        );

        /*
         * Fresh page state for every quote attempt.
         */
        if (quoteAttempt > 1) {
          await page.close();

          page = await context.newPage();

          const productUrl =
            `${STORE_BASE_URL}/item/${productId}`;

          console.log(
            "Reloading product page for a fresh quote attempt..."
          );

          await page.goto(
            productUrl,
            {
              waitUntil:
                "domcontentloaded",
              timeout: 30000,
            }
          );

          await page.waitForTimeout(1000);

          await dismissCookieBanner(page);

          await selectOption(
            page,
            option
          );
        }

        const priceButton =
          await waitForPriceButton(page);

        await dismissCookieBanner(page);

        /*
         * Re-find the current button after
         * consent cleanup.
         */
        const freshPriceButton =
          await waitForPriceButton(page);

        const response =
          await requestQuote(
            page,
            productId,
            freshPriceButton
          );

        const status =
          response.status();

        const quoteUrl =
          response.url();

        console.log(
          `QUOTE RESPONSE: ${status} ${quoteUrl}`
        );

        /*
         * Success.
         */
        if (status === 200) {
          return {
            response,
            page,
          };
        }

        /*
         * Capture the server's response body
         * for diagnosis/logging.
         */
        let errorBody = "";

        try {
          errorBody =
            await response.text();
        } catch {
          errorBody =
            "<unable to read response body>";
        }

        console.error(
          `QUOTE ERROR BODY: ${errorBody}`
        );

        /*
         * Only retry server-side failures.
         */
        if (
          ![500, 502, 503, 504].includes(
            status
          )
        ) {
          throw new Error(
            `Quote request returned HTTP ${status}: ${errorBody}`
          );
        }

        if (
          quoteAttempt ===
          maxQuoteAttempts
        ) {
          throw new Error(
            `Quote request failed after ${maxQuoteAttempts} quote attempts. ` +
              `Last HTTP status: ${status}. ` +
              `Response: ${errorBody}`
          );
        }

        const delay =
          quoteAttempt * 2000;

        console.log(
          `Server returned ${status}. ` +
            `Waiting ${delay}ms before retry...`
        );

        await page.waitForTimeout(
          delay
        );
      } catch (error) {
        /*
         * If this is already the final attempt,
         * propagate the actual error.
         */
        if (
          quoteAttempt ===
          maxQuoteAttempts
        ) {
          throw error;
        }

        console.log(
          `Quote attempt ${quoteAttempt} failed: ${error.message}`
        );

        const delay =
          quoteAttempt * 2000;

        console.log(
          `Preparing fresh quote attempt after ${delay}ms...`
        );

        await page.waitForTimeout(
          delay
        );
      }
    }

    throw new Error(
      "Quote request failed unexpectedly."
    );
  } finally {
    /*
     * Do not close the successful page here.
     * The caller needs it to read the response.
     */
  }
}

/* =========================================================
   MAIN SCRAPER
   ========================================================= */

async function scrapeProduct(
  productId,
  option = "o1"
) {
  let browser = null;
  let context = null;
  let successfulPage = null;

  try {
    browser =
      await chromium.launch({
        headless: false,
      });

    context =
      await browser.newContext();

    /*
     * We use one fresh page initially.
     */
    const page =
      await context.newPage();

    const productUrl =
      `${STORE_BASE_URL}/item/${productId}`;

    console.log(
      `Opening ${productUrl}`
    );

    await page.goto(
      productUrl,
      {
        waitUntil:
          "domcontentloaded",
        timeout: 30000,
      }
    );

    await page.waitForTimeout(1000);

    await dismissCookieBanner(page);

    await selectOption(
      page,
      option
    );

    console.log(
      "Option ready. Waiting for price-check control..."
    );

    /*
     * Wait once here so we verify the storefront
     * interaction before attempting the quote.
     */
    await waitForPriceButton(page);

    /*
     * The quote retry function creates a fresh
     * page for its controlled attempts.
     */
    await page.close();

    const quoteResult =
      await triggerQuoteWithRetry(
        context,
        productId,
        option,
        3
      );

    successfulPage =
      quoteResult.page;

    const quoteResponse =
      quoteResult.response;

    /*
     * Successful quote request must contain
     * the Bearer pass required for decryption.
     */
    const authorization =
      quoteResponse
        .request()
        .headers()
        .authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      throw new Error(
        "Successful quote request did not contain a Bearer pass"
      );
    }

    const pass =
      authorization.substring(
        "Bearer ".length
      );

    const quotePayload =
      await quoteResponse.json();

    if (!quotePayload.blob) {
      throw new Error(
        "Quote response did not contain an encrypted blob"
      );
    }

    /*
     * Verified Phase-1 decryption.
     */
    const decrypted =
      decryptQuote(
        quotePayload.blob,
        pass
      );

    console.log(
      "Quote decrypted successfully."
    );

    /*
     * Never silently accept malformed data.
     */
    if (
      typeof decrypted.q !==
      "number"
    ) {
      throw new Error(
        "Decrypted quote does not contain a numeric price."
      );
    }

    if (
      typeof decrypted.a !==
      "number"
    ) {
      throw new Error(
        "Decrypted quote does not contain numeric stock."
      );
    }

    return {
      productId:
        String(productId),

      option,

      price:
        decrypted.q,

      mrp:
        decrypted.l,

      sale:
        decrypted.k,

      badgePct:
        decrypted.o,

      stock:
        decrypted.a,

      currency:
        decrypted.u,

      timestamp:
        decrypted.w,

      rating:
        decrypted.h,

      ratingCount:
        decrypted.hn,

      seller:
        decrypted.vd,

      deliveryDays:
        decrypted.eta,

      variant:
        decrypted.z,

      pending:
        decrypted.j === 1,

      format:
        decrypted.y,

      quoteUrl:
        quoteResponse.url(),

      raw:
        decrypted,
    };
  } finally {
    /*
     * Always close browser after the entire
     * scraper operation is finished.
     */
    if (successfulPage) {
      try {
        await successfulPage.close();
      } catch {
        // Ignore cleanup failure.
      }
    }

    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore cleanup failure.
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore cleanup failure.
      }
    }
  }
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  STORE_BASE_URL,
  DR,
  sha256Hex,
  base64ToBytes,
  xorDecrypt,
  decryptQuote,
  scrapeProduct,
};