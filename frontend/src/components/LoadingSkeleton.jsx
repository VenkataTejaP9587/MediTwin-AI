export default function LoadingSkeleton({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <div className="shimmer h-16 rounded-xl" style={{ width: `${85 + Math.random() * 15}%` }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 glass border border-cyan-400/10">
          <div className="shimmer h-4 w-20 rounded mb-3" />
          <div className="shimmer h-8 w-16 rounded mb-2" />
          <div className="shimmer h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}
