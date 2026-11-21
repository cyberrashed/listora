import { requireStaff } from "@/features/auth/current-staff";
import { PhotoGrid } from "@/features/listings/photos";
import { ReviewPanel } from "@/features/listings/review-panel";
import { StatusPill } from "@/features/listings/shared";
import { getListing } from "@/server/listings/listings";
import { can } from "@/server/staff/authorize";
import { formatCount, formatDate, formatPrice, timeSince } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";

function answer(
  value: string | number | boolean | string[],
  unit: string | null,
) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") {
    // A year is a number too, and "2,015" would be wrong.
    const text =
      value >= 1900 && value <= 2100 ? String(value) : formatCount(value);
    return unit ? `${text} ${unit}` : text;
  }
  return value;
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default async function ListingPage({
  params,
}: PageProps<"/listings/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "listings.review")) return <NoAccess title="Listing" />;

  const listing = await getListing(actor, (await params).id);
  const { seller } = listing;
  const open = listing.status === "in_review" || listing.status === "active";

  return (
    <div className="grid max-w-[1100px] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article>
        <p className="text-small text-muted">
          {listing.category.path.join(" › ")}
        </p>
        <h1 className="text-title mt-1 font-semibold tracking-[-0.01em]">
          {listing.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-kpi tabular-nums">
            {formatPrice(listing.price)}
          </span>
          <StatusPill status={listing.status} />
        </p>
        {listing.rejection && (
          <p className="bg-raised mt-4 rounded-card p-4">
            <span className="font-medium">
              {listing.rejection.kind === "soft"
                ? "Rejected, the seller can fix it. "
                : "Rejected for good. "}
            </span>
            {listing.rejection.reason}
          </p>
        )}
        <h2 className="text-section mt-8 mb-3 font-medium">
          Photos
          {listing.photos.length > 0 && (
            <span className="text-muted font-normal">
              {" "}
              · {listing.photos.length}
            </span>
          )}
        </h2>
        <PhotoGrid photos={listing.photos} title={listing.title} />
        <h2 className="text-section mt-8 mb-2 font-medium">Description</h2>
        <p className="max-w-[65ch] whitespace-pre-line">
          {listing.description}
        </p>
        {listing.attributes.length > 0 && (
          <>
            <h2 className="text-section mt-8 mb-1 font-medium">Details</h2>
            <dl className="divide-rule max-w-[440px] divide-y">
              {listing.attributes.map((attribute) => (
                <Fact key={attribute.label} label={attribute.label}>
                  {answer(attribute.value, attribute.unit)}
                </Fact>
              ))}
            </dl>
          </>
        )}
      </article>
      <aside className="grid content-start gap-8">
        <section>
          <h2 className="text-section mb-1 font-medium">Seller</h2>
          {seller ? (
            <dl className="divide-rule divide-y">
              <Fact label="Name">{seller.name}</Fact>
              <Fact label="Email">{seller.email}</Fact>
              <Fact label="Phone">
                {seller.phone ?? <span className="text-muted">—</span>}
              </Fact>
              <Fact label="Member since">{formatDate(seller.joinedAt)}</Fact>
            </dl>
          ) : (
            <p className="text-muted">This seller deleted their account.</p>
          )}
        </section>
        <section>
          <h2 className="text-section mb-1 font-medium">Listing</h2>
          <dl className="divide-rule divide-y">
            <Fact label="Location">
              {listing.location.city}, {listing.location.state}
              {listing.location.zip && ` ${listing.location.zip}`}
            </Fact>
            <Fact label="Submitted">{timeSince(listing.submittedAt)} ago</Fact>
            {listing.publishedAt && (
              <Fact label="Published">{formatDate(listing.publishedAt)}</Fact>
            )}
            {listing.expiresAt && (
              <Fact label="Expires">{formatDate(listing.expiresAt)}</Fact>
            )}
            <Fact label="Phone shown to buyers">
              {listing.showPhone ? "Yes" : "No"}
            </Fact>
          </dl>
        </section>
        {open && (
          <section className="bg-raised rounded-sheet p-4">
            <ReviewPanel id={listing.id} status={listing.status} />
          </section>
        )}
      </aside>
    </div>
  );
}
