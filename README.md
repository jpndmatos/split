# Split

Split shared event costs between people. Record who paid for the venue, food, supplies or transport, then work out the repayments.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/dark-dashboard.jpg">
  <img src="docs/desktop-dashboard.jpg" alt="Split desktop interface" width="1200">
</picture>

<details>
  <summary>Mobile view</summary>
  <br>
  <img src="docs/mobile-dashboard.jpg" alt="Split mobile interface" width="320">
</details>

## Features

- Separate events with their own participants and expenses.
- Equal splits between selected people, calculated in cents.
- Expense editing, search, event categories, and individual balances.
- Suggested repayments with payment tracking and undo.
- CSV export, SQLite storage, and light and dark themes.

The desktop dashboard keeps the ledger and repayments visible together. Long lists scroll inside their panels.

## Stack

React, TypeScript, Vite, Node.js, and SQLite.

## Run locally

Requires Node.js 22.14 or later.

```sh
npm ci
npm run dev
```

Open [localhost:5174](http://localhost:5174). A sample event is included on the first run.

```sh
npm test
npm run build
npm start
```

`npm start` serves the production build and API on port 3001. Data is stored in `data/split.db`.
