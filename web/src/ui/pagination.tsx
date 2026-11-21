import Link from "next/link";
import { buttonClass } from "./button";
import { formatCount } from "./format";

/**
 * The range on screen and the way to the next one. Renders nothing when
 * everything fits on one page.
 */
export function Pagination({
  page,
  pageSize,
  shown,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  shown: number;
  total: number;
  href: (page: number) => string;
}) {
  if (total <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = first + shown - 1;

  return (
    <div className="text-muted mt-4 flex max-w-[1000px] items-center justify-between">
      <p>
        {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className={buttonClass()}>
            Previous
          </Link>
        )}
        {last < total && (
          <Link href={href(page + 1)} className={buttonClass()}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
