// booksStore.js — in-memory data source. All functions are async and
// never modify the existing array or objects (immutable updates).

const SEED = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965, genre: 'fiction', read: true, rating: 5 },
  { id: 2, title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937, genre: 'fantasy', read: true, rating: 4 },
  { id: 3, title: 'A Brief History of Time', author: 'Stephen Hawking', year: 1988, genre: 'science', read: false, rating: null },
  { id: 4, title: 'Sapiens', author: 'Yuval Noah Harari', year: 2011, genre: 'history', read: true, rating: 4 },
  { id: 5, title: 'The Name of the Wind', author: 'Patrick Rothfuss', year: 2007, genre: 'fantasy', read: false, rating: null },
  { id: 6, title: 'Atomic Habits', author: 'James Clear', year: 2018, genre: 'non-fiction', read: true, rating: 3 },
];

let books = SEED;
let nextId = SEED.length + 1;

// Simulate a slow data source (e.g. a database) with a short delay
const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getAll() {
  await delay();
  return books;
}

export async function getById(id) {
  await delay();
  return books.find((b) => b.id === id) ?? null;
}

// True if another book (not excludeId) has the same title + author, case-insensitive
export async function isDuplicate(title, author, excludeId = null) {
  await delay();
  const t = title.toLowerCase();
  const a = author.toLowerCase();
  return books.some((b) => b.id !== excludeId && b.title.toLowerCase() === t && b.author.toLowerCase() === a);
}

export async function create(data) {
  await delay();
  const book = { ...data, id: nextId };
  nextId += 1;
  books = [...books, book]; // new array, old one untouched
  return book;
}

export async function replace(id, data) {
  await delay();
  const updated = { ...data, id };
  books = books.map((b) => (b.id === id ? updated : b));
  return updated;
}

export async function remove(id) {
  await delay();
  books = books.filter((b) => b.id !== id);
}
