// import app from './app.js';
import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './database.js';

import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import bookshelfRouter from './routes/bookshelf.js';
import commentsRouter from './routes/comments.js';
import logsRouter from './routes/logs.js';
import tagsRouter from './routes/tags.js';

// Загружаем переменные из .env файла
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database
initDb().then(() => {
  console.log('Database setup complete');
}).catch(err => {
  console.error('Failed to initialize database:', err.message);
});


// Home
app.get('/', (req, res) => {
  res.json({message: "Reshelve server is alive!"});
});



const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Раздаем статические файлы из папки `src/media`
app.use('/media', express.static(path.join(__dirname, 'media')));


// Connect routes
app.use('/auth', authRoutes);
app.use('/books', booksRoutes);
app.use('/bookshelf', bookshelfRouter);
app.use('/bookshelf/:bookshelfId/comments', commentsRouter);
app.use('/bookshelf/:bookshelfId/logs', logsRouter);
// app.use('/bookshelf/:bookshelfId/tags', tagsRouter);
// app.use('/bookshelf/tags', tagsRouter);
app.use('/', tagsRouter);


// Run server on local, or export for Vercel
if (process.env.VERCEL !== 'true') {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;

