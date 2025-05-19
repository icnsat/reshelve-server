import express from 'express';
import getDb from '../database.js';
import authenticateToken, { requireAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: Управление тегами к книгам на книжной полке пользователя
 */



/**
 * @swagger
 * /tags:
 *   get:
 *     summary: Получить список тегов (системные и пользовательские)
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Tags
 *     responses:
 *       200:
 *         description: Список тегов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allTags:
 *                   type: array
 *                   description: Все теги (системные и пользовательские)
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Fiction"
 *                       user_id:
 *                         type: integer
 *                         nullable: true
 *                         description: null для системных тегов
 *                 systemTags:
 *                   type: array
 *                   description: Только системные теги (user_id = null)
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                 userTags:
 *                   type: array
 *                   description: Теги, принадлежащие текущему пользователю
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       401:
 *         description: Ошибка аутентификации
 *       500:
 *         description: Ошибка сервера при получении тегов
 */
router.get('/tags', authenticateToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.id;

    try {
        const allTags = await db`
            SELECT id, name, user_id
            FROM tags
            WHERE user_id IS NULL OR user_id = ${userId}
            ORDER BY id ASC
        `;

        const systemTags = allTags.filter(tag => tag.user_id === null);
        const userTags = allTags.filter(tag => tag.user_id === userId);

        res.json({
            allTags,  // Все теги (системные + пользовательские)
            systemTags,  // Только системные
            userTags  // Только текущего пользователя
        });

    } catch (err) {
        console.error('Error fetching tags:', err);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});


/**
 * @swagger
 * /tags:
 *   post:
 *     summary: Создать новый тег (для пользователя или администратора)
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Tags
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название тега
 *                 example: "Fantasy"
 *     responses:
 *       201:
 *         description: Тег успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID созданного тега
 *                 message:
 *                   type: string
 *                   example: "Tag created"
 *       401:
 *         description: Ошибка аутентификации
 *       500:
 *         description: Ошибка сервера при создании тега
 */
router.post('/tags', authenticateToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const { name } = req.body;
    const isAdmin = req.user.role === 'admin';

    try {
        const [tag] = isAdmin
            ? await db`
                INSERT INTO tags (name)
                VALUES (${name})
                RETURNING id
              `
            : await db`
                INSERT INTO tags (name, user_id)
                VALUES (${name}, ${userId})
                RETURNING id
              `;

        res.status(201).json({ id: tag.id, message: 'Tag created' });
    } catch (err) {
        console.error('Error creating tag:', err);
        res.status(500).json({ error: 'Failed to create tag' });
    }
});

/**
 * @swagger
 * /tags/{tagId}:
 *   put:
 *     summary: Обновить тег (для пользователя или администратора)
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID тега для обновления
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Новое название тега
 *                 example: "New Tag Name"
 *     responses:
 *       200:
 *         description: Тег успешно обновлён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tag successfully updated"
 *       401:
 *         description: Ошибка аутентификации
 *       404:
 *         description: Тег не найден
 *       500:
 *         description: Ошибка сервера при обновлении тега
 */
router.put('/tags/:tagId', authenticateToken, async (req, res) => {
    const db = getDb();
    const { tagId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    try {
        const tag = await db`
            SELECT id, user_id
            FROM tags
            WHERE id = ${tagId}
        `;

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        if (isAdmin) {
            await db`
            UPDATE tags
            SET name = ${name}
            WHERE id = ${tagId} and user_id IS NULL 
        `;} else {
            await db`
            UPDATE tags
            SET name = ${name}
            WHERE id = ${tagId} and user_id = ${userId}
        `;}

        res.json({ message: 'Tag successfully updated' });
    } catch (err) {
        console.error('Error updating tag:', err);
        res.status(500).json({ error: 'Failed to update tag' });
    }
});


/**
 * @swagger
 * /tags/{tagId}:
 *   delete:
 *     summary: Удалить тег (для пользователя или администратора)
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID тега для удаления
 *     responses:
 *       200:
 *         description: Тег успешно удалён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tag successfully removed"
 *       401:
 *         description: Ошибка аутентификации
 *       404:
 *         description: Тег не найден
 *       500:
 *         description: Ошибка сервера при удалении тега
 */
router.delete('/tags/:tagId', authenticateToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const { tagId } = req.params;
    const isAdmin = req.user.role === 'admin';

    try {
        const tag = await db`
            SELECT id, user_id
            FROM tags
            WHERE id = ${tagId}
        `;

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }
            
        if (isAdmin) {
            await db`
            DELETE FROM tags
            WHERE id = ${tagId} and user_id IS NULL 
        `;} else {
            await db`
            DELETE FROM tags
            WHERE id = ${tagId} and user_id = ${userId}
        `;}

        res.json({ message: 'Tag successfully removed' });
    } catch (err) {
        console.error('Error removing tag:', err);
        res.status(500).json({ error: 'Failed to remove tag' });
    }
});



