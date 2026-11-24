// api/books.js — the ONLY place that knows URLs and calls fetch

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Shared helper: sets Content-Type only when there is a body, checks response.ok,
// turns the server's { error } into an Error and handles 204 (no body)
async function request(path, { method = 'GET', body, signal } = {}) {
  const options = { method, signal };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}`);
  }
  return data;
}

// Builds a safe, encoded query string; empty values are left out
export function listBooks(params = {}, signal) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== undefined && value !== null) search.set(key, value);
  }
  const qs = search.toString();
  return request(`/api/books${qs ? `?${qs}` : ''}`, { signal });
}

export const getBook = (id) => request(`/api/books/${id}`);
export const createBook = (book) => request('/api/books', { method: 'POST', body: book });
export const replaceBook = (id, book) => request(`/api/books/${id}`, { method: 'PUT', body: book });
export const patchBook = (id, changes) => request(`/api/books/${id}`, { method: 'PATCH', body: changes });
export const deleteBook = (id) => request(`/api/books/${id}`, { method: 'DELETE' });
export const getStats = () => request('/api/stats');
