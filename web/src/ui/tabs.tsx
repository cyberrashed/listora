import Link from "next/link";

export function Tabs({
  items,
  current,
}: {
  items: { href: string; label: string }[];
  current: string;
}) {
  return (
    <nav className="border-line mb-6 flex gap-6 border-b">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === current ? "page" : undefined}
          className="text-muted hover:text-ink aria-[current=page]:border-ink aria-[current=page]:text-ink -mb-px border-b-2 border-transparent py-2.5 transition-colors aria-[current=page]:font-medium"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
