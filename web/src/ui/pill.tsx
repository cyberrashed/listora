const tones = {
  neutral: "bg-(--pill-neutral-bg) text-(--pill-neutral-ink)",
  positive: "bg-(--pill-positive-bg) text-(--pill-positive-ink)",
  negative: "bg-(--pill-negative-bg) text-(--pill-negative-ink)",
  warning: "bg-(--pill-warning-bg) text-(--pill-warning-ink)",
};

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`text-small inline-flex h-[22px] flex-none items-center rounded-full px-2 font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
