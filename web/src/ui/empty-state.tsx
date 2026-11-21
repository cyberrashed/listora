export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-control text-muted flex min-h-24 items-center justify-center rounded-control border border-dashed p-4 text-center">
      {children}
    </div>
  );
}
