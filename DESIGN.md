# Split interface

Typography: Poppins, self-hosted. Weights 400, 500, and 600. Application body 16 px; controls and supporting data use 12–14 px. No tracked capitals or marketing headlines.

Layout: event navigation, a transaction ledger, and a separate repayment list.

Colours and fonts live in src/tokens.css. Both themes have explicit foreground/background pairs, native colour schemes, and focus rings. The theme control stores an app-specific preference; system preference is used on the first visit.

Preserve existing fields, API routes, calculations, downloads, and keyboard controls. Avoid decorative badges, status dots, oversized introductions, slogans, and background illustrations. State indicators must communicate real application state.

Material flat refinement: tonal surfaces rather than outlined containers, filled fields with a clear lower edge, neutral secondary actions, no shadows, and one primary action per task state. Keep real data and work controls prominent.

Desktop work areas fit 1280x800 and 1366x768 viewports. Keep the main controls visible; contain long lists within panels. Mobile layouts use readable stacked sections.
