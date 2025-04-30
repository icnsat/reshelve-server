import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';

import getDb from '../database.js';
// import { authenticateToken } from '../authenticateToken.js';

const router = express.Router();
const secret_key = process.env.SECRET_KEY;

router.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const db = getDb();
        
        const [user] = await db`
            INSERT INTO users (email, username, password_hash, role_id)
            VALUES (
                ${email},
                ${username},
                ${hashedPassword},
                (SELECT id FROM roles WHERE name = 'user')
            )
            RETURNING id, username, email, role_id
        `;
        
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                email: user.email,
                role: user.role_id 
            }, 
            secret_key,
            { expiresIn: '1h' }
        );
        
        res.status(201).json({ 
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role_id,
            token 
        });
        
    } catch (err) {
        if (err.message.includes('unique constraint')) {
            if (err.message.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (err.message.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }
        res.status(500).json({ error: err.message });
    }
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const db = getDb();
        
        const [user] = await db`
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.password_hash,
                r.name AS role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = ${email}
        `;
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            secret_key,
            { expiresIn: '1h' }
        );
        
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            token
        });
        
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update role (не требуется аутентификация - удалить?)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { role_id } = req.body;
    const db = getDb();
    
    try {
        const [user] = await db`
            UPDATE users 
            SET 
                role_id = ${role_id}
            WHERE id = ${id}
            RETURNING id, role_id
        `;
        
        if (!user) {
            return res.status(404).json({ error: 'user not found' });
        }
        
        res.json({ 
            id: user.id,
            message: 'user updated successfully' 
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});


export default router;