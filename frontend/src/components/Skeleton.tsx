interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-9 w-20 mt-2" />
      <Skeleton className="h-3 w-32 mt-2" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-700/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function VoiceCardSkeleton() {
  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TopicCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <Skeleton className="h-5 w-24 mb-2" />
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

export function PageSkeleton({ title = 'Loading...' }: { title?: string }) {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <CardSkeleton />
    </div>
  );
}

export default Skeleton;
