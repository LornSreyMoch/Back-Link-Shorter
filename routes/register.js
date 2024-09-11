const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('../db'); // Correct the path here

const router = express.Router(); // Correct method to create a router
router.use(express.json()); // Middleware to parse JSON bodies

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO public."user-login"(username, email, password) VALUES ($1, $2, $3) RETURNING *`,
            [username, email, hashedPassword]
        );
        res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM public."user-login" WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
