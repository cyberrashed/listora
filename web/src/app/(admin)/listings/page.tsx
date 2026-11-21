import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { CoverThumb } from "@/features/listings/photos";
import { statusLabels } from "@/features/listings/shared";
import {
  type ListingStatus,
  listingStatuses,
} from "@/server/listings/lifecycle";
import { listListings } from "@/server/listings/listings";
import { can } from "@/server/staff/authorize";
import { buttonClass } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { formatCount, formatPrice, plural, timeSince } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pagination } from "@/ui/pagination";

const emptyMessages: Record<ListingStatus, string> = {
  in_review: "The queue is clear. New listings land here as sellers post them.",
  active: "Nothing is live yet.",
  rejected: "No listing has been rejected.",
  sold: "No listing has been marked sold yet.",
  expired: "Nothing has expired yet.",
};

export default async function ListingsPage({
  searchParams,
}: PageProps<"/listings">) {
  const actor = await requireStaff();
  if (!can(actor, "listings.review")) return <NoAccess title="Listings" />;

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);
  // A search looks across every status unless one is picked.
  const status = listingStatuses.find((name) => name === params.status);
  const shown = status ?? (query ? undefined : "in_review");

  const { items, total, pageSize, counts } = await listListings(actor, {
    status: shown,
    query,
    page,
  });
  const link = (changes: Record<string, string | undefined>) => {
    const next = { status: shown, q: query || undefined, ...changes };
    const search = new URLSearchParams(
      Object.entries(next).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    );
    return `/listings?${search}`;
  };
  const inQueue = shown === "in_review";

  return (
    <>
      <PageHeader
        title="Listings"
        description={
          counts.in_review === 0
            ? "Nothing is waiting for review."
            : `${plural(counts.in_review, "listing")} ${counts.in_review === 1 ? "is" : "are"} waiting for review.`
        }
      />
      <nav
        aria-label="Status"
        className="mb-6 grid max-w-[1000px] grid-cols-2 gap-2 sm:grid-cols-5"
      >
        {listingStatuses.map((name) => (
          <Link
            key={name}
            href={link({ status: name, page: undefined })}
            aria-current={name === shown ? "true" : undefined}
            className="border-line hover:bg-raised aria-[current=true]:border-accent aria-[current=true]:bg-accent/5 rounded-card border-[1.5px] px-3 py-2.5 transition-colors"
          >
            <span className="text-muted block text-[13px]">
              {statusLabels[name]}
            </span>
            <span className="text-section block font-semibold tabular-nums">
              {formatCount(counts[name])}
            </span>
          </Link>
        ))}
      </nav>
      {query && (
        <p className="mb-4 flex items-center gap-3">
          {plural(total, "result")} for “{query}”
          {shown ? ` in ${statusLabels[shown].toLowerCase()}` : ""}.
          <Link
            href={link({ q: undefined, page: undefined })}
            className={buttonClass("quiet")}
          >
            Clear search
          </Link>
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState>
          {query
            ? "No listing matches that search."
            : emptyMessages[shown ?? "in_review"]}
        </EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Listing</th>
              <th>Seller</th>
              <th>Location</th>
              <th className="end">Price</th>
              <th className="end">{inQueue ? "Waiting" : "Submitted"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((listing) => (
              <tr key={listing.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <CoverThumb photo={listing.photos[0]} />
                    <div>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="font-medium hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <span className="text-small text-muted block">
                        {listing.category.path.join(" › ")}
                        {!shown && ` · ${statusLabels[listing.status]}`}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{listing.seller?.name}</td>
                <td className="whitespace-nowrap">
                  {listing.location.city}, {listing.location.state}
                </td>
                <td className="end whitespace-nowrap">
                  {formatPrice(listing.price)}
                </td>
                <td className="end whitespace-nowrap">
                  {timeSince(listing.submittedAt)}
                  {!inQueue && " ago"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        shown={items.length}
        total={total}
        href={(target) => link({ page: String(target) })}
      />
    </>
  );
}
