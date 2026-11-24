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

app.listen(PORT, () => {
  console.log(`Reading List API on http://localhost:${PORT} (allowed origin: ${CLIENT_ORIGIN})`);
});
