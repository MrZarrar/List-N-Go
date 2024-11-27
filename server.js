const express = require('express');
const { chromium } = require('playwright');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());

// Serve static files
app.use(express.static(path.resolve(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Shopping.html'));
});

// Persistent browser instance
let browserInstance;

const getBrowserInstance = async () => {
    if (!browserInstance) {
        browserInstance = await chromium.launch({
            headless: true,
            timeout: 10000, // Adjusted timeout for launching the browser
        });
        console.log('Browser launched');
    }
    return browserInstance;
};

// Playwright scraper function
const scrapeWithPlaywright = async (url, selectors) => {
    try {
        const browser = await getBrowserInstance();
        const page = await browser.newPage();
        console.log("Navigating to:", url);

        // Go to the page and wait for the price element to be available
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 50000 });
        console.log("Page loaded, waiting for price element...");

        // Wait for the price element to appear
        await page.waitForSelector(selectors.price, { timeout: 50000 });

        const result = await page.evaluate((selectors) => {
            const element = document.querySelector(selectors.price);
            if (!element) return null;

            const text = element.textContent.trim();
            const numericPrice = text.replace(/[^\d.]/g, '');
            return parseFloat(numericPrice) || null;
        }, selectors);

        console.log("Scraping result:", result);
        await page.close();  // Close the page, not the browser
        return result;

    } catch (error) {
        console.error('Error scraping with Playwright:', error.message);
        return null;
    }
};

// Functions to scrape prices
const getPriceFromAsda = async (item) => {
    const url = `https://groceries.asda.com/search/${encodeURIComponent(item)}`;
    const selectors = { price: '.co-product__price' };
    return scrapeWithPlaywright(url, selectors);
};

const getPriceFromSainsburys = async (item) => {
    const url = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(item)}`;
    const selectors = { price: '.pt__cost__retail-price' };
    return scrapeWithPlaywright(url, selectors);
};

const getPriceFromTesco = async (item) => {
    const url = `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item)}`;
    const selectors = { price: '.ddsweb-buybox__price .styled__PriceText-sc-v0qv7n-1' };
    return scrapeWithPlaywright(url, selectors);
};

// Cache to store prices
const cache = new Map();
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000 * 7;  // 7 days

app.post('/get-price', async (req, res) => {
    const { store, item } = req.body;

    if (!store || !item) {
        return res.status(400).json({ error: 'Store and item are required.' });
    }

    const cacheKey = `${store}-${item.toLowerCase()}`;

    // Check if item exists in the cache and is still valid
    if (cache.has(cacheKey)) {
        const cachedData = cache.get(cacheKey);
        if (Date.now() - cachedData.timestamp < CACHE_EXPIRATION) {
            return res.json({ price: cachedData.price });
        } else {
            cache.delete(cacheKey);
        }
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

        // Save result to cache with a timestamp
        cache.set(cacheKey, { price, timestamp: Date.now() });
        res.json({ price });
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});