import express from 'express';
import getDb from '../database.js';
import authenticateToken, { requireAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Работа с книгами
 */



/**
 * @swagger
 * /books:
 *   get:
 *     summary: Получить список всех книг
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Список книг
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   author:
 *                     type: string
 *                   genre:
 *                     type: string
 *                   cover_url:
 *                     type: string
 *                   description:
 *                     type: string
 *                   published_year:
 *                     type: integer
 *       500:
 *         description: Ошибка сервера при получении списка книг
 */
router.get('/', async (req, res) => {
    const db = getDb();
    
    try {
        const books = await db`
            SELECT 
                id,
                title,
                author,
                genre,
                cover_url,
                description,
                published_year
            FROM books
            ORDER BY title ASC
        `;
        
        res.json(books);
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});


/**
 * @swagger
 * /books:
 *   post:
 *     summary: Добавить новую книгу (только для админа)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - author
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               genre:
 *                 type: string
 *               cover_url:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *               published_year:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Книга успешно добавлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Книга с таким названием уже существует
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 error:
 *                   type: string
 *       403:
 *         description: Доступ запрещён, требуется роль администратора
 *       500:
 *         description: Ошибка сервера при добавлении книги
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { title, author, genre, cover_url, description, published_year } = req.body;
    const db = getDb();

    try {
        const [book] = await db`
            INSERT INTO books (
            title,
            author,
            genre,
            cover_url,
            description,
            published_year
            ) 
            VALUES (
            ${title},
            ${author},
            ${genre},
            ${cover_url},
            ${description},
            ${published_year}
            ) 
            RETURNING id, title, author, genre, cover_url, published_year
        `;

        res.status(201).json({ 
            id: book.id,
            message: 'Book added successfully' 
        });
    } catch (err) {
        if (err.message.includes('unique constraint')) {
            return res.status(400).json({ error: 'Book with this title already exists' });
        }
        console.error('Error adding book:', err);
        res.status(500).json({ error: 'Failed to add book' });
    }
});


/**
 * @swagger
 * /books/{id}:
 *   get:
 *     summary: Получить информацию о книге по ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID книги
 *     responses:
 *       200:
 *         description: Информация о книге
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 author:
 *                   type: string
 *                 genre:
 *                   type: string
 *                 cover_url:
 *                   type: string
 *                 description:
 *                   type: string
 *                 published_year:
 *                   type: integer
 *       500:
 *         description: Ошибка сервера при получении книги
 */
router.get('/:id', async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    
    try {
        const book = await db`
            SELECT 
                id,
                title,
                author,
                genre,
                cover_url,
                description,
                published_year
            FROM books
            WHERE id = ${id}
        `;
        
        res.json(book);
    } catch (err) {
        console.error('Error fetching book:', err);
        res.status(500).json({ error: 'Failed to fetch book' });
    }
});


/**
 * @swagger
 * /books/{id}/details:
 *   get:
 *     summary: Получить детальную информацию о книге на полке пользователя с тегами
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID книги
 *     responses:
 *       200:
 *         description: Детальная информация о книге и связанной информации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 book:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     author:
 *                       type: string
 *                     genre:
 *                       type: string
 *                     cover_url:
 *                       type: string
 *                     description:
 *                       type: string
 *                     published_year:
 *                       type: integer
 *                 isInBookshelf:
 *                   type: boolean
 *                 bookshelfId:
 *                   type: integer
 *                   nullable: true
 *                 bookshelfTags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 userTags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 systemTags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 allTags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       404:
 *         description: Книга не найдена
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id/details', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const [book] = await db`
            SELECT 
                id,
                title,
                author,
                genre,
                cover_url,
                description,
                published_year
            FROM books
            WHERE id = ${id}
        `;

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const [bookshelfEntry] = await db`
            SELECT id FROM bookshelf
            WHERE user_id = ${userId} AND book_id = ${id}
        `;

        let bookshelfTags = [];
        if (bookshelfEntry) {
            bookshelfTags = await db`
                SELECT t.id, t.name FROM bookshelf_tags bt
                JOIN tags t ON bt.tag_id = t.id
                WHERE bt.bookshelf_id = ${bookshelfEntry.id}
                ORDER BY t.name ASC
            `;
        }

        const allTags = await db`
            SELECT id, name FROM tags
            WHERE user_id IS NULL OR user_id = ${userId}
            ORDER BY name
        `;

        const userTags = await db`
            SELECT id, name FROM tags
            WHERE user_id = ${userId}
            ORDER BY name
        `;

        const systemTags = await db`
            SELECT id, name FROM tags
            WHERE user_id is NULL
            ORDER BY name
        `;

        res.json({
            book,
            isInBookshelf: !!bookshelfEntry,
            bookshelfId: bookshelfEntry?.id || null,
            bookshelfTags: bookshelfTags,
            userTags: userTags,
            systemTags: systemTags,
            allTags: allTags
        });

    } catch (err) {
        console.error('Error in /books/:id/details:', err);
        res.status(500).json({ error: 'Failed to load book details' });
    }
});


/**
 * @swagger
 * /books/{id}:
 *   put:
 *     summary: Обновить информацию о книге (только для админа)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID книги
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - author
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               genre:
 *                 type: string
 *               cover_url:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *               published_year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Книга успешно обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Книга с таким названием уже существует
 *       403:
 *         description: Доступ запрещён, требуется роль администратора
 *       404:
 *         description: Книга не найдена
 *       500:
 *         description: Ошибка сервера при обновлении книги
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, author, genre, cover_url, description, published_year } = req.body;
    const db = getDb();
    
    try {
        const [updatedBook] = await db`
            UPDATE books 
            SET 
                title = ${title},
                author = ${author},
                genre = ${genre},
                cover_url = ${cover_url},
                description = ${description},
                published_year = ${published_year}
            WHERE id = ${id}
            RETURNING id, title, author, genre, cover_url, description, published_year
        `;
        
        if (!updatedBook) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        res.json({ 
            id: updatedBook.id,
            message: 'Book updated successfully' 
        });
    } catch (err) {
        if (err.message.includes('unique constraint')) {
            return res.status(400).json({ error: 'Book with this title already exists' });
        }
        console.error('Error updating book:', err);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

/**
 * @swagger
 * /books/{id}:
 *   delete:
 *     summary: Удалить книгу (только для админа)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID книги
 *     responses:
 *       200:
 *         description: Книга успешно удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       403:
 *         description: Доступ запрещён, требуется роль администратора
 *       404:
 *         description: Книга не найдена
 *       500:
 *         description: Ошибка сервера при удалении книги
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const db = getDb();
    
    try {
        const [deletedBook] = await db`
            DELETE FROM books 
            WHERE id = ${id}
            RETURNING id
        `;
        
        if (!deletedBook) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        res.json({ 
            id: deletedBook.id,
            message: 'Book deleted successfully' 
        });
    } catch (err) {
        console.error('Error deleting book:', err);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

export default router;