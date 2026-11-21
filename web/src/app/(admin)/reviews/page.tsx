import { requireStaff } from "@/features/auth/current-staff";
import { setReviewHiddenAction } from "@/features/moderation/actions";
import { listReviews } from "@/server/reviews/reviews";
import { can } from "@/server/staff/authorize";
import { EmptyState } from "@/ui/empty-state";
import { formatDate, plural } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pagination } from "@/ui/pagination";
import { RowAction } from "@/ui/row-action";
import { Tabs } from "@/ui/tabs";

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="whitespace-nowrap tabular-nums"
      aria-label={`${rating} out of 5`}
    >
      {rating}
      <span className="text-muted"> / 5</span>
    </span>
  );
}

export default async function ReviewsPage({
  searchParams,
}: PageProps<"/reviews">) {
  const actor = await requireStaff();
  if (!can(actor, "reviews.moderate")) return <NoAccess title="Reviews" />;

  const params = await searchParams;
  const hidden = params.show === "hidden";
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total, pageSize, hiddenCount } = await listReviews(actor, {
    hidden,
    page,
  });

  return (
    <>
      <PageHeader
        title="Reviews"
        description="What buyers say about sellers after talking with them. Hidden reviews leave the seller's profile and rating."
      />
      <Tabs
        items={[
          { href: "/reviews", label: "Visible" },
          {
            href: "/reviews?show=hidden",
            label: hiddenCount ? `Hidden (${hiddenCount})` : "Hidden",
          },
        ]}
        current={hidden ? "/reviews?show=hidden" : "/reviews"}
      />
      {items.length === 0 ? (
        <EmptyState>
          {hidden ? "No review is hidden." : "No one has written a review yet."}
        </EmptyState>
      ) : (
        <table className="data-table max-w-[1100px]">
          <thead>
            <tr>
              <th>Rating</th>
              <th>Review</th>
              <th>Seller</th>
              <th>Written</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((review) => (
              <tr key={review.id}>
                <td>
                  <Stars rating={review.rating} />
                </td>
                <td className="wide">
                  {review.text ? (
                    <span className="line-clamp-2 max-w-[48ch]">
                      {review.text}
                    </span>
                  ) : (
                    <span className="text-muted">No comment</span>
                  )}
                  <span className="text-small text-muted block">
                    {review.reviewerName} on “{review.listingTitle}”
                  </span>
                </td>
                <td className="whitespace-nowrap">{review.sellerName}</td>
                <td className="whitespace-nowrap">
                  {formatDate(review.createdAt)}
                </td>
                <td className="end">
                  <RowAction
                    action={setReviewHiddenAction}
                    fields={{ id: review.id, hidden: String(!review.hidden) }}
                    label={review.hidden ? "Restore" : "Hide"}
                  />
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
        href={(target) =>
          `/reviews?${new URLSearchParams({ ...(hidden && { show: "hidden" }), page: String(target) })}`
        }
      />
      {!hidden && total > 0 && (
        <p className="text-small text-muted mt-3">
          {plural(total, "review")} visible.
        </p>
      )}
    </>
  );
}
