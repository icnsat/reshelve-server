import express from 'express';
import getDb from '../database.js';
import authenticateToken, { requireAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

// Get all books with optional filters
// router.get('/', async (req, res) => {
//   const { author, genre } = req.query;
//   const db = getDb();
  
//   try {
//     let books;
    
//     if (author || genre) {
//       // Фильтрация по автору и/или жанру
//       books = await db`
//         SELECT 
//           id,
//           title,
//           author,
//           genre,
//           cover_url as "coverUrl",
//           description,
//           published_year as "publishedYear"
//         FROM books
//         WHERE 
//           ${author ? db`author = ${author}` : db`true`} AND
//           ${genre ? db`genre = ${genre}` : db`true`}
//         ORDER BY title ASC
//       `;
//     } else {
//       // Все книги
//       books = await db`
//         SELECT 
//           id,
//           title,
//           author,
//           genre,
//           cover_url as "coverUrl",
//           description,
//           published_year as "publishedYear"
//         FROM books
//         ORDER BY title ASC
//       `;
//     }
    
//     res.json(books);
//   } catch (err) {
//     console.error('Error fetching books:', err);
//     res.status(500).json({ error: 'Failed to fetch books' });
//   }
// });

// (+) Get all books (без серверной фильтрации)
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

// (/) Add new book (требуется аутентификация)
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

// Get one book
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


// (+) Get book + check if in bookshelf + fetch user tags 
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

        // const [existing] = await db`
        //     SELECT 1 FROM bookshelf
        //     WHERE user_id = ${userId} AND book_id = ${id}
        // `;

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



// (/) Update book (требуется аутентификация)
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

// Delete book (требуется аутентификация)
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