# Price Tracker

A full-stack price tracking application built for the SDE assignment.

## What it does

- Search products by partial or full name.
- Select a specific product option/variant.
- Track the selected product + option.
- Scrape current price and stock.
- Retry temporary scraping failures.
- Store every scrape attempt, including failures.
- View price/stock history and scrape logs.
- Export scrape history as CSV.
- Automatically scrape tracked products every 2 hours.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Scraping:** Playwright
- **Database:** Supabase PostgreSQL
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render
- **Scheduler:** cron-job.org

## Project Structure

```text
price-tracker/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── scraper/
│   └── package.json
│
├── frontend/
│   ├── src/
│   └── package.json
│
└── README.md