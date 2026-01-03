// This script uses Playwright to automate browsing eBay and XLSX to write data to an Excel file.
// VERSION: Deep Dive v11 (Date Range Filenames & Formatted Date Column)

const playwright = require('playwright');
const xlsx = require('xlsx');
const path = require('path'); 
const readline = require('readline');
const fs = require('fs'); 

// --- Configuration ---
const USER_DATA_DIR = path.join(__dirname, 'user_data'); 
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots'); 
const EBAY_ORDERS_URL = 'https://www.ebay.com/sh/ord/?filter=status:ALL_ORDERS';
//qwer
async function main() {
  console.log('🚀 Starting the eBay FINANCIAL SCRAPER...');
  
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR);
  }

  const context = await playwright.chromium.launchPersistentContext(USER_DATA_DIR, { 
    headless: false, 
    viewport: null, 
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
  });
  
  const page = await context.newPage();
  const allDetailedOrders = [];
  const validDates = []; // Store real Date objects for sorting

  try {
    // --- 1. Navigate to Order List ---
    console.log(`Navigating to list: ${EBAY_ORDERS_URL}`);
    await page.goto(EBAY_ORDERS_URL);
    await page.waitForTimeout(3000);

    const content = await page.content();
    if (content.includes('We looked everywhere') || content.includes('Page not found') || content.includes('signin')) {
        console.warn('⚠️  Login/Navigation needed. Please navigate to your "All Orders" page manually.');
        console.warn('   (Waiting 5 seconds for you to find the list...)');
        await page.waitForTimeout(5000);
    } else {
        console.log('Waiting 3 seconds for list to settle...');
        await page.waitForTimeout(3000);
    }

    // --- 2. Gather All Order URLs ---
    console.log('Scanning list for "View order details" links...');
    const orderLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
            .filter(a => a.href.includes('ord/details') || a.innerText.includes('View order details'))
            .map(a => a.href)
            .filter((v, i, a) => a.indexOf(v) === i); 
    });

    console.log(`Found ${orderLinks.length} orders to process.`);

    // --- 3. Loop Through Each Order ---
    for (let i = 0; i < orderLinks.length; i++) {
        const url = orderLinks[i];
        console.log(`\n[${i + 1}/${orderLinks.length}] Processing Order...`);
        console.log(`   URL: ${url}`);
        
        try {
            await page.goto(url);
            const delay = Math.floor(Math.random() * 1500) + 1000;
            await page.waitForTimeout(delay);

            // Scrape the details
            const orderData = await page.evaluate(() => {
                const data = {};

                // --- HELPER: Clean & Format ---
                function cleanPrice(text) {
                    if (!text) return '0.00';
                    const match = text.match(/[\$£€]?\s?[\d,]+\.\d{2}/); 
                    if (match) {
                        const num = parseFloat(match[0].replace(/[\$£€,]/g, ''));
                        return '$' + num.toFixed(2);
                    }
                    return '0.00';
                }
                
                function parsePrice(text) {
                    if (!text) return 0.00;
                    const match = text.match(/[\d,]+\.\d{2}/);
                    if (match) return parseFloat(match[0].replace(/,/g, ''));
                    return 0.00;
                }
                
                function formatPrice(num) {
                    return '$' + Math.abs(num).toFixed(2);
                }

                function getValueByLabel(labels, isPrice = true) {
                    if (!Array.isArray(labels)) labels = [labels];
                    const candidates = Array.from(document.querySelectorAll('div, span, p, td, th, dt, dd'));
                    
                    const labelMatches = candidates.filter(el => {
                        if (!el.innerText) return false;
                        const text = el.innerText.toLowerCase().trim().replace(':', '');
                        return labels.some(l => text === l.toLowerCase() || text.startsWith(l.toLowerCase())) && el.innerText.length < 60;
                    });

                    for (const el of labelMatches) {
                        let sibling = el.nextElementSibling;
                        while (sibling) {
                            const txt = sibling.innerText;
                            if (txt && (txt.match(/[\$£€]/) || txt.toLowerCase().includes('free'))) {
                                return isPrice ? cleanPrice(txt) : txt.trim();
                            }
                            sibling = sibling.nextElementSibling;
                        }
                        if (el.parentElement) {
                            let parentSibling = el.parentElement.nextElementSibling;
                            if (parentSibling) {
                                const txt = parentSibling.innerText;
                                if (txt && txt.match(/[\$£€]/)) {
                                    return isPrice ? cleanPrice(txt) : txt.trim();
                                }
                            }
                        }
                    }
                    return isPrice ? '0.00' : 'N/A';
                }

                function getTransactionFeesSmart() {
                    const allEls = Array.from(document.querySelectorAll('div, span, p, a, button'));
                    const feeLabels = allEls.filter(el => 
                        el.innerText && 
                        el.innerText.toLowerCase().includes('transaction fees') && 
                        el.innerText.length < 50
                    );

                    for (const feeLabel of feeLabels) {
                        if (feeLabel.parentElement && feeLabel.parentElement.nextElementSibling) {
                            const val = feeLabel.parentElement.nextElementSibling.innerText;
                            if (val.match(/[\$£€]?\s?[\d,]+\.\d{2}/)) {
                                 return cleanPrice(val);
                            }
                        }
                        let container = feeLabel.parentElement;
                        for(let i=0; i<3; i++) { 
                            if(!container) break;
                            const text = container.innerText;
                            const prices = text.match(/-?[\$£€]?\s?[\d,]+\.\d{2}/g);
                            if (prices && prices.length > 0) {
                                return cleanPrice(prices[prices.length - 1]);
                            }
                            container = container.parentElement;
                        }
                    }
                    return '0.00';
                }

                // --- 1. Order ID ---
                const fullText = document.body.innerText;
                const orderIdMatch = fullText.match(/(\d{2}-\d{5}-\d{5})/);
                data['Order ID'] = orderIdMatch ? orderIdMatch[0] : 'N/A';

                // --- 2. Item Title ---
                const itemLink = document.querySelector('a[href*="/itm/"]');
                if (itemLink && itemLink.innerText.length > 5) {
                    data['Item Title'] = itemLink.innerText.trim();
                } else {
                    const titleEl = document.querySelector('.item-title, [data-test-id="item-title"]');
                    data['Item Title'] = titleEl ? titleEl.innerText.trim() : 'N/A';
                }

                // --- 3. Date Sold (Clean Format) ---
                // Regex matches "Oct 12, 2025" or "12 Oct 2025"
                const dateRegex = /(?:Paid on|Sold on|Date sold|Date paid)\s+([A-Z][a-z]{2}\s\d{1,2},?\s\d{4})/;
                const dateMatch = fullText.match(dateRegex);
                
                if (dateMatch) {
                    // Convert "Oct 12, 2025" to a Date object then to string
                    try {
                        const dateObj = new Date(dateMatch[1]);
                        // Format as MM/DD/YYYY for Excel
                        data['Date Sold'] = dateObj.toLocaleDateString('en-US'); 
                        data['RawDate'] = dateObj.getTime(); // Hidden field for sorting later
                    } catch (e) {
                        data['Date Sold'] = dateMatch[1];
                    }
                } else {
                    // Fallback search for just the date pattern
                    const rawDateMatch = fullText.match(/([A-Z][a-z]{2}\s\d{1,2},?\s\d{4})/);
                    if (rawDateMatch) {
                         try {
                            const dateObj = new Date(rawDateMatch[1]);
                            data['Date Sold'] = dateObj.toLocaleDateString('en-US');
                            data['RawDate'] = dateObj.getTime();
                        } catch (e) {
                            data['Date Sold'] = rawDateMatch[1];
                        }
                    } else {
                        data['Date Sold'] = 'Unknown';
                    }
                }

                // --- 4. Revenue ---
                const subtotalStr = getValueByLabel(['Subtotal', 'Items subtotal', 'Price']);
                const shipPaidStr = getValueByLabel(['Shipping', 'Shipping cost', 'Shipping service']);
                const totalStr = getValueByLabel(['Order total', 'Total']);
                
                // --- 5. Tax ---
                let taxStr = getValueByLabel(['Tax', 'Sales tax', 'VAT', 'GST', 'Government taxes', 'Import charges']);
                const subtotalVal = parsePrice(subtotalStr);
                const shipPaidVal = parsePrice(shipPaidStr);
                const totalVal = parsePrice(totalStr);
                const taxVal = parsePrice(taxStr);

                if (taxVal === 0 && totalVal > 0) {
                    const calculatedTax = totalVal - subtotalVal - shipPaidVal;
                    if (calculatedTax > 0.05) { 
                        taxStr = formatPrice(calculatedTax) + ' (Calc)';
                    }
                }

                data['Sold Price (Subtotal)'] = cleanPrice(subtotalStr);
                data['Shipping (Charged to Buyer)'] = cleanPrice(shipPaidStr);
                data['Tax Collected'] = cleanPrice(taxStr);
                data['Order Total'] = cleanPrice(totalStr);

                // --- 6. Costs ---
                data['Transaction Fees'] = getTransactionFeesSmart();
                data['Ad Fees'] = getValueByLabel(['Ad Fee Standard', 'Ad Fee']);
                
                // --- 7. Shipping Logic ---
                const isStandardEnvelope = fullText.includes('eBay Standard Envelope') || 
                                           fullText.includes('ESUS') || 
                                           (data['Item Title'] && data['Item Title'].includes('Standard Envelope'));
                
                let labelCostStr = getValueByLabel(['Shipping label', 'Label cost', 'Postage cost']);
                
                if (isStandardEnvelope) {
                    data['Shipping Method'] = 'eBay Standard Envelope';
                    const costVal = parsePrice(labelCostStr);
                    if (costVal === 0) {
                        data['Shipping Label Cost'] = '$0.74';
                    } else {
                        data['Shipping Label Cost'] = cleanPrice(labelCostStr);
                    }
                } else {
                    data['Shipping Method'] = 'Other';
                    data['Shipping Label Cost'] = cleanPrice(labelCostStr);
                }

                // --- 8. SKU ---
                const skuEl = document.querySelector('[class*="sku"], [class*="custom-label"]');
                data['SKU'] = skuEl ? skuEl.innerText.replace('SKU:', '').replace('Custom Label:', '').trim() : 'N/A';

                return data;
            });

            console.log(`   -> ${orderData['Order ID']} | ${orderData['Date Sold']} | Fees: ${orderData['Transaction Fees']}`);
            
            // Store valid dates for range calculation
            if (orderData.RawDate) {
                validDates.push(new Date(orderData.RawDate));
            }
            delete orderData.RawDate; // Clean up hidden field before saving

            // Screenshot Logic
            try {
                const safeTitle = (orderData['Item Title'] || 'Untitled').replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').substring(0, 50);
                const safeID = (orderData['Order ID'] || 'NoID').replace(/[^a-z0-9-]/gi, '');
                const screenshotFilename = `${safeTitle}_${safeID}.png`;
                const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFilename);
                await page.screenshot({ path: screenshotPath, fullPage: true });
            } catch (err) {
                console.warn(`      ⚠️ Screenshot error: ${err.message}`);
            }

            allDetailedOrders.push(orderData);

        } catch (err) {
            console.error(`   ❌ Failed to process order: ${err.message}`);
        }
    }

    // --- 4. Write to Excel with DYNAMIC NAME ---
    if (allDetailedOrders.length > 0) {
      
      let filename = 'ebay_orders.xlsx';
      
      // Calculate Date Range
      if (validDates.length > 0) {
          validDates.sort((a, b) => a - b); // Sort oldest to newest
          
          const startDate = validDates[0];
          const endDate = validDates[validDates.length - 1];

          // Helper to get MM-DD-YY
          const getStr = (d) => {
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const yy = String(d.getFullYear()).slice(-2);
              return `${mm}-${dd}-${yy}`;
          };

          const startStr = getStr(startDate);
          const endStr = getStr(endDate);
          
          // Timestamp for uniqueness (HourMinute)
          const now = new Date();
          const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');

          // Filename: Orders_10-12-25_to_12-13-25_Run1430.xlsx
          filename = `Orders_${startStr}_to_${endStr}_Run${timeStr}.xlsx`;
      }

      console.log(`\nWriting ${allDetailedOrders.length} records to ${filename}...`);
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(allDetailedOrders);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Detailed Orders');
      xlsx.writeFile(workbook, filename);
      console.log(`✅ Success! File created: ${filename}`);
    } else {
        console.warn('⚠️ No data collected.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n🔴 PRESS [ENTER] TO CLOSE...');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => rl.question('', resolve));
    rl.close();
    await context.close();
  }
}

main();