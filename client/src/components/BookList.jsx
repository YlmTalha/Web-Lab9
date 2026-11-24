// Shows the books with loading, error and empty states
export default function BookList({ books, loading, error, busyId, onEdit, onToggleRead, onRate, onDelete }) {
  if (loading) return <p>Loading books…</p>;
  if (error) return <p className="error">{error}</p>;
  if (books.length === 0) return <p>No books match your filters.</p>;

  return (
    <table>
      <thead>
        <tr><th>Title</th><th>Author</th><th>Year</th><th>Genre</th><th>Read</th><th>Rating</th><th></th></tr>
      </thead>
      <tbody>
        {books.map((b) => {
          const busy = busyId === b.id;
          return (
            <tr key={b.id}>
              <td>{b.title}</td>
              <td>{b.author}</td>
              <td>{b.year}</td>
              <td>{b.genre}</td>
              <td>
                <input type="checkbox" checked={b.read} disabled={busy} onChange={() => onToggleRead(b)} />
              </td>
              <td>
                <select value={b.rating ?? ''} disabled={busy || !b.read} onChange={(e) => onRate(b, e.target.value)}>
                  <option value="">–</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                </select>
              </td>
              <td>
                <button disabled={busy} onClick={() => onEdit(b)}>Edit</button>{' '}
                <button disabled={busy} onClick={() => onDelete(b)}>Delete</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
