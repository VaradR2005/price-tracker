# Design & Reliability Note

## Architecture

The application uses a React/Vite frontend, Node.js/Express backend, Playwright for scraping, and Supabase PostgreSQL for persistence.

The frontend handles product search, option selection, tracking, history, logs, and CSV export. The backend manages scraping, persistence, and scheduled execution.

## Scraping Approach

The storefront requires browser interaction to obtain the current price, so Playwright was used instead of relying only on HTTP requests.

The scraper:

1. Opens the product page.
2. Handles the cookie/consent state.
3. Selects the requested product option.
4. Activates the price area.
5. Captures the quote response.
6. Decrypts and extracts price, stock, and currency.
7. Retries temporary failures using fresh page state.

## Reliability

Every scrape attempt is persisted.

Successful attempts store the returned price and stock. Failed attempts are also stored with a `failed` outcome and empty price/stock values.

This prevents failures from disappearing silently and allows the dashboard to show the actual scrape history.

The scheduled scraper runs every 2 hours through an external cron service. The scheduler triggers the backend without waiting for all Playwright work to finish, allowing it to operate within the external scheduler's request timeout.

## Fetch vs Headless Browser

A lightweight HTTP request was investigated first, but the storefront's quote flow requires browser-side interaction and response handling.

Therefore Playwright was retained for the final scraper.

Production runs Chromium in headless mode because the Render environment does not provide a graphical display. A headed run is available locally for demonstration and debugging.

## AI Mistakes and Corrections

During development, an initial direct HTTP approach was explored for the quote flow. It did not reliably reproduce the storefront's browser handshake, so the implementation was changed to use Playwright.

Another issue was retrying failed quote requests while keeping the same page state. This was changed to use a fresh page state for retries.

The production scheduler also initially exceeded the external scheduler's response-time limit when waiting for all product scrapes. The scheduler was changed to start the scrape process in the background and return immediately, while the individual results continue to be persisted by the backend.