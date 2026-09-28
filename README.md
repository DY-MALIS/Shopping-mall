# Store Management System

A Khmer-language store dashboard with inventory, POS sales, barcode scanning,
customers, suppliers, and reports. Open `index.html` to use it locally.

## Storage

Business data is stored in the current browser's localStorage. Each browser and
site origin has separate data; local-file data does not migrate to a deployed
website. There is no shared database or multi-user synchronization. New stores start empty. The version 2 release resets the previous version 1
business dataset once, as requested by the owner. Records entered afterward persist. Clearing browser storage removes locally saved records.

## Tests

## Customer file import

On Customers, select the file import button. Supported files: DOCX, text-based
PDF, XLSX/XLS (all sheets), CSV, TSV, and UTF-8 TXT. Use one customer per line or
a table with Name and Phone headers (Khmer headers also work). Review and edit
the extracted rows, uncheck unwanted entries, then confirm. Existing names and
duplicates within the file are skipped. Name matching ignores case and repeated
spaces; customers sharing a name need distinct names in this app.

Files are parsed in the browser, not uploaded. DOCX, PDF, and Excel readers are
loaded from pinned CDN URLs and require internet access. Scanned PDFs/images
need OCR before import; old Word DOC files must be saved as DOCX. Limits: 10 MB,
2,000 customers, and 100 PDF pages. PDFs with complex layouts may need corrections
in the preview. Phone numbers in Excel should use Text formatting to keep zeros.

Run `node tests/customer-import.cjs` for import parser checks.

Run `node tests/regression.cjs` with Node.js. Tests cover numeric input, stock
validation, HTML escaping, persistence, and empty inventory using a simulated DOM.
Camera scanning requires browser camera permission and HTTPS (or localhost).

## Vercel

Import this repository into Vercel using the Other framework preset. No build or
installation step is required; the root directory serves the static website.
