const variants = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "border border-control bg-surface hover:bg-raised",
  quiet: "hover:bg-raised",
  danger: "border border-control bg-surface text-negative hover:bg-raised",
};

type Variant = keyof typeof variants;

// Exported for links that should look like buttons.
export function buttonClass(variant: Variant = "secondary") {
  return `inline-flex h-8 items-center justify-center gap-2 rounded-control px-3 font-medium whitespace-nowrap transition-colors active:translate-y-px disabled:opacity-60 ${variants[variant]}`;
}

export function Button({
  variant,
  className = "",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={`${buttonClass(variant)} ${className}`} {...props} />
  );
}
