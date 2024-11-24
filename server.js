const express = require('express');
const puppeteer = require('puppeteer');
const compression = require('compression');
const cors = require('cors');

// Use environment variable or Render-specific Chrome path
const pathToChromium = process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/render/.cache/puppeteer/chrome/linux-xxxx/Google Chrome for Testing';
const app = express();
const port = process.env.PORT || 3000;

const browserPool = []; // Browser pool for managing multiple instances

// Launch multiple browser instances for pooling
(async () => {
    try {
        for (let i = 0; i < 2; i++) { // Adjust number of instances as needed
            const browser = await puppeteer.launch({
                executablePath: pathToChromium,
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    '--single-process'
                ]
            });
            browserPool.push(browser);
        }
        console.log('Browser pool initialized.');
    } catch (error) {
        console.error('Error initializing browser pool:', error.message);
        process.exit(1); // Prevent the server from starting without browser instances
    }
})();

const cache = new Map();

app.use(cors());
app.use(compression());
app.use(express.json());

// Utility to add a delay (replaces waitForTimeout)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to scrape price from Asda
const getPriceFromAsda = async (item) => {
    const url = `https://groceries.asda.com/search/${encodeURIComponent(item)}`;

    // Get a browser from the pool
    const browser = browserPool[Math.floor(Math.random() * browserPool.length)];
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    // Intercept requests and block unnecessary resources (e.g., images)
    page.on('request', (req) => {
        if (['image', 'font', 'media'].includes(req.resourceType())) {
            req.abort(); // Abort non-essential requests like images
        } else {
            req.continue(); // Continue with other requests
        }
    });

    try {
        // Open the page and wait until it is fully loaded
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 4000 });

        // Wait for the product listing to load
        await page.waitForSelector('.co-item', { timeout: 5000 });

        // Use delay to simulate a waiting period for the page to finish loading
        await delay(100);

        // Limit scraping to necessary data (price)
        const productData = await page.evaluate(() => {
            const product = document.querySelector('.co-item');
            if (!product) return { price: null };

            const priceElement = product.querySelector('.co-product__price');
            const priceText = priceElement ? priceElement.textContent.trim() : null;
            if (priceText) {
                const numericPrice = priceText.replace(/[^\d.]/g, '');
                return { price: parseFloat(numericPrice) };
            }
            return { price: null };
        });

        return productData.price || null;
    } catch (error) {
        console.error('Scraping error:', error.message);
        return null;
    } finally {
        await page.close();
    }
};

const getPriceFromSainsburys = async (item) => {
    const url = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(item)}`;

    // Get a browser from the pool
    const browser = browserPool[Math.floor(Math.random() * browserPool.length)];
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    // Intercept requests and block unnecessary resources (e.g., images)
    page.on('request', (req) => {
        if (['image', 'font', 'media'].includes(req.resourceType())) {
            req.abort(); // Abort non-essential requests like images
        } else {
            req.continue(); // Continue with other requests
        }
    });

    try {
        // Open the page and wait until it is fully loaded
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 2000 });

        // Wait for the price container to load
        await page.waitForSelector('.pt__cost__retail-price__wrapper', { timeout: 5000 });

        // Use delay to simulate a waiting period for the page to finish loading
        await delay(100);

        // Limit scraping to necessary data (price)
        const productData = await page.evaluate(() => {
            // Select the price container for the first product
            const priceContainer = document.querySelector('.pt__cost__retail-price__wrapper');
            if (!priceContainer) return { price: null };

            // Select the price text element within the container
            const priceElement = priceContainer.querySelector('.pt__cost__retail-price');
            const priceText = priceElement ? priceElement.textContent.trim() : null;

            // Extract numeric value from the price text
            if (priceText) {
                const numericPrice = priceText.replace(/[^\d.]/g, ''); // Removes £ and non-numeric characters
                return { price: parseFloat(numericPrice) }; // Converts to a float
            }

            return { price: null };
        });

        return productData.price || null;
    } catch (error) {
        console.error('Scraping error:', error.message);
        return null;
    } finally {
        await page.close();
    }
};


const getPriceFromTesco = async (item) => {
    const url = `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item)}&inputType=free+text/`;

    // Get a browser from the pool
    const browser = browserPool[Math.floor(Math.random() * browserPool.length)];
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    // Intercept requests and block unnecessary resources (e.g., images)
    page.on('request', (req) => {
        if (['image', 'font', 'media'].includes(req.resourceType())) {
            req.abort(); // Abort non-essential requests like images
        } else {
            req.continue(); // Continue with other requests
        }
    });

    try {
        // Open the page and wait until it is fully loaded
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 4000 });

        // Wait for the product price container to load
        await page.waitForSelector('.ddsweb-buybox__price', { timeout: 5000 });

        // Use delay to simulate a waiting period for the page to finish loading
        await delay(100);

        // Limit scraping to necessary data (price)
        const productData = await page.evaluate(() => {
            // Select the price container for the first product
            const priceContainer = document.querySelector('.ddsweb-buybox__price');
            if (!priceContainer) return { price: null };

            // Select the price text element within the container
            const priceElement = priceContainer.querySelector('.styled__PriceText-sc-v0qv7n-1');
            const priceText = priceElement ? priceElement.textContent.trim() : null;

            // Extract numeric value from the price text
            if (priceText) {
                const numericPrice = priceText.replace(/[^\d.]/g, ''); // Removes £ and non-numeric characters
                return { price: parseFloat(numericPrice) }; // Converts to a float
            }

            return { price: null };
        });

        return productData.price || null;
    } catch (error) {
        console.error('Scraping error:', error.message);
        return null;
    } finally {
        await page.close();
    }
};



app.post('/get-price', async (req, res) => {
    const { store, item } = req.body;

    if (!store || !item) {
        return res.status(400).json({ error: 'Store and item are required.' });
    }

    const cacheKey = `${store}-${item.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        return res.json({ price: cache.get(cacheKey) });
    }

    try {
        let price;
        switch (store) {
            case 'asda':
                price = await getPriceFromAsda(item);
                break;
            case 'sainsburys':
                price = await getPriceFromSainsburys(item);
                break;
            case 'tesco':
                price = await getPriceFromTesco(item);
                break;
            default:
                return res.status(400).json({ error: 'Store not supported.' });
        }

        if (price === null || isNaN(price)) {
            return res.status(500).json({ error: 'Invalid price received from scraper.' });
        }

        cache.set(cacheKey, price);
        res.json({ price });
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Close browser instances when the server shuts down
process.on('exit', async () => {
    if (browser) {
        await Promise.all(browserPool.map(b => b.close()));
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
