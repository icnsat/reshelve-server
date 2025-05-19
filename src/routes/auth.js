import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';

import getDb from '../database.js';
// import { authenticateToken } from '../authenticateToken.js';

const router = express.Router();
const secret_key = process.env.SECRET_KEY;


/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Аутентификация и регистрация пользователей
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован, возвращается JWT и данные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Ошибка валидации (Email или Username уже существуют)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Внутренняя ошибка сервера
 */
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


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Вход пользователя по email и паролю
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Успешный вход, возвращает JWT и данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Неверный email или пароль
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Внутренняя ошибка сервера
 */
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


export default router;