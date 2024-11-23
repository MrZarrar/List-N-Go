const puppeteer = require("puppeteer");

const item = '6 pint milk';
const url = `https://groceries.asda.com/search/${encodeURIComponent(item)}`;

const main = async () => {
    const browser = await puppeteer.launch({ headless: true }); // Set to false to see the browser in action
    const page = await browser.newPage();

    // Navigate to the URL
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    try {
        // Wait for the product container to load
        await page.waitForSelector('.co-item', { timeout: 3000 });

        // Extract the price and availability
        const productData = await page.evaluate(() => {
            const product = document.querySelector('.co-item');

            if (!product) {
                return { price: 'Product not found', availability: 'N/A' };
            }

            // Extract price
            const priceElement = product.querySelector('.co-product__price');
            const price = priceElement ? priceElement.textContent.trim() : 'Price not found';



            return { price };
        });

        console.log(`The price of ${item} is: ${productData.price}`);
    } catch (error) {
        console.error("Error while scraping:", error.message);
    } finally {
        await browser.close();
    }
};

main().catch(console.error);