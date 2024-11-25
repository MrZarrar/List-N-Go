const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors()); // Enable CORS for all origins (you can customize this later)
app.use(compression());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.resolve(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Shopping.html'));
});

// Function to scrape price from Asda
const getPriceFromAsda = async (item) => {
    const url = `https://groceries.asda.com/search/${encodeURIComponent(item)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Select the product price
        const priceElement = $('.co-item .co-product__price').first();
        if (priceElement.length === 0) return null;

        const priceText = priceElement.text().trim();
        const numericPrice = priceText.replace(/[^\d.]/g, '');
        return parseFloat(numericPrice) || null;
    } catch (error) {
        console.error('Scraping error from Asda:', error.message);
        return null;
    }
};

// Function to scrape price from Sainsburys
const getPriceFromSainsburys = async (item) => {
    const url = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(item)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Select the price container
        const priceElement = $('.pt__cost__retail-price').first();
        if (priceElement.length === 0) return null;

        const priceText = priceElement.text().trim();
        const numericPrice = priceText.replace(/[^\d.]/g, '');
        return parseFloat(numericPrice) || null;
    } catch (error) {
        console.error('Scraping error from Sainsburys:', error.message);
        return null;
    }
};

// Function to scrape price from Tesco
const getPriceFromTesco = async (item) => {
    const url = `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item)}&inputType=free+text/`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Select the price container
        const priceElement = $('.ddsweb-buybox__price .styled__PriceText-sc-v0qv7n-1').first();
        if (priceElement.length === 0) return null;

        const priceText = priceElement.text().trim();
        const numericPrice = priceText.replace(/[^\d.]/g, '');
        return parseFloat(numericPrice) || null;
    } catch (error) {
        console.error('Scraping error from Tesco:', error.message);
        return null;
    }
};

// Cache to store prices
const cache = new Map();

// Post route to get the price
app.post('/get-price', async (req, res) => {
    const { store, item } = req.body;

    if (!store || !item) {
        console.error('Store and item are required.');
        return res.status(400).json({ error: 'Store and item are required.' });
    }

    const cacheKey = `${store}-${item.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        console.log(`Cache hit for ${store}-${item}`);
        return res.json({ price: cache.get(cacheKey) });
    }

    try {
        console.log(`Scraping price for ${store} - ${item}`);
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
            console.error(`Invalid price received for ${store}-${item}:`, price);
            return res.status(500).json({ error: 'Invalid price received from scraper.' });
        }

        cache.set(cacheKey, price);
        console.log(`Price scraped for ${store}-${item}: ${price}`);
        res.json({ price });
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});