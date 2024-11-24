const express = require('express');
const puppeteer = require('puppeteer');
require("dotenv").config();
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(compression());
app.use(express.json());

// Serve static files from the 'build' directory (or your public directory)
app.use(express.static(path.resolve(__dirname)));  // Adjust if your frontend is in a different folder

// Utility to add a delay (replaces waitForTimeout)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to launch a new browser instance
const launchBrowser = async () => {
    return await puppeteer.launch({
        executablePath:
            process.env.NODE_ENV === "production"
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),
        headless: true // Set to false for debugging


    });
};

// Function to scrape price from Asda
const getPriceFromAsda = async (item) => {
    const url = `https://groceries.asda.com/search/${encodeURIComponent(item)}`;
    console.log(`Starting Asda scrape for item: ${item}`);

    const browser = await launchBrowser(); // Launch a new browser instance
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
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // Timeout set to 1 minute
        console.log('Asda page loaded');
        await page.waitForSelector('.co-item', { timeout: 60000 }); // Timeout set to 1 minute
        await delay(100); // Wait for content to load

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
        console.error('Asda scraping error:', error.message);
        return null;
    } finally {
        await browser.close(); // Close the browser after each request
    }
};

// Function to scrape price from Sainsburys
const getPriceFromSainsburys = async (item) => {
    const url = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(item)}`;
    console.log(`Starting Sainsburys scrape for item: ${item}`);

    const browser = await launchBrowser(); // Launch a new browser instance
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (['image', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // Timeout set to 1 minute
        console.log('Sainsburys page loaded');
        await page.waitForSelector('.pt__cost__retail-price__wrapper', { timeout: 60000 }); // Timeout set to 1 minute
        await delay(100);

        const productData = await page.evaluate(() => {
            const priceContainer = document.querySelector('.pt__cost__retail-price__wrapper');
            if (!priceContainer) return { price: null };

            const priceElement = priceContainer.querySelector('.pt__cost__retail-price');
            const priceText = priceElement ? priceElement.textContent.trim() : null;
            if (priceText) {
                const numericPrice = priceText.replace(/[^\d.]/g, '');
                return { price: parseFloat(numericPrice) };
            }

            return { price: null };
        });

        return productData.price || null;
    } catch (error) {
        console.error('Sainsburys scraping error:', error.message);
        return null;
    } finally {
        await browser.close();
    }
};

// Function to scrape price from Tesco
const getPriceFromTesco = async (item) => {
    const url = `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item)}&inputType=free+text/`;
    console.log(`Starting Tesco scrape for item: ${item}`);

    const browser = await launchBrowser(); // Launch a new browser instance
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (['image', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // Timeout set to 1 minute
        console.log('Tesco page loaded');
        await page.waitForSelector('.ddsweb-buybox__price', { timeout: 60000 }); // Timeout set to 1 minute
        await delay(100);

        const productData = await page.evaluate(() => {
            const priceContainer = document.querySelector('.ddsweb-buybox__price');
            if (!priceContainer) return { price: null };

            const priceElement = priceContainer.querySelector('.styled__PriceText-sc-v0qv7n-1');
            const priceText = priceElement ? priceElement.textContent.trim() : null;
            if (priceText) {
                const numericPrice = priceText.replace(/[^\d.]/g, '');
                return { price: parseFloat(numericPrice) };
            }

            return { price: null };
        });

        return productData.price || null;
    } catch (error) {
        console.error('Tesco scraping error:', error.message);
        return null;
    } finally {
        await browser.close();
    }
};

const cache = new Map();

app.post('/get-price', async (req, res) => {
    const { store, item } = req.body;
    console.log(`Received request for store: ${store}, item: ${item}`);

    if (!store || !item) {
        console.error('Missing store or item in request.');
        return res.status(400).json({ error: 'Store and item are required.' });
    }

    const cacheKey = `${store}-${item.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        console.log(`Cache hit for ${cacheKey}`);
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
                console.error(`Unsupported store: ${store}`);
                return res.status(400).json({ error: 'Store not supported.' });
        }

        if (price === null || isNaN(price)) {
            console.error('Invalid price received from scraper.');
            return res.status(500).json({ error: 'Invalid price received from scraper.' });
        }

        console.log(`Scraped price for ${item} at ${store}: £${price}`);
        cache.set(cacheKey, price);
        res.json({ price });
    } catch (error) {
        console.error('Error processing request:', error.message, error.stack);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Serve index.html for any route that doesn't match an API endpoint
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'Shopping.html'));  // Adjust if needed
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

console.log('Current working directory:', __dirname);