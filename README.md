# ebay-scraper
Wanted to automate the auditing I do on my ebay orders, by automating getting, sell price, tax, fees, shipping, ect I hope to save much wasted time inputting it all into excel.

So far.
Update scraper to v11: Deep Dive Logic & Auditing

- Implemented "Deep Dive" navigation to visit individual order pages.
- Added extraction for Date Sold, Net Earnings, Transaction Fees, and Ad Fees.
- Added "Anti-Drift" logic to correctly map fees to the right transaction.
- Added logic to force standard envelope shipping to $0.74.
- Implemented automated screenshots for every order (saved to /screenshots).
- Added dynamic filename generation based on order date range.
- Forced all currency values to positive numbers.
