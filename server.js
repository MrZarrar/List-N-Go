const express = require('express');
const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.resolve(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Shopping.html'));
});

// Utility to add a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to launch puppeteer browser instance
const launchBrowser = async () => {
    return puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote']
    });
};

// Function to scrape data from store websites
const scrapePrice = async (store, item) => {
    const urls = {
        asda: `https://groceries.asda.com/search/${encodeURIComponent(item)}`,
        sainsburys: `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(item)}`,
        tesco: `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item)}`
    };

    const selectors = {
        asda: '.co-item .co-product__price',
        sainsburys: '.pt__cost__retail-price__wrapper .pt__cost__retail-price',
        tesco: '.ddsweb-buybox__price .styled__PriceText-sc-v0qv7n-1'
    };

    const url = urls[store];
    const selector = selectors[store];

    if (!url || !selector) {
        throw new Error(`Unsupported store: ${store}`);
    }

    console.log(`Scraping ${store} for item: ${item}`);
    const browser = await launchBrowser();
    const page = await browser.newPage();

    try {
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForSelector(selector, { timeout: 10000 });

        const priceText = await page.$eval(selector, el => el.textContent.trim());
        const numericPrice = parseFloat(priceText.replace(/[^\d.]/g, ''));

        if (isNaN(numericPrice)) throw new Error('Invalid price format');

        return numericPrice;
    } catch (error) {
        console.error(`${store} scraping error:`, error.message);
        throw new Error(`Error fetching price from ${store}`);
    } finally {
        await browser.close();
    }
};

// POST route for price fetching
app.post('/get-price', async (req, res) => {
    const { store, item } = req.body;

    if (!store || !item) {
        return res.status(400).json({ error: 'Store and item are required.' });
    }

    try {
        const price = await scrapePrice(store.toLowerCase(), item.trim());
        return res.json({ price });
    } catch (error) {
        console.error('Error fetching price:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));