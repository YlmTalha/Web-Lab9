import { useCallback, useEffect, useState } from 'react';
import * as api from './api/books.js';
import BookControls from './components/BookControls.jsx';
import BookList from './components/BookList.jsx';
import BookForm from './components/BookForm.jsx';
import StatsPanel from './components/StatsPanel.jsx';

const INITIAL_QUERY = { q: '', genre: '', read: '', sort: '', order: 'asc' };

export default function App() {
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');

  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  // Load the list whenever the query changes. The cleanup aborts the previous
  // request, so an old (slow) response can never overwrite a newer one.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError('');
    api.listBooks(query, controller.signal)
      .then((data) => setBooks(data))
      .catch((err) => {
        if (err.name !== 'AbortError') setListError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, reloadKey]);

  const loadStats = useCallback(() => {
    api.getStats()
      .then((data) => { setStats(data); setStatsError(''); })
      .catch((err) => setStatsError(err.message));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // After every successful change: refresh the list (server decides filters/sort) and the stats
  function afterChange() {
    setReloadKey((k) => k + 1);
    loadStats();
  }

  async function handleSubmit(book) {
    if (editing) {
      const saved = await api.replaceBook(editing.id, book); // PUT
      setBooks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
      setEditing(null);
    } else {
      await api.createBook(book); // POST
    }
    afterChange();
  }

  // Runs one PATCH/DELETE and only updates the screen after the server confirms it
  async function runAction(book, action) {
    setBusyId(book.id);
    setActionError('');
    try {
      await action();
      afterChange();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const toggleRead = (book) =>
    runAction(book, async () => {
      // un-reading a book also clears its rating, otherwise the server answers 400
      const changes = book.read ? { read: false, rating: null } : { read: true };
      const saved = await api.patchBook(book.id, changes);
      setBooks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
    });

  const rate = (book, value) =>
    runAction(book, async () => {
      const saved = await api.patchBook(book.id, { rating: value === '' ? null : Number(value) });
      setBooks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
    });

  const remove = (book) =>
    runAction(book, async () => {
      await api.deleteBook(book.id);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      if (editing?.id === book.id) setEditing(null);
    });

  return (
    <main>
      <h1>Reading List</h1>

      <section>
        <StatsPanel stats={stats} error={statsError} />
      </section>

      <section>
        <BookForm editing={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      </section>

      <section>
        <BookControls query={query} onChange={setQuery} />
        {actionError && <p className="error">{actionError}</p>}
        <BookList
          books={books}
          loading={loading}
          error={listError}
          busyId={busyId}
          onEdit={setEditing}
          onToggleRead={toggleRead}
          onRate={rate}
          onDelete={remove}
        />
      </section>
    </main>
  );
}
