// server.js — Reading List REST API (Express 5, ES modules)
import express from 'express';
import cors from 'cors';
import * as store from './booksStore.js';
import { parseId, validateBook, validateQuery } from './validate.js';

// Configuration comes from environment variables, with safe defaults
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();

// CORS: only the client's exact origin is allowed (never '*')
app.use(cors({ origin: CLIENT_ORIGIN }));

// Parse JSON bodies — must be registered BEFORE the routes
app.use(express.json());

// Simple request logger (helps to see which requests reach the server)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Reads and checks :id. Sends 400 and returns null when it is not a positive integer.
function readId(req, res) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: `Invalid id "${req.params.id}": must be a positive integer` });
  }
  return id;
}

// Compares two books by a field; books without a rating always go last
function compareBy(field, order) {
  const dir = order === 'desc' ? -1 : 1;
  return (a, b) => {
    if (field === 'rating') {
      if (a.rating === null && b.rating === null) return 0;
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
    }
    if (field === 'title' || field === 'author') {
      return a[field].localeCompare(b[field], 'en', { sensitivity: 'base' }) * dir;
    }
    return (a[field] - b[field]) * dir;
  };
}

// GET /api/books — list with filtering, search, sorting and paging
app.get('/api/books', async (req, res) => {
  const { error, value: opts } = validateQuery(req.query);
  if (error) return res.status(400).json({ error });

  let list = await store.getAll();
  if (opts.genre) list = list.filter((b) => b.genre === opts.genre);
  if (opts.read !== undefined) list = list.filter((b) => b.read === opts.read);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }
  // filter() already returns a new array, but copy anyway so sort never touches the store
  list = opts.sort ? [...list].sort(compareBy(opts.sort, opts.order)) : [...list].sort(compareBy('id', opts.order));

  const start = (opts.page - 1) * opts.limit;
  res.json(list.slice(start, start + opts.limit));
});

// GET /api/books/:id — one book
app.get('/api/books/:id', async (req, res) => {
  const id = readId(req, res);
  if (id === null) return;
  const book = await store.getById(id);
  if (!book) return res.status(404).json({ error: `Book ${id} not found` });
  res.json(book);
});

// POST /api/books — create from a complete body
app.post('/api/books', async (req, res) => {
  const { error, value } = validateBook(req.body);
  if (error) return res.status(400).json({ error });
  if (await store.isDuplicate(value.title, value.author)) {
    return res.status(409).json({ error: `"${value.title}" by ${value.author} already exists` });
  }
  const book = await store.create(value);
  res.status(201).location(`/api/books/${book.id}`).json(book);
});

// PUT /api/books/:id — replace with a complete body
app.put('/api/books/:id', async (req, res) => {
  const id = readId(req, res);
  if (id === null) return;
  const { error, value } = validateBook(req.body);
  if (error) return res.status(400).json({ error });
  if (!(await store.getById(id))) return res.status(404).json({ error: `Book ${id} not found` });
  if (await store.isDuplicate(value.title, value.author, id)) {
    return res.status(409).json({ error: `"${value.title}" by ${value.author} already exists` });
  }
  res.json(await store.replace(id, value));
});

// PATCH /api/books/:id — change only the fields sent; the merged book must still be valid
app.patch('/api/books/:id', async (req, res) => {
  const id = readId(req, res);
  if (id === null) return;
  if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }
  const existing = await store.getById(id);
  if (!existing) return res.status(404).json({ error: `Book ${id} not found` });

  const merged = { ...existing, ...req.body }; // new object, existing untouched
  const { error, value } = validateBook(merged);
  if (error) return res.status(400).json({ error });
  if (await store.isDuplicate(value.title, value.author, id)) {
    return res.status(409).json({ error: `"${value.title}" by ${value.author} already exists` });
  }
  res.json(await store.replace(id, value));
});

// DELETE /api/books/:id — 204 with no body
app.delete('/api/books/:id', async (req, res) => {
  const id = readId(req, res);
  if (id === null) return;
  if (!(await store.getById(id))) return res.status(404).json({ error: `Book ${id} not found` });
  await store.remove(id);
  res.status(204).end();
});

// GET /api/stats — computed from the current data on every request
app.get('/api/stats', async (req, res) => {
  const books = await store.getAll();
  const rated = books.filter((b) => b.rating !== null);
  const read = books.filter((b) => b.read).length;
  const byGenre = books.reduce((acc, b) => ({ ...acc, [b.genre]: (acc[b.genre] ?? 0) + 1 }), {});
  const averageRating = rated.length === 0
    ? null
    : Math.round((rated.reduce((sum, b) => sum + b.rating, 0) / rated.length) * 10) / 10;

  res.json({ total: books.length, read, unread: books.length - read, averageRating, byGenre });
});

// Deliberate crash route: proves that errors thrown in async handlers reach the error middleware
app.get('/api/crash', async () => {
  throw new Error('Deliberate crash for testing');
});

// 404 fallback for anything under /api that matched no route (Express 5 style, no '*')
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error-handling middleware (4 parameters) — registered after all routes
app.use((err, req, res, next) => {
  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Reading List API on http://localhost:${PORT} (allowed origin: ${CLIENT_ORIGIN})`);
});
