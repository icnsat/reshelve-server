import express from 'express';
import getDb from '../database.js';
import authenticateToken from '../middleware/authenticateToken.js';

const router = express.Router({ mergeParams: true }); // ✅ Это нужно, чтобы получить bookshelfId

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Управление комментариями к книгам на книжной полке пользователя
 */


/**
 * @swagger
 * /bookshelf/{bookshelfId}/comments:
 *   get:
 *     summary: Получить список комментариев для книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи книги на полке
 *     responses:
 *       200:
 *         description: Список комментариев успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   content:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Ошибка аутентификации
 *       500:
 *         description: Ошибка сервера при получении комментариев
 */
router.get('/', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;

    try {
        const comments = await db`
            SELECT id, content, created_at, updated_at
            FROM comments
            WHERE bookshelf_id = ${bookshelfId}
            ORDER BY created_at DESC
        `;
        
        res.json(comments);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

/**
 * @swagger
 * /bookshelf/{bookshelfId}/comments:
 *   post:
 *     summary: Добавить комментарий к книге на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи книги на полке
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Текст комментария
 *     responses:
 *       201:
 *         description: Комментарий успешно добавлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Ошибка аутентификации
 *       500:
 *         description: Ошибка сервера при добавлении комментария
 */
router.post('/', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;
    const { content } = req.body;

    try {
        const [comment] = await db`
            INSERT INTO comments (bookshelf_id, content)
            VALUES (${bookshelfId}, ${content})
            RETURNING id
        `;
        
        res.status(201).json({ id: comment.id, message: 'Comment added' });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});


/**
 * @swagger
 * /bookshelf/{bookshelfId}/comments/{id}:
 *   patch:
 *     summary: Обновить текст комментария по ID для книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи книги на полке
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID комментария
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Новый текст комментария
 *     responses:
 *       200:
 *         description: Комментарий успешно обновлён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Ошибка аутентификации
 *       404:
 *         description: Комментарий не найден
 *       500:
 *         description: Ошибка сервера при обновлении комментария
 */
router.patch('/:id', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { content } = req.body;

    try {
        const [updated] = await db`
            UPDATE comments
            SET content = ${content}, updated_at = NOW()
            WHERE id = ${id}
            RETURNING id
        `;

        if (!updated) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.json({ id: updated.id, message: 'Comment updated' });
    } catch (err) {
        console.error('Error updating comment:', err);
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

/**
 * @swagger
 * /bookshelf/{bookshelfId}/comments/{id}:
 *   delete:
 *     summary: Удалить комментарий по ID для книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи книги на полке
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID комментария
 *     responses:
 *       200:
 *         description: Комментарий успешно удалён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Ошибка аутентификации
 *       404:
 *         description: Комментарий не найден
 *       500:
 *         description: Ошибка сервера при удалении комментария
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;

    try {
        const [deleted] = await db`
            DELETE FROM comments
            WHERE id = ${id}
            RETURNING id
        `;
        
        if (!deleted) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.json({ id: deleted.id, message: 'Comment deleted' });
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

export default router;
