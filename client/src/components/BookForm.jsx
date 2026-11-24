// Form to add a book (POST) or edit an existing one (PUT)
import { useEffect, useState } from 'react';
import { GENRES } from './BookControls.jsx';

const EMPTY = { title: '', author: '', year: '', genre: 'fiction', read: false, rating: '' };

export default function BookForm({ editing, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fill the form when a book is selected for editing
  useEffect(() => {
    setError('');
    setForm(editing ? { ...editing, rating: editing.rating ?? '' } : EMPTY);
  }, [editing]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const book = {
      title: form.title,
      author: form.author,
      year: Number(form.year),
      genre: form.genre,
      read: form.read,
      rating: form.rating === '' ? null : Number(form.rating),
    };
    try {
      await onSubmit(book); // the parent waits for the server before updating the screen
      if (!editing) setForm(EMPTY);
    } catch (err) {
      setError(err.message); // the server's message, e.g. duplicate or invalid year
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <strong>{editing ? `Edit #${editing.id}` : 'Add a book'}</strong>
      <input placeholder="Title" value={form.title} onChange={set('title')} />
      <input placeholder="Author" value={form.author} onChange={set('author')} />
      <input placeholder="Year" type="number" value={form.year} onChange={set('year')} style={{ width: '6rem' }} />
      <select value={form.genre} onChange={set('genre')}>
        {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <label><input type="checkbox" checked={form.read} onChange={set('read')} /> Read</label>
      <select value={form.rating} onChange={set('rating')}>
        <option value="">No rating</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Save' : 'Add'}</button>
      {editing && <button type="button" onClick={onCancel}>Cancel</button>}
      {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
    </form>
  );
}
