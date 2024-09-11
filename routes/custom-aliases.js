const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    // Token can be in the body or authorization header
    const token = req.body.user_token || (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);

    if (!token) {
        return res.status(401).json({ error: 'Token is required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// POST route to create custom short link
router.post('/custom-aliases', authenticateToken, async (req, res) => {
    const { original_link, custom_link } = req.body;
    const userId = req.user.id; // Correctly referenced userId

    if (!original_link || !custom_link) {
        return res.status(400).json({ error: 'Original link and custom link are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM custom_links WHERE custom_link = $1 AND user_id = $2', [custom_link, userId]);
        if (result.rows.length > 0) {
            return res.status(400).json({ error: 'Custom link already exists' });
        }

        // Correct the usage of `userId` in the query instead of `user_id`
        await pool.query('INSERT INTO public.custom_links(user_id, original_link, custom_link) VALUES ($1, $2, $3)', [userId, original_link, custom_link]);
        res.status(200).json({
            code: 200,
            data: {
                original_link,
                converted_custom_link: `https://bi-kay.com/${custom_link}`
            }
        });
    } catch (error) {
        console.error('Error occurred during custom alias creation:', error); // Log error details
        res.status(500).json({ response: 500, error: 'Internal Server Error' });
    }
});

// GET route to retrieve all converted custom aliases
router.get('/custom-aliases', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query('SELECT * FROM custom_links WHERE user_id = $1', [userId]);
        const converted_custom_links = {};
        result.rows.forEach((row, index) => {
            converted_custom_links[index + 1] = {
                original_link: row.original_link,
                converted_custom_link: `https://bi-kay.com/${row.custom_link}`
            };
        });

        res.status(200).json({
            code: 200,
            converted_custom_links
        });
    } catch (error) {
        console.error('Error occurred during fetching custom aliases:', error); // Log error details
        res.status(500).json({ response: 500, error: 'Internal Server Error' });
    }
});

module.exports = router;
