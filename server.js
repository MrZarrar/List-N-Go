const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors()); // Allow CORS for the API
app.use(express.json()); // Parse JSON payloads

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to scrape Asda for the price of an item
async function getPriceFromAsda(item) {
    const searchUrl = `https://groceries.asda.com/search/${encodeURIComponent(item)}`;
    try {
        const response = await axios.get(searchUrl);
        const $ = cheerio.load(response.data);
        const priceElement = $('.product-price');
        if (!priceElement.length) return null;
        const priceText = priceElement.first().text().trim();
        return parseFloat(priceText.replace('£', '').replace(',', '')) || null;
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
        return parseFloat(priceText.replace('£', '').replace(',', '')) || null;
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
        return parseFloat(priceText.replace('£', '').replace(',', '')) || null;
    } catch (error) {
        console.error('Error fetching price from Tesco:', error);
        return null;
    }
}

// Define your API route to get the price from a specified store
app.post('/get-price', async (req, res) => {
    const { store, item } = req.body;

    if (!store || !item) {
        return res.status(400).json({ error: 'Store and item are required.' });
    }

    let price = null;

    try {
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

        res.json({ price });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Serve frontend files (index.html, CSS, JS, etc.) from the 'public' directory
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export the app for Vercel (this allows Vercel to understand and run it properly)
module.exports = app;