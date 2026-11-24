// validate.js — hand-written validation (no schema libraries allowed)

export const GENRES = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];
export const SORT_FIELDS = ['title', 'author', 'year', 'rating'];

// A route id must be a positive integer written only with digits
export function parseId(raw) {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Validates a complete book. Returns { error } or { value } (cleaned book without id).
// Unknown fields and any id in the body are ignored.
export function validateBook(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }
  const { title, author, year, genre } = body;
  const read = body.read ?? false;
  const rating = body.rating ?? null;
  const currentYear = new Date().getFullYear();

  if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 100) {
    return { error: 'title must be a string of 1 to 100 characters' };
  }
  if (typeof author !== 'string' || author.trim().length < 1 || author.trim().length > 100) {
    return { error: 'author must be a string of 1 to 100 characters' };
  }
  if (!Number.isInteger(year) || year < 1000 || year > currentYear) {
    return { error: `year must be an integer between 1000 and ${currentYear}` };
  }
  if (!GENRES.includes(genre)) {
    return { error: `genre must be one of: ${GENRES.join(', ')}` };
  }
  if (typeof read !== 'boolean') {
    return { error: 'read must be true or false' };
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { error: 'rating must be an integer from 1 to 5, or null' };
  }
  if (rating !== null && !read) {
    return { error: 'rating is only allowed when read is true' };
  }
  return { value: { title: title.trim(), author: author.trim(), year, genre, read, rating } };
}

// Validates the query options of GET /api/books. Returns { error } or { value }.
export function validateQuery(query) {
  const allowed = ['genre', 'read', 'q', 'sort', 'order', 'limit', 'page'];
  for (const key of allowed) {
    if (Array.isArray(query[key])) return { error: `query parameter "${key}" must not be repeated` };
  }
  const { genre, read, q, sort, order = 'asc', limit = '50', page = '1' } = query;
  const opts = { q: q ?? '', order };

  if (genre !== undefined) {
    if (!GENRES.includes(genre)) return { error: `genre must be one of: ${GENRES.join(', ')}` };
    opts.genre = genre;
  }
  if (read !== undefined) {
    if (read !== 'true' && read !== 'false') return { error: 'read must be true or false' };
    opts.read = read === 'true';
  }
  if (sort !== undefined) {
    if (!SORT_FIELDS.includes(sort)) return { error: `sort must be one of: ${SORT_FIELDS.join(', ')}` };
    opts.sort = sort;
  }
  if (order !== 'asc' && order !== 'desc') return { error: 'order must be asc or desc' };

  const lim = parseId(limit);
  if (lim === null || lim > 50) return { error: 'limit must be an integer from 1 to 50' };
  const pg = parseId(page);
  if (pg === null) return { error: 'page must be a positive integer' };
  opts.limit = lim;
  opts.page = pg;
  return { value: opts };
}
