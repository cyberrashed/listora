"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

type Props = { href: string; children: React.ReactNode };

function Anchor({ href, children, current }: Props & { current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="text-muted hover:text-ink aria-[current=page]:bg-active aria-[current=page]:text-ink flex h-11 items-center gap-2.5 rounded-card px-2 transition-colors lg:h-8"
    >
      {children}
    </Link>
  );
}

function CurrentAnchor(props: Props) {
  const pathname = usePathname();
  const current =
    props.href === "/" ? pathname === "/" : pathname.startsWith(props.href);

  return <Anchor {...props} current={current} />;
}

// The path of a dynamic route isn't known when its shell is prerendered, so
// the link renders unmarked first and picks up the current page after.
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Anchor {...props} current={false} />}>
      <CurrentAnchor {...props} />
    </Suspense>
  );
}
