// Search, filter and sort controls. Every change becomes a new server request in App.
export const GENRES = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];

export default function BookControls({ query, onChange }) {
  // Immutable update: build a new query object
  const set = (key) => (e) => onChange({ ...query, [key]: e.target.value });

  return (
    <div className="controls">
      <input placeholder="Search title or author" value={query.q} onChange={set('q')} />
      <select value={query.genre} onChange={set('genre')}>
        <option value="">All genres</option>
        {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <select value={query.read} onChange={set('read')}>
        <option value="">Read + unread</option>
        <option value="true">Read</option>
        <option value="false">Unread</option>
      </select>
      <select value={query.sort} onChange={set('sort')}>
        <option value="">Sort by id</option>
        <option value="title">Title</option>
        <option value="author">Author</option>
        <option value="year">Year</option>
        <option value="rating">Rating</option>
      </select>
      <select value={query.order} onChange={set('order')}>
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </div>
  );
}
