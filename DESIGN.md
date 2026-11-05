# Split interface

A shared-expense ledger: warm paper, dark green ink, serif totals and a separate green repayment column. Keep the amount and the people involved easy to scan; transaction actions remain secondary until needed.

The desktop workspace keeps totals above a scrollable ledger. On narrow screens, switch between the ledger and repayments rather than squeezing both together. Search and categories belong to the current event and reset when it changes.

Expense entry shows the exact cent allocation before committing. Use the same `splitCents` function as the server. Preserve integer-cent arithmetic, selected participant order, payment undo, CSV export and native dialog focus. Recording a repayment never transfers money.

`tokens.css` supplies base colours; `design.css` defines the ledger identity; `dashboard.css` owns viewport and panel sizing. Body text uses Segoe UI; display figures use the existing serif family. Do not add a theme switch or portfolio navigation.
