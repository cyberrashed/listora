import { Search } from "lucide-react";

export function SearchForm({ className }: { className?: string }) {
  return (
    <form action="/listings" role="search" className={className}>
      <label className="border-control bg-surface focus-within:outline-accent flex h-8 items-center gap-2 rounded-control border px-2.5 focus-within:outline-2 focus-within:outline-offset-2">
        <Search size={14} strokeWidth={1.5} className="text-muted flex-none" />
        <span className="sr-only">Search listings</span>
        <input
          type="search"
          name="q"
          placeholder="Search listings"
          className="placeholder:text-muted min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
    </form>
  );
}
