# 📚 Reshelve - server

Серверная часть приложения для создания виртуальной книжной полки пользователей. Написано на Node.js с использованием Express и PostgreSQL.

База данных может быть удалённой или локальной: для удалённой используется сервис Neon.

Приложение может работать как локально, так и на хостинге Vercel. 

> [!NOTE]  
> Frontend-часть приложения лежит в репозитории [reshelve-client](https://github.com/icnsat/reshelve-client).  

### Конечные точки API

- Общие
  - `GET`       `/` - Приветствие от сервера.
- Аутентификация
  - `POST`      `/auth/login` - Вход пользователя.
  - `POST`      `/auth/register` - Регистрация пользователя.
- Книги
  - `GET`       `/books` - Получить список всех книг.
  - `POST`      `/books` - Добавить новую книгу.
  - `GET`       `/books/:id` - Получить информацию о книге.
  - `PUT`       `/books/:id` - Обновить информацию о книге.
  - `DELETE`    `/books/:id` - Удалить книгу.
- Полка пользователя
  - `GET`       `/bookshelf` - Получить все книги на полке.
  - `POST`      `/bookshelf` - Добавить книгу на полку.
  - `GET`       `/bookshelf/:id` - Получить полную информацию о книге на полке.
  - `DELETE`    `/bookshelf/:id` - Удалить книгу с полки.
- Заметки для книг
  - `GET`       `/bookshelf/:bookshelfId/comments` - Получить все заметки у книги на полке.
  - `POST`      `/bookshelf/:bookshelfId/comments` - Добавить заметку к книге на полке.
  - `PATCH`     `/bookshelf/:bookshelfId/comments/:id` - Обновить заметку у книги на полке.
  - `DELETE`    `/bookshelf/:bookshelfId/comments/:id` - Удалить заметку у книги на полке.
- Логи чтения
  - `GET`       `/bookshelf/:bookshelfId/logs` - Получить все логи для книги на полке.
  - `POST`      `/bookshelf/:bookshelfId/logs` - Добавить лог к книге на полке.
  - `PUT`       `/bookshelf/:bookshelfId/logs/:id` - Обновить лог у книги на полке.
  - `DELETE`    `/bookshelf/:bookshelfId/logs/:id` - Удалить лог у книги на полке.
- Теги для книг
  - `GET`       `/tags` - Получить все теги (системные и пользовательские).
  - `POST`      `/tags` - Добавить новый тег (системный или пользовательский).
  - `PUT`       `/tags/:tagId` - Обновить тег.
  - `DELETE`    `/tags/:tagId` - Удалить тег.

  - `GET`       `/bookshelf/:bookshelfId/tags` - Получить все теги для книги на полке.
  - `POST`      `/bookshelf/:bookshelfId/tags` - Добавление тегов для книги на полке.
  - `DELETE`    `/bookshelf/:bookshelfId/tags/:tagId` - Удаление тега для книги на полке.

Запросы на изменение данных требуют наличие JWT токена авторизации в заголовке запроса.
При использовании frontend-части приложения токен применяется автоматически, однако запросы можно отправлять и вручную, как показано ниже:

```sh
# Получение JWT токена
curl -X POST http://localhost:5000/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "icnsat@icn.sat",
  "password": "******
}'

# Ответ
{"token":"eyJhbGciOiJI.F0IjoiOjE3NDYwMjYzMzF9.vweNcisXCb0YktvbWMs"}

# Добавление книгу на полку
curl -X POST http://localhost:5000/bookshelf \
-H "Content-Type: application/json" \
-H "Authorization: Bearer eyJhbGciOiJI.F0IjoiOjE3NDYwMjYzMzF9.vweNcisXCb0YktvbWMs" \
-d '{
  "book_id": "2"
}'

# Ответ
{
    "id": 2,
    "message": "Book added to bookshelf"
}
```

### Установка и запуск

Для установки зависимостей выполнить команду:

```sh
npm i
```

Чтобы запустить приложение локально, необходимы Node JS, PostgreSQL и `.env` файл в корне проекта. Пример `.env` файла:

```ini
# JWT
SECRET_KEY=:)

# Database
LOCAL=true

LOCAL_DATABASE_URL=postgresql://localhost/reshelve
REMOTE_DATABASE_URL=postgres://user:privatecode.aws.neon.tech/neondb?sslmode=require

# Export app for Vercel or run on PORT
VERCEL=false
PORT=5000
```

Для запуска сервера выполнить команду:

```sh
npm start
```
