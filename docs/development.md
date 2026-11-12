# Split

Shared expenses, exact balances and repayment tracking. React, TypeScript, Node.js and SQLite.

## Run

Node.js 22.14+.

```sh
npm ci
npm run dev
```

Open http://localhost:5174. The first run creates a sample event.

## Build and check

```sh
npm test
npm run build
npm start
```

Production: http://localhost:3001. Data: `data/split.db`.

`npm run test:browser` checks the running app using an isolated, seeded database. Install Chromium with `npx playwright install chromium` first.

Amounts use integer cents. Repayments are records; the app does not transfer money.
