import express from 'express';
import getDb from '../database.js';
import authenticateToken from '../middleware/authenticateToken.js';

const router = express.Router({ mergeParams: true }); // ✅ Это нужно, чтобы получить bookshelfId


// Get all comments for a bookshelf entry
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

// Add comment to a bookshelf entry
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

// Update comment
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

// Delete comment
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
