import express from 'express';
import getDb from '../database.js';
import authenticateToken from '../middleware/authenticateToken.js';

const router = express.Router({ mergeParams: true }); // ✅ Это нужно, чтобы получить bookshelfId

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Управление записями чтения к книгам на книжной полке пользователя
 */


/**
 * @swagger
 * /bookshelf/{bookshelfId}/logs:
 *   get:
 *     summary: Получить все записи чтения для книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Logs
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи книги на полке
 *     responses:
 *       200:
 *         description: Список записей чтения
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   start_page:
 *                     type: integer
 *                   end_page:
 *                     type: integer
 *                   duration_minutes:
 *                     type: integer
 *                   date:
 *                     type: string
 *                     format: date
 *       401:
 *         description: Ошибка аутентификации
 *       500:
 *         description: Ошибка сервера при получении записей чтения
 */
router.get('/', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;

    try {
        const logs = await db`
            SELECT id, start_page, end_page, duration_minutes, date
            FROM reading_logs
            WHERE bookshelf_id = ${bookshelfId}
            ORDER BY date DESC
        `;

        res.json(logs);
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});


/**
 * @swagger
 * /bookshelf/{bookshelfId}/logs:
 *   post:
 *     summary: Добавить запись чтения для книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Logs
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
 *               - start_page
 *               - end_page
 *               - duration_minutes
 *               - date
 *             properties:
 *               start_page:
 *                 type: integer
 *                 description: Страница начала чтения
 *               end_page:
 *                 type: integer
 *                 description: Страница окончания чтения
 *               duration_minutes:
 *                 type: integer
 *                 description: Продолжительность чтения в минутах
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Дата чтения
 *     responses:
 *       201:
 *         description: Запись чтения успешно добавлена
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
 *         description: Ошибка сервера при добавлении записи чтения
 */
router.post('/', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;
    const { start_page, end_page, duration_minutes, date } = req.body;

    try {
        const [log] = await db`
            INSERT INTO reading_logs (bookshelf_id, start_page, end_page, duration_minutes, date)
            VALUES (${bookshelfId}, ${start_page}, ${end_page}, ${duration_minutes}, ${date})
            RETURNING id
        `;

        res.status(201).json({ id: log.id, message: 'Reading log added' });
    } catch (err) {
        console.error('Error adding reading log:', err);
        res.status(500).json({ error: 'Failed to add reading log' });
    }
});

/**
 * @swagger
 * /bookshelf/{bookshelfId}/logs/{id}:
 *   put:
 *     summary: Обновить запись чтения по ID
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Logs
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
 *         description: ID записи чтения
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start_page
 *               - end_page
 *               - duration_minutes
 *               - date
 *             properties:
 *               start_page:
 *                 type: integer
 *               end_page:
 *                 type: integer
 *               duration_minutes:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Запись чтения успешно обновлена
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
 *         description: Запись чтения не найдена
 *       500:
 *         description: Ошибка сервера при обновлении записи чтения
 */
router.put('/:id', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { start_page, end_page, duration_minutes, date } = req.body;

    try {
        const [updated] = await db`
            UPDATE reading_logs
            SET start_page = ${start_page}, end_page = ${end_page}, duration_minutes = ${duration_minutes}, date = ${date}
            WHERE id = ${id}
            RETURNING id
        `;

        if (!updated) {
            return res.status(404).json({ error: 'Reading log not found' });
        }

        res.json({ id: updated.id, message: 'Reading log updated' });
    } catch (err) {
        console.error('Error updating reading log:', err);
        res.status(500).json({ error: 'Failed to update reading log' });
    }
});

/**
 * @swagger
 * /bookshelf/{bookshelfId}/logs/{id}:
 *   delete:
 *     summary: Удалить запись чтения по ID
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Logs
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
 *         description: ID записи чтения
 *     responses:
 *       200:
 *         description: Запись чтения успешно удалена
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
 *         description: Запись чтения не найдена
 *       500:
 *         description: Ошибка сервера при удалении записи чтения
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;

    try {
        const [deleted] = await db`
            DELETE FROM reading_logs
            WHERE id = ${id}
            RETURNING id
        `;
        
        if (!deleted) {
            return res.status(404).json({ error: 'Reading log not found' });
        }

        res.json({ id: deleted.id, message: 'Reading log deleted' });
    } catch (err) {
        console.error('Error deleting reading log:', err);
        res.status(500).json({ error: 'Failed to delete reading log' });
    }
});

export default router;
