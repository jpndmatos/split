# Split



Split shared event costs between people. Record who paid for the venue, food, supplies or transport, then work out the repayments.



![split workspace](docs/workspace.png)



<details>

  <summary>Mobile view</summary>

  <br>

  <img src="docs/mobile.png" alt="Split mobile interface" width="320">

</details>



## Features



- Separate events with their own participants and expenses.

- Equal splits between selected people, calculated in cents.
- A live share preview before saving, including exact remainder-cent allocation.

- Expense editing, search, event categories, and individual balances.

- Suggested repayments with payment tracking and undo.

- CSV export, SQLite storage.



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



## Implementation notes



Amounts stay in integer cents through splitting, balances and settlement calculations. The browser demo reuses the API’s calculation module; it does not send payments or write to the server. `npm run build:demo` exports it to `dist-demo`.



## Verification



The app fills the viewport, with longer lists scrolling inside their panels. On phones, Ledger and Repayments switch between the two work areas. Layout checks cover 320×568 through 1440×900.



The production build and unit tests pass. Portfolio integration checks cover the main workflows at 390px and 1440px, WCAG A/AA checks including WCAG 2.2 target sizes, and failure handling. The mobile Lighthouse lab result is saved in `docs/performance.json`; it is a local observation, not a field-performance guarantee.


## Browser workflow checks

`npm run test:browser` exercises the production build at desktop, phone and landscape sizes, including WCAG checks. CI starts the application and uses an isolated browser context for each size. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome, or install Playwright Chromium with `npx playwright install chromium`.

The browser check expects the seeded four-person event. CI uses a temporary SQLite database and the actual Node server; no browser API simulation is involved.
