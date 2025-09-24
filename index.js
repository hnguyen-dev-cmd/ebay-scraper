// This script uses Playwright to automate browsing eBay and XLSX to write data to an Excel file.
// It is designed to be a starter template. You will need to inspect the eBay website
// to get the correct selectors for the elements you want to scrape.

// Import required libraries
const playwright = require('playwright');
const xlsx = require('xlsx');
require('dotenv').config(); // Use .env file for sensitive data like login credentials

// --- Configuration ---
// IMPORTANT: Create a .env file in the same directory with these lines:
// EBAY_EMAIL="your-ebay-email@example.com"
// EBAY_PASSWORD="your-ebay-password"
const { EBAY_EMAIL, EBAY_PASSWORD } = process.env;
const EBAY_ORDERS_URL = 'https://www.ebay.com/sh/ord/all';
const OUTPUT_EXCEL_FILE = 'ebay_orders.xlsx';

/**
 * The main function that orchestrates the browser automation and data scraping.
 */
async function main() {
  // --- 1. Validation and Setup ---
  if (!EBAY_EMAIL || !EBAY_PASSWORD) {
    console.error(
      'Error: EBAY_EMAIL and EBAY_PASSWORD must be set in your .env file.'
    );
    console.log(
      'Create a file named .env and add your credentials there.'
    );
    return;
  }

  console.log('🚀 Starting the eBay order scraper...');
  const browser = await playwright.chromium.launch({ headless: false }); // headless: false lets you watch the browser
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // --- 2. Login to eBay ---
    console.log('Navigating to eBay login page...');
    await page.goto('https://www.ebay.com/signin/');

    console.log('Entering login credentials...');
    // Fill in email/username
    await page.locator('#userid').fill(EBAY_EMAIL);
    await page.locator('#signin-continue-btn').click();
    
    // Wait for the password field to appear and fill it in
    await page.waitForSelector('#pass', { timeout: 10000 });
    await page.locator('#pass').fill(EBAY_PASSWORD);
    await page.locator('#sgnBt').click();
    
    // Wait for successful login by checking for a known element on the home page
    await page.waitForSelector('#gh-ug', { timeout: 15000 });
    console.log('✅ Login successful!');

    // --- 3. Navigate to the Orders Page ---
    console.log(`Navigating to the orders page: ${EBAY_ORDERS_URL}`);
    await page.goto(EBAY_ORDERS_URL);
    await page.waitForLoadState('domcontentloaded');

    // --- 4. Scrape Order Data from the Page ---
    console.log('Scraping order data from the page...');
    
    // This is the most critical part and may need to be updated if eBay changes its website structure.
    // You must use your browser's "Inspect Element" tool to find the correct selectors.
    // The selector '.d-item-row' is a placeholder for the element that contains each order.
    const orders = await page.evaluate(() => {
        const scrapedData = [];
        // This selector is an EXAMPLE. You'll need to find the real one for order rows.
        const orderRows = document.querySelectorAll('div[data-comp-name="ebay-table-body"] > div.ebay-table-row'); 

        for (const row of orderRows) {
            // These selectors are also EXAMPLES.
            const orderDate = row.querySelector('.order-date-cell .text-body-2')?.innerText.trim();
            const buyer = row.querySelector('.buyer-name-cell .text-body-2 a')?.innerText.trim();
            const itemTitle = row.querySelector('.item-title-cell .text-body-2')?.innerText.trim();
            const totalPrice = row.querySelector('.total-price-cell .text-body-2')?.innerText.trim();
            const orderNumber = row.querySelector('div[data-ebay-testid="orderIdCell"] a.text-link')?.innerText.trim();

            if (itemTitle) { // Only add if we found an item title
                 scrapedData.push({
                    'Order Date': orderDate || 'N/A',
                    'Buyer': buyer || 'N/A',
                    'Item Title': itemTitle,
                    'Total Price': totalPrice || 'N/A',
                    'Order Number': orderNumber || 'N/A',
                });
            }
        }
        return scrapedData;
    });

    if (orders.length === 0) {
      console.warn('⚠️ No orders found. The selectors might be outdated or there are no orders on this page.');
    } else {
      console.log(`✅ Scraped ${orders.length} orders successfully.`);
      console.log(orders);
    }
    
    // --- 5. Write Data to Excel File ---
    console.log(`Writing data to ${OUTPUT_EXCEL_FILE}...`);
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(orders);
    
    // Add the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'eBay Orders');

    // Write the workbook to a file
    xlsx.writeFile(workbook, OUTPUT_EXCEL_FILE);
    console.log('✅ Excel file has been created successfully!');

  } catch (error) {
    console.error('❌ An error occurred during the scraping process:', error);
  } finally {
    // --- 6. Close the Browser ---
    console.log('Closing the browser.');
    await browser.close();
  }
}

// Run the main function
main();
