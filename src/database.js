import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config(); // Загружает .env

// const connectionString = (
//   process.env.LOCAL !== 'false'
//   ? process.env.LOCAL_DATABASE_URL
//   : process.env.REMOTE_DATABASE_URL
// );

// let sql;
// sql = postgres(connectionString, { 
//   ssl: process.env.LOCAL === 'false'
// });


const isLocal = process.env.LOCAL === 'true';

const dbUrl = (
  isLocal
  ? process.env.LOCAL_DATABASE_URL 
  : process.env.REMOTE_DATABASE_URL
);

if (!dbUrl) throw new Error("Database URL is not defined in environment variables");

let sql = postgres(dbUrl, { 
  ssl: !isLocal
});

console.log(`Connected to the ${
  isLocal ? 'local' : 'remote'
} PostgreSQL database`);

export const getDb = () => sql;

export const initDb = async () => {
  const db = getDb();
  try {
    await db`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `;

    // Добавляем стандартные роли, если их нет
    await db`
      INSERT INTO roles (id, name)
      VALUES 
        (1, 'user'),
        (2, 'admin')
      ON CONFLICT (id) DO NOTHING;
    `;

    await db`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        role_id INT REFERENCES roles(id) DEFAULT 1
      );
    `;

    await db`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) UNIQUE NOT NULL,
        author VARCHAR(255) NOT NULL,
        genre VARCHAR(100) NOT NULL,
        cover_url TEXT,
        description TEXT,
        published_year INT
      );
    `;

    await db`
      CREATE TABLE IF NOT EXISTS bookshelf (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        book_id INT REFERENCES books(id),
        CONSTRAINT unique_pair UNIQUE (user_id, book_id)
      );
    `;

    await db`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        bookshelf_id INT REFERENCES bookshelf(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db`
      CREATE TABLE IF NOT EXISTS reading_logs (
        id SERIAL PRIMARY KEY,
        bookshelf_id INT REFERENCES bookshelf(id) ON DELETE CASCADE,
        start_page INT NOT NULL,
        end_page INT NOT NULL,
        duration_minutes INT,
        date DATE DEFAULT CURRENT_DATE
      );
    `;

    await db`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE CASCADE  -- NULL = системный тег
      );
    `;

    // Добавляем стандартные роли, если их нет
    await db`
      INSERT INTO tags (id, name)
      VALUES 
        (1, 'Избранное'),
        (2, 'Планирую читать'),
        (3, 'Читаю'),
        (4, 'Прочитано'),
        (5, 'Заброшено')
      ON CONFLICT (id) DO NOTHING;
    `;

    await db`
      CREATE TABLE IF NOT EXISTS bookshelf_tags (
        bookshelf_id INT REFERENCES bookshelf(id) ON DELETE CASCADE,
        tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (bookshelf_id, tag_id)
      );
    `;
    
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
};

export default getDb;