import express from 'express';
import getDb from '../database.js';
import authenticateToken, { requireAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

// (+) Get all tags (system and user tags)
// router.get('/tags', authenticateToken, async (req, res) => {
//     const db = getDb();
//     const userId = req.user.id;

//     try {
//         const tags = await db`
//             SELECT id, name
//             FROM tags
//             WHERE user_id IS NULL OR user_id = ${userId}
//             ORDER BY name ASC
//         `;
//         res.json(tags);
//     } catch (err) {
//         console.error('Error fetching tags:', err);
//         res.status(500).json({ error: 'Failed to fetch tags' });
//     }
// });

router.get('/tags', authenticateToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.id;

    try {
        // Получаем все доступные теги
        const allTags = await db`
            SELECT id, name, user_id
            FROM tags
            WHERE user_id IS NULL OR user_id = ${userId}
            ORDER BY id ASC
        `;

        // Разделяем на системные и пользовательские
        const systemTags = allTags.filter(tag => tag.user_id === null);
        const userTags = allTags.filter(tag => tag.user_id === userId);

        // Возвращаем все три массива
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



// (+) Create new tag (user or admin)
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

// (+) Обновить тег юзер/админ
router.put('/tags/:tagId', authenticateToken, async (req, res) => {
    const db = getDb();
    const { tagId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    try {
        // Проверим, существует ли тег
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

// (+) Удалить тег из аккаунта/системы
router.delete('/tags/:tagId', authenticateToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const { tagId } = req.params;
    const isAdmin = req.user.role === 'admin';

    try {
        // Проверим, существует ли тег
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


// Get all tags from bookshelf entry
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

// Attach tag to bookshelf entry
// router.post('/bookshelf/:bookshelfId/tags', authenticateToken, async (req, res) => {
//     const db = getDb();
//     const { bookshelfId } = req.params;
//     const { tagId } = req.body;

//     try {
//         await db`
//             INSERT INTO bookshelf_tags (bookshelf_id, tag_id)
//             VALUES (${bookshelfId}, ${tagId})
//             ON CONFLICT DO NOTHING
//         `;
//         res.status(201).json({ message: 'Tag attached to bookshelf' });
//     } catch (err) {
//         console.error('Error attaching tag:', err);
//         res.status(500).json({ error: 'Failed to attach tag' });
//     }
// });

// (+) Обновление тегов (сначала удаление всех, потом добавление нужных)
router.post('/bookshelf/:bookshelfId/tags', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;
    const { tagIds } = req.body; // массив ID тегов
    const userId = req.user.id;

    try {
        // Проверка, что эта запись действительно принадлежит пользователю
        const [entry] = await db`
            SELECT * FROM bookshelf WHERE id = ${bookshelfId} AND user_id = ${userId}
        `;
        if (!entry) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Удаляем старые связи
        await db`DELETE FROM bookshelf_tags WHERE bookshelf_id = ${bookshelfId}`;

        // Добавляем новые
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


// Remove tag from bookshelf entry (в обновлении тегов)
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