const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(compression());
app.use(express.json());

// Serve static files
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

        // Select the first product
        const product = $('.co-item').first();
        if (!product.length) return null;

        // Extract price using refined selector
        const priceElement = product.find('.co-product__price').first();
        if (!priceElement.length) return null;

        // Extract and clean the price text
        const priceText = priceElement.text().trim();
        if (!priceText) return null;

        // Remove any non-numeric characters except the decimal point
        const numericPrice = priceText.replace(/[^\d.]/g, '');
        return parseFloat(numericPrice) || null;
    } catch (error) {
        console.error('Error scraping Asda:', error.message);
        return null;
    }
};

// Function to scrape price from Sainsbury's
const getPriceFromSainsburys = async (item) => {
    const url = `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(item)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Select the price element
        const priceElement = $('.pt__cost__retail-price').first();
        if (!priceElement.length) return null;

        // Extract and convert price
        const priceText = priceElement.text().trim();
        const numericPrice = priceText.replace(/[^\d.]/g, '');
        return parseFloat(numericPrice) || null;
    } catch (error) {
        console.error('Error scraping Sainsbury\'s:', error.message);
        return null;
    }
};

// Function to scrape price from Tesco
const getPriceFromTesco = async (item) => {
    const url = `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item)}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Select the price container
        const priceElement = $('.ddsweb-buybox__price .styled__PriceText-sc-v0qv7n-1').first();
        if (!priceElement.length) return null;

        // Extract and convert price
        const priceText = priceElement.text().trim();
        const numericPrice = priceText.replace(/[^\d.]/g, '');
        return parseFloat(numericPrice) || null;
    } catch (error) {
        console.error('Error scraping Tesco:', error.message);
        return null;
    }
};

// Cache to store prices
const cache = new Map();

// Post route to get price
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
            return res.status(505).json({ error: 'Invalid price received from scraper.' });
        }

        cache.set(cacheKey, price);
        res.json({ price });
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(510).json({ error: 'Internal server error.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});