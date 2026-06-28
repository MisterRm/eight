export default function ShimmerCard() {
  return (
    <div className="flex flex-col w-full animate-pulse">
      {/* Poster skeleton */}
      <div className="bg-[#121319] aspect-[3/4] w-full rounded-xl border border-white/5" />
      {/* Title skeleton */}
      <div className="bg-[#1a1c24] h-3 rounded mt-2.5 w-3/4" />
      {/* Meta/genre skeleton */}
      <div className="bg-[#1a1c24] h-2.5 rounded mt-1.5 w-1/2" />
    </div>
  );
}
