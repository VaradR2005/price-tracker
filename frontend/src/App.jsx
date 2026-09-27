import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "https://price-tracker-9xp5.onrender.com/api";

function App() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [trackedProducts, setTrackedProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingTracked, setLoadingTracked] = useState(false);
  const [trackingId, setTrackingId] = useState(null);
  const [scrapingId, setScrapingId] = useState(null);

  const [expandedHistory, setExpandedHistory] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  const [historyData, setHistoryData] = useState({});
  const [logData, setLogData] = useState({});

  const [selectedOptions, setSelectedOptions] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTrackedProducts() {
    setLoadingTracked(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/tracked-products`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load tracked products."
        );
      }

      setTrackedProducts(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTracked(false);
    }
  }

  useEffect(() => {
    loadTrackedProducts();
  }, []);

  async function handleSearch(event) {
    event.preventDefault();

    const searchTerm = query.trim();

    if (!searchTerm) {
      setError("Enter a product name to search.");
      setProducts([]);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setProducts([]);
    setSelectedOptions({});

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/search?q=${encodeURIComponent(
          searchTerm
        )}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Product search failed."
        );
      }

      const searchResults = result.products || [];

      setProducts(searchResults);

      const defaultSelections = {};

      for (const product of searchResults) {
        if (product.options?.length > 0) {
          defaultSelections[product.productId] =
            product.options[0].option;
        }
      }

      setSelectedOptions(defaultSelections);

      if (searchResults.length === 0) {
        setMessage("No matching products found.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOptionChange(productId, option) {
    setSelectedOptions((previous) => ({
      ...previous,
      [productId]: option,
    }));
  }

  async function handleTrack(product) {
    const selectedOption =
      selectedOptions[product.productId];

    if (!selectedOption) {
      setError(
        `Select an option for ${product.productName} before tracking.`
      );
      return;
    }

    setTrackingId(product.productId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/tracked-products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.productId,
            productName: product.productName,
            option: selectedOption,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to track product."
        );
      }

      const selectedOptionName =
        product.options?.find(
          (item) => item.option === selectedOption
        )?.name || selectedOption;

      setMessage(
        `${product.productName} (${selectedOptionName}) is now being tracked.`
      );

      await loadTrackedProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setTrackingId(null);
    }
  }

  async function handleScrape(trackedProduct) {
    setScrapingId(trackedProduct.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/tracked-products/${trackedProduct.id}/scrape`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Scrape failed."
        );
      }

      const scrapeResult =
        result.data?.scrapeResult;

      if (scrapeResult?.success) {
        setMessage(
          `${trackedProduct.product_name ||
          `Product ${trackedProduct.product_id}`
          } scraped successfully.`
        );
      } else {
        setMessage(
          `${trackedProduct.product_name ||
          `Product ${trackedProduct.product_id}`
          } scrape failed.`
        );
      }

      await loadTrackedProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setScrapingId(null);
    }
  }

  async function handleHistory(trackedProduct) {
    const id = trackedProduct.id;

    if (expandedHistory === id) {
      setExpandedHistory(null);
      return;
    }

    setError("");
    setExpandedHistory(id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/tracked-products/${id}/history`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load history."
        );
      }

      setHistoryData((previous) => ({
        ...previous,
        [id]: result.data || [],
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLog(trackedProduct) {
    const id = trackedProduct.id;

    if (expandedLog === id) {
      setExpandedLog(null);
      return;
    }

    setError("");
    setExpandedLog(id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/tracked-products/${id}/log`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load scrape log."
        );
      }

      setLogData((previous) => ({
        ...previous,
        [id]: result.data || [],
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleExportCsv(trackedProduct) {
    const csvUrl =
      `${API_BASE_URL}/tracked-products/${trackedProduct.id}/export`;

    window.location.href = csvUrl;
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Price Tracker</h1>
          <p>
            Search products and track their price and stock.
          </p>
        </div>
      </header>

      <main className="container">

        {/* SEARCH */}
        <section className="search-section">
          <h2>Find a product</h2>

          <form
            className="search-form"
            onSubmit={handleSearch}
          >
            <input
              type="text"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search by product name..."
            />

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <div className="message error">
              {error}
            </div>
          )}

          {message && !error && (
            <div className="message success">
              {message}
            </div>
          )}
        </section>

        {/* SEARCH RESULTS */}
        <section className="results-section">
          <div className="section-heading">
            <h2>Search results</h2>

            {products.length > 0 && (
              <span>
                {products.length} product
                {products.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {products.length === 0 && !loading && (
            <div className="empty-state">
              Search for a product to see results.
            </div>
          )}

          <div className="product-grid">
            {products.map((product) => {
              const selectedOption =
                selectedOptions[product.productId];

              return (
                <article
                  className="product-card"
                  key={product.productId}
                >
                  <div className="product-info">
                    <h3>{product.productName}</h3>

                    <p>
                      <strong>Maker:</strong>{" "}
                      {product.maker}
                    </p>

                    <p>
                      <strong>SKU:</strong>{" "}
                      {product.sku}
                    </p>

                    <p>
                      <strong>Product ID:</strong>{" "}
                      {product.productId}
                    </p>

                    <div className="option-selector">
                      <strong>Choose option:</strong>

                      <div className="option-list">
                        {(product.options || []).map(
                          (item) => (
                            <label
                              className="option-choice"
                              key={item.option}
                            >
                              <input
                                type="radio"
                                name={`option-${product.productId}`}
                                value={item.option}
                                checked={
                                  selectedOption ===
                                  item.option
                                }
                                onChange={() =>
                                  handleOptionChange(
                                    product.productId,
                                    item.option
                                  )
                                }
                              />

                              <span>
                                {item.name}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    className="track-button"
                    onClick={() =>
                      handleTrack(product)
                    }
                    disabled={
                      trackingId ===
                      product.productId
                    }
                  >
                    {trackingId === product.productId
                      ? "Tracking..."
                      : "Track Product"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* TRACKED PRODUCTS */}
        <section className="tracked-section">
          <div className="section-heading">
            <h2>Tracked Products</h2>

            <span>
              {trackedProducts.length} tracked
            </span>
          </div>

          {loadingTracked ? (
            <div className="empty-state">
              Loading tracked products...
            </div>
          ) : trackedProducts.length === 0 ? (
            <div className="empty-state">
              No products are being tracked yet.
            </div>
          ) : (
            <div className="tracked-grid">
              {trackedProducts.map((product) => {
                const history =
                  historyData[product.id] || [];

                const logs =
                  logData[product.id] || [];

                return (
                  <article
                    className="tracked-card"
                    key={product.id}
                  >
                    <div>
                      <h3>
                        {product.product_name ||
                          `Product ${product.product_id}`}
                      </h3>

                      <p>
                        <strong>Product ID:</strong>{" "}
                        {product.product_id}
                      </p>

                      <p>
                        <strong>Option:</strong>{" "}
                        {product.option}
                      </p>

                      <p>
                        <strong>Current price:</strong>{" "}
                        {product.current_price !== null &&
                          product.current_price !== undefined
                          ? `${product.current_price} ${product.currency || ""
                          }`
                          : "Not scraped yet"}
                      </p>

                      <p>
                        <strong>Stock:</strong>{" "}
                        {product.current_stock !== null &&
                          product.current_stock !== undefined
                          ? product.current_stock
                          : "Not scraped yet"}
                      </p>

                      <p>
                        <strong>Last scraped:</strong>{" "}
                        {product.last_scraped_at
                          ? new Date(
                            product.last_scraped_at
                          ).toLocaleString()
                          : "Never"}
                      </p>
                    </div>

                    <div className="tracked-actions">
                      <span
                        className={
                          product.active
                            ? "status active"
                            : "status inactive"
                        }
                      >
                        {product.active
                          ? "Active"
                          : "Inactive"}
                      </span>

                      <button
                        className="scrape-button"
                        onClick={() =>
                          handleScrape(product)
                        }
                        disabled={
                          scrapingId === product.id
                        }
                      >
                        {scrapingId === product.id
                          ? "Scraping..."
                          : "Scrape Now"}
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          handleHistory(product)
                        }
                      >
                        {expandedHistory === product.id
                          ? "Hide History"
                          : "History"}
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          handleLog(product)
                        }
                      >
                        {expandedLog === product.id
                          ? "Hide Log"
                          : "Scrape Log"}
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          handleExportCsv(product)
                        }
                      >
                        Export CSV
                      </button>
                    </div>

                    {/* HISTORY */}
                    {expandedHistory === product.id && (
                      <div className="details-panel">
                        <h4>Price & Stock History</h4>

                        {history.length === 0 ? (
                          <p className="muted">
                            No history recorded yet.
                          </p>
                        ) : (
                          <div className="table-wrapper">
                            <table>
                              <thead>
                                <tr>
                                  <th>Timestamp</th>
                                  <th>Price</th>
                                  <th>Stock</th>
                                  <th>Currency</th>
                                  <th>Outcome</th>
                                </tr>
                              </thead>

                              <tbody>
                                {history.map(
                                  (entry) => (
                                    <tr key={entry.id}>
                                      <td>
                                        {new Date(
                                          entry.timestamp
                                        ).toLocaleString()}
                                      </td>

                                      <td>
                                        {entry.price ??
                                          "—"}
                                      </td>

                                      <td>
                                        {entry.stock ??
                                          "—"}
                                      </td>

                                      <td>
                                        {entry.currency ||
                                          "—"}
                                      </td>

                                      <td>
                                        <span
                                          className={`outcome ${entry.outcome}`}
                                        >
                                          {entry.outcome}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* LOG */}
                    {expandedLog === product.id && (
                      <div className="details-panel">
                        <h4>Scrape Log</h4>

                        {logs.length === 0 ? (
                          <p className="muted">
                            No scrape attempts recorded
                            yet.
                          </p>
                        ) : (
                          <div className="table-wrapper">
                            <table>
                              <thead>
                                <tr>
                                  <th>Attempt</th>
                                  <th>Timestamp</th>
                                  <th>Finished</th>
                                  <th>Outcome</th>
                                  <th>Price</th>
                                  <th>Stock</th>
                                  <th>Error</th>
                                </tr>
                              </thead>

                              <tbody>
                                {logs.map(
                                  (entry) => (
                                    <tr key={entry.id}>
                                      <td>
                                        {
                                          entry.attempt_number
                                        }
                                      </td>

                                      <td>
                                        {new Date(
                                          entry.timestamp
                                        ).toLocaleString()}
                                      </td>

                                      <td>
                                        {entry.finished_at
                                          ? new Date(
                                            entry.finished_at
                                          ).toLocaleString()
                                          : "—"}
                                      </td>

                                      <td>
                                        <span
                                          className={`outcome ${entry.outcome}`}
                                        >
                                          {entry.outcome}
                                        </span>
                                      </td>

                                      <td>
                                        {entry.price ??
                                          "—"}
                                      </td>

                                      <td>
                                        {entry.stock ??
                                          "—"}
                                      </td>

                                      <td className="error-cell">
                                        {entry.error ||
                                          "—"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;