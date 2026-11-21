// Holds the title's place while a page reads the session and its data.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="bg-raised mb-6 h-7 w-40 rounded-chip" />
      <div className="bg-raised h-24 rounded-control" />
    </div>
  );
}
