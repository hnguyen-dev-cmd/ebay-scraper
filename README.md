# ebay-scraper
Wanted to automate the auditing I do on my ebay orders, by automating getting, sell price, tax, fees, shipping, ect I hope to save much wasted time inputting it all into excel.

So far.

Deep Dive Navigation: Script now visits individual "Order Details" pages instead of just scraping the list view.

Financial Auditing: Added extraction for Net Earnings data: Transaction Fees, Ad Fees, and Shipping Label costs.

Smart Logic: Implemented "Anti-Drift" logic to correctly identify Transaction Fees without confusing them with shipping costs.

Standard Envelope Handling: Added logic to detect "eBay Standard Envelope" and default shipping cost to $0.74.

Date Handling: Added "Date Sold" extraction and formatting.

Dynamic Filenames: Output Excel files are now automatically named based on the date range of orders found (e.g., Orders_10-12-25_to_12-13-25.xlsx) to prevent overwriting.

Screenshots: Implemented full-page screenshot capture for every order, saved with unique filenames for auditing.

Data Cleaning: Forced all extracted currency values to be positive numbers for easier spreadsheet math.
