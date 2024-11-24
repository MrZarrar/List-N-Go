const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const app = express();
const port = 3000;

// Create a cache instance with a default TTL of 3600 seconds (1 hour)
const cache = new NodeCache({ stdTTL: 3600 });

// Helper function to scrape Asda for the price of an item
async function getPriceFromAsda(item) {
    const searchUrl = `https://groceries.asda.com/search/${encodeURIComponent(item)}`;

    try {
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);

        const priceElement = $('.product-price');
        if (!priceElement.length) return null;

        const priceText = priceElement.first().text().trim();
        const price = parseFloat(priceText.replace('£', '').replace(',', ''));
        return price || null;
    } catch (error) {
        console.error('Error fetching price from Asda:', error);
        return null;
    }
}

// Helper function to scrape Sainsbury's for the price of an item
async function getPriceFromSainsburys(item) {
    const searchUrl = `https://www.sainsburys.co.uk/webapp/wcs/stores/servlet/SearchResultsCmd?searchTerm=${encodeURIComponent(item)}`;

    try {
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);

        const priceElement = $('.product-price');
        if (!priceElement.length) return null;

        const priceText = priceElement.first().text().trim();
        const price = parseFloat(priceText.replace('£', '').replace(',', ''));
        return price || null;
    } catch (error) {
        console.error('Error fetching price from Sainsbury\'s:', error);
        return null;
    }
}

// Helper function to scrape Tesco for the price of an item
async function getPriceFromTesco(item) {
    const searchUrl = `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item)}`;

    try {
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);

        const priceElement = $('.price');
        if (!priceElement.length) return null;

        const priceText = priceElement.first().text().trim();
        const price = parseFloat(priceText.replace('£', '').replace(',', ''));
        return price || null;
    } catch (error) {
        console.error('Error fetching price from Tesco:', error);
        return null;
    }
}

// API route to get the price of an item from a specified store
app.get('/get-price', async (req, res) => {
    const { store, item } = req.query;

    if (!store || !item) {
        return res.status(400).json({ error: 'Store and item are required.' });
    }

    const cacheKey = `${store}-${item.toLowerCase()}`;

    // Check if the price is cached
    if (cache.has(cacheKey)) {
        return res.json({ price: cache.get(cacheKey) });
    }

    let price = null;

    // Choose the appropriate function based on the store
    switch (store.toLowerCase()) {
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
            return res.status(400).json({ error: 'Invalid store.' });
    }

    if (price === null) {
        return res.status(404).json({ error: 'Price not found.' });
    }

    // Cache the price for subsequent requests
    cache.set(cacheKey, price);

    return res.json({ price });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});