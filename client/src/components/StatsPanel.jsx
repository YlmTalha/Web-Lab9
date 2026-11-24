// Statistics from GET /api/stats
export default function StatsPanel({ stats, error }) {
  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p>Loading statistics…</p>;

  return (
    <div className="stats">
      <span>Total: <strong>{stats.total}</strong></span>
      <span>Read: <strong>{stats.read}</strong></span>
      <span>Unread: <strong>{stats.unread}</strong></span>
      <span>Average rating: <strong>{stats.averageRating ?? '–'}</strong></span>
      <span>
        By genre:{' '}
        {Object.entries(stats.byGenre).map(([g, n]) => `${g} ${n}`).join(' · ')}
      </span>
    </div>
  );
}
