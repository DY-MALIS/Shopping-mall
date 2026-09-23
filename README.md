# Store Management System

A Khmer-language store dashboard with inventory, POS sales, barcode scanning,
customers, suppliers, and reports. Open `index.html` to use it locally.

## Storage

Business data is stored in the current browser's localStorage. Each browser and
site origin has separate data; local-file data does not migrate to a deployed
website. There is no shared database or multi-user synchronization. New stores start empty. The version 2 release resets the previous version 1
business dataset once, as requested by the owner. Records entered afterward persist. Clearing browser storage removes locally saved records.

## Tests

Run `node tests/regression.cjs` with Node.js. Tests cover numeric input, stock
validation, HTML escaping, persistence, and empty inventory using a simulated DOM.
Camera scanning requires browser camera permission and HTTPS (or localhost).

## Vercel

Import this repository into Vercel using the Other framework preset. No build or
installation step is required; the root directory serves the static website.
