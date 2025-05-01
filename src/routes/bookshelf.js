import express from 'express';
import getDb from '../database.js';
import authenticateToken from '../middleware/authenticateToken.js';

const router = express.Router();

// (+) Get all books on user's bookshelf
router.get('/', authenticateToken, async (req, res) => {
    const db = getDb();
    const user_id = req.user.id;

    try {
        const bookshelf = await db`
            SELECT 
                b.id AS bookshelf_id,
                b.book_id,
                k.title,
                k.author,
                k.cover_url,
                ARRAY_AGG(bt.tag_id) AS tag_ids
            FROM bookshelf b
            JOIN books k ON b.book_id = k.id
            LEFT JOIN bookshelf_tags bt ON bt.bookshelf_id = b.id
            WHERE b.user_id = ${user_id}
            GROUP BY b.id, k.id
            ORDER BY b.id DESC
        `;
        
        res.json(bookshelf);
    } catch (err) {
        console.error('Error fetching bookshelf:', err);
        res.status(500).json({ error: 'Failed to fetch bookshelf' });
    }
});

// // Получить полную информацию о книге на полке
// router.get('/:id', authenticateToken, async (req, res) => {
//     const db = getDb();
//     const { id } = req.params;
//     const userId = req.user.id;

//     try {
//         // Получаем основную информацию о книге на полке
//         const [bookshelfItem] = await db`
//             SELECT 
//                 b.id AS "bookshelfId",
//                 k.id AS "bookId",
//                 k.title,
//                 k.author,
//                 k.genre,
//                 k.cover_url AS "coverUrl",
//                 k.description,
//                 k.published_year AS "publishedYear"
//             FROM bookshelf b
//             JOIN books k ON b.book_id = k.id
//             WHERE b.id = ${id} AND b.user_id = ${userId}
//         `;

//         if (!bookshelfItem) {
//             return res.status(404).json({ error: 'Bookshelf item not found' });
//         }

//         // Получаем комментарии
//         const comments = await db`
//             SELECT 
//                 id,
//                 content,
//                 created_at AS "createdAt",
//                 updated_at AS "updatedAt"
//             FROM comments
//             WHERE bookshelf_id = ${id}
//             ORDER BY created_at ASC
//         `;

//         // Получаем логи чтения
//         const readingLogs = await db`
//             SELECT 
//                 id,
//                 start_page AS "startPage",
//                 end_page AS "endPage",
//                 duration_minutes AS "durationMinutes",
//                 date
//             FROM reading_logs
//             WHERE bookshelf_id = ${id}
//             ORDER BY date ASC
//         `;

//         // Получаем теги
//         const tags = await db`
//             SELECT 
//                 t.id,
//                 t.name
//             FROM bookshelf_tags bt
//             JOIN tags t ON bt.tag_id = t.id
//             WHERE bt.bookshelf_id = ${id}
//         `;

//         // Собираем всё в один ответ
//         res.json({
//             ...bookshelfItem,
//             comments,
//             readingLogs,
//             tags
//         });

//     } catch (err) {
//         console.error('Error fetching bookshelf item details:', err);
//         res.status(500).json({ error: 'Failed to fetch bookshelf item details' });
//     }
// });


// (+) Получить полную информацию о книге на полке одним запросом
router.get('/:id', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const [result] = await db`
            WITH
            bookshelf_item AS (
                SELECT 
                    b.id AS "bookshelf_id",
                    k.id AS "book_id",
                    k.title,
                    k.author,
                    k.genre,
                    k.cover_url,
                    k.description,
                    k.published_year
                FROM bookshelf b
                JOIN books k ON b.book_id = k.id
                WHERE b.id = ${id} AND b.user_id = ${userId}
            ),
            item_comments AS (
                SELECT 
                    c.id,
                    c.content,
                    c.created_at,
                    c.updated_at
                FROM comments c
                WHERE c.bookshelf_id = ${id}
                ORDER BY c.created_at ASC
            ),
            item_reading_logs AS (
                SELECT 
                    r.id,
                    r.start_page,
                    r.end_page,
                    r.duration_minutes,
                    r.date
                FROM reading_logs r
                WHERE r.bookshelf_id = ${id}
                ORDER BY r.date ASC
            ),
            item_tags AS (
                SELECT 
                    t.id,
                    t.name
                FROM bookshelf_tags bt
                JOIN tags t ON bt.tag_id = t.id
                WHERE bt.bookshelf_id = ${id}
            ),
            user_tags AS (
                SELECT id, name FROM tags
                WHERE user_id = ${userId}
                ORDER BY name
            ),
            system_tags AS (
                SELECT id, name FROM tags
                WHERE user_id IS NULL
                ORDER BY name
            ),
            all_tags AS (
                SELECT id, name FROM tags
                WHERE user_id IS NULL OR user_id = ${userId}
                ORDER BY name
            )
            SELECT
                (SELECT row_to_json(bi) FROM bookshelf_item bi) AS bookshelf_item,
                (SELECT COALESCE(json_agg(ic), '[]') FROM item_comments ic) AS comments,
                (SELECT COALESCE(json_agg(il), '[]') FROM item_reading_logs il) AS reading_logs,
                (SELECT COALESCE(json_agg(it), '[]') FROM item_tags it) AS bookshelf_tags,
                (SELECT COALESCE(json_agg(ut), '[]') FROM user_tags ut) AS user_tags,
                (SELECT COALESCE(json_agg(st), '[]') FROM system_tags st) AS system_tags,
                (SELECT COALESCE(json_agg(at), '[]') FROM all_tags at) AS all_tags
        `;

        if (!result || !result.bookshelf_item) {
            return res.status(404).json({ error: 'Bookshelf item not found' });
        }

        // Финальная сборка данных
        res.json({
            ...result.bookshelf_item,
            comments: result.comments,
            readingLogs: result.reading_logs,
            bookshelfTags: result.bookshelf_tags,
            userTags: result.user_tags,
            systemTags: result.system_tags,
            allTags: result.all_tags
        });

    } catch (err) {
        console.error('Error fetching bookshelf item details (CTE):', err);
        res.status(500).json({ error: 'Failed to fetch bookshelf item details' });
    }
});


// (+) Add book to bookshelf
router.post('/', authenticateToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const { book_id } = req.body;

    try {
        const [entry] = await db`
            INSERT INTO bookshelf (user_id, book_id)
            VALUES (${userId}, ${book_id})
            RETURNING id
        `;
        
        res.status(201).json({ id: entry.id, message: 'Book added to bookshelf' });
    } catch (err) {
        console.error('Error adding to bookshelf:', err);
        res.status(500).json({ error: 'Failed to add book to bookshelf' });
    }
});

// (+) Remove book from bookshelf
router.delete('/:id', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const [deleted] = await db`
            DELETE FROM bookshelf 
            WHERE id = ${id} AND user_id = ${userId}
            RETURNING id
        `;
        
        if (!deleted) {
            return res.status(404).json({ error: 'Bookshelf entry not found' });
        }
        
        res.json({ id: deleted.id, message: 'Book removed from bookshelf' });
    } catch (err) {
        console.error('Error removing from bookshelf:', err);
        res.status(500).json({ error: 'Failed to remove book from bookshelf' });
    }
});

export default router;
