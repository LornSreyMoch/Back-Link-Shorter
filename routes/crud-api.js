const express = require('express');
const pool = require('../db'); // Use correct path for db.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router(); // Use express.Router() for consistency
const jwtSecretKey = process.env.JWT_SECRET;

router.use(express.json()); // Middleware to parse JSON bodies

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, jwtSecretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Middleware for admin role verification
const authenticateAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied, admin only' });
    }
    next();
};

// Signup route to create new users
router.post('/signup', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash password

        await pool.query(
            'INSERT INTO public.users(username, password, role) VALUES ($1, $2, $3)', 
            [username, hashedPassword, role]
        );

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Login route for users
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(403).json({ error: 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(403).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, jwtSecretKey, { expiresIn: '12h' });

        res.status(200).json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin route: get all links
router.get('/links', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id AS user_id, u.username, l.original_link, l.converted_link
            FROM users u
            JOIN links l ON u.id = l.user_id`
        );

        const users = {};

        result.rows.forEach(row => {
            if (!users[`user_${row.user_id}`]) {
                users[`user_${row.user_id}`] = {
                    username: row.username,
                    list_of_converted_links: {}
                };
            }
            users[`user_${row.user_id}`].list_of_converted_links[row.original_link] = row.converted_link;
        });

        res.status(200).json({
            code: 200,
            users
        });
    } catch (error) {
        console.error('Admin links error:', error.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Convert a link (authenticated users)
router.post('/convert', authenticateToken, async (req, res) => {
    const { link } = req.body;

    try {
        const user = req.user;
        const shortened_link = `https://short.ly/${Math.random().toString(36).substring(2, 7)}`;

        const result = await pool.query(
            'INSERT INTO public.links(original_link, converted_link, user_id) VALUES ($1, $2, $3) RETURNING *',
            [link, shortened_link, user.id]
        );

        res.status(200).json({ code: 200, converted_link: shortened_link });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Delete a specific link (admin only)
router.delete('/links/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const linkCheck = await pool.query('SELECT * FROM links WHERE id = $1', [id]);
        if (linkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        await pool.query('DELETE FROM links WHERE id = $1', [id]);

        res.status(200).json({ message: 'Link deleted successfully' });
    } catch (error) {
        console.error('Error deleting link:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Update a specific link (admin only)
router.put('/links/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { original_link, converted_link } = req.body;

    if (!original_link || !converted_link) {
        return res.status(400).json({ error: 'Original link and converted link are required' });
    }

    try {
        const linkCheck = await pool.query('SELECT * FROM links WHERE id = $1', [id]);
        if (linkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        await pool.query(
            'UPDATE links SET original_link = $1, converted_link = $2 WHERE id = $3',
            [original_link, converted_link, id]
        );

        res.status(200).json({ message: 'Link updated successfully' });
    } catch (error) {
        console.error('Error updating link:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;
