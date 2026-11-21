export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-title font-semibold tracking-[-0.01em]">{title}</h1>
        {description && <p className="text-muted mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}