/**
 * @swagger
 * /bookshelf/{bookshelfId}/tags:
 *   get:
 *     summary: Получить все теги для книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID книги на полке
 *     responses:
 *       200:
 *         description: Список тегов для книги на полке успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       401:
 *         description: Ошибка аутентификации
 *       500:
 *         description: Ошибка сервера при получении тегов
 */
router.get('/bookshelf/:bookshelfId/tags', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;

    try {
        const tags = await db`
            SELECT t.id, t.name
            FROM tags t
            JOIN bookshelf_tags bt ON t.id = bt.tag_id
            WHERE bt.bookshelf_id = ${bookshelfId}
            ORDER BY t.name ASC
        `;
        res.json(tags);
    } catch (err) {
        console.error('Error fetching tags for bookshelf:', err);
        res.status(500).json({ error: 'Failed to fetch tags for bookshelf' });
    }
});


/**
 * @swagger
 * /bookshelf/{bookshelfId}/tags:
 *   post:
 *     summary: Обновить теги для книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID книги на полке
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Массив ID тегов для присвоения книге
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Теги успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tags updated successfully
 *       401:
 *         description: Ошибка аутентификации
 *       403:
 *         description: Доступ запрещён (запись не принадлежит пользователю)
 *       500:
 *         description: Ошибка сервера при обновлении тегов
 */
router.post('/bookshelf/:bookshelfId/tags', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;
    const { tagIds } = req.body; // массив ID тегов
    const userId = req.user.id;

    try {
        const [entry] = await db`
            SELECT * FROM bookshelf WHERE id = ${bookshelfId} AND user_id = ${userId}
        `;
        if (!entry) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db`DELETE FROM bookshelf_tags WHERE bookshelf_id = ${bookshelfId}`;

        if (tagIds.length > 0) {
            await db`
                INSERT INTO bookshelf_tags (bookshelf_id, tag_id)
                SELECT ${bookshelfId}, tag_id FROM UNNEST(${tagIds}::int[]) AS tag_id
            `;
        }

        res.json({ message: 'Tags updated successfully' });
    } catch (err) {
        console.error('Error updating tags:', err);
        res.status(500).json({ error: 'Failed to update tags' });
    }
});

/**
 * @swagger
 * /bookshelf/{bookshelfId}/tags/{tagId}:
 *   delete:
 *     summary: Удалить тег из тегов книги на полке
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: bookshelfId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID книги на полке
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID тега для удаления
 *     responses:
 *       200:
 *         description: Тег успешно удалён из тегов книги
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tag removed from bookshelf
 *       401:
 *         description: Ошибка аутентификации
 *       500:
 *         description: Ошибка сервера при удалении тега
 */
router.delete('/bookshelf/:bookshelfId/tags/:tagId', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId, tagId } = req.params;

    try {
        await db`
            DELETE FROM bookshelf_tags
            WHERE bookshelf_id = ${bookshelfId} AND tag_id = ${tagId}
        `;
        res.json({ message: 'Tag removed from bookshelf' });
    } catch (err) {
        console.error('Error removing tag:', err);
        res.status(500).json({ error: 'Failed to remove tag' });
    }
});


export default router;