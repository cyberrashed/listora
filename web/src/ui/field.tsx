const control =
  "h-[38px] w-full rounded-control border border-control bg-surface px-3 placeholder:text-muted aria-invalid:border-negative";

function Shell({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${name}-note`} className="text-small text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-note`} className="text-small text-negative">
          {error}
        </p>
      )}
    </div>
  );
}

type Shared = { label: string; name: string; error?: string; hint?: string };

function describe({ name, error, hint }: Shared) {
  return {
    id: name,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${name}-note` : undefined,
  };
}

export function Field({
  label,
  error,
  hint,
  ...props
}: Shared & Omit<React.ComponentProps<"input">, "name">) {
  const shared = { label, name: props.name, error, hint };
  return (
    <Shell {...shared}>
      <input {...props} {...describe(shared)} className={control} />
    </Shell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  children,
  ...props
}: Shared & Omit<React.ComponentProps<"select">, "name">) {
  const shared = { label, name: props.name, error, hint };
  return (
    <Shell {...shared}>
      <select {...props} {...describe(shared)} className={control}>
        {children}
      </select>
    </Shell>
  );
}
