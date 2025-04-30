import express from 'express';
import getDb from '../database.js';
import authenticateToken from '../middleware/authenticateToken.js';

const router = express.Router();

// Get all reading logs for a bookshelf entry
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

// Add reading log
router.post('/', authenticateToken, async (req, res) => {
    const db = getDb();
    const { bookshelfId } = req.params;
    const { start_page, end_page, duration_minutes } = req.body;

    try {
        const [log] = await db`
            INSERT INTO reading_logs (bookshelf_id, start_page, end_page, duration_minutes)
            VALUES (${bookshelfId}, ${start_page}, ${end_page}, ${duration_minutes})
            RETURNING id
        `;

        res.status(201).json({ id: log.id, message: 'Reading log added' });
    } catch (err) {
        console.error('Error adding reading log:', err);
        res.status(500).json({ error: 'Failed to add reading log' });
    }
});

// Update reading log
router.patch('/:id', authenticateToken, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { start_page, end_page, duration_minutes } = req.body;

    try {
        const [updated] = await db`
            UPDATE reading_logs
            SET start_page = ${start_page}, end_page = ${end_page}, duration_minutes = ${duration_minutes}
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

// Delete reading log
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
