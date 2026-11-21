import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import {
  deleteBannerAction,
  moveBannerAction,
} from "@/features/content/actions";
import { listAllCategories } from "@/server/categories/categories";
import { listBanners } from "@/server/content/content";
import { can } from "@/server/staff/authorize";
import { buttonClass } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pill } from "@/ui/pill";
import { ReorderButtons } from "@/ui/reorder-buttons";
import { RowAction } from "@/ui/row-action";

export default async function HomeScreenPage() {
  const actor = await requireStaff();
  if (!can(actor, "content.manage")) return <NoAccess title="Home screen" />;

  const [banners, categories] = await Promise.all([
    listBanners(actor),
    listAllCategories(),
  ]);
  const categoryName = new Map(categories.map((row) => [row.id, row.name]));
  const leadsTo = (banner: (typeof banners)[number]) =>
    ({
      none: "Nothing",
      category: `The ${categoryName.get(banner.target ?? "") ?? "missing"} category`,
      search: `A search for “${banner.target}”`,
      post: "The form to post a listing",
    })[banner.link];

  return (
    <>
      <PageHeader
        title="Home screen"
        description="Banners at the top of the app's Browse tab, in this order."
      >
        <Link href="/home-screen/new" className={buttonClass("primary")}>
          Add banner
        </Link>
      </PageHeader>
      {banners.length === 0 ? (
        <EmptyState>
          No banner yet. The app shows the categories first.
        </EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Banner</th>
              <th>Opens</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {banners.map((banner) => (
              <tr key={banner.id}>
                <td className="wide">
                  <Link
                    href={`/home-screen/${banner.id}`}
                    className="font-medium hover:underline"
                  >
                    {banner.title}
                  </Link>{" "}
                  {!banner.active && <Pill>Hidden</Pill>}
                  {banner.body && (
                    <span className="text-small text-muted block">
                      {banner.body}
                    </span>
                  )}
                </td>
                <td>{leadsTo(banner)}</td>
                <td className="end">
                  <div className="flex items-start justify-end gap-2">
                    <ReorderButtons
                      action={moveBannerAction}
                      id={banner.id}
                      name={banner.title}
                    />
                    <RowAction
                      action={deleteBannerAction}
                      fields={{ id: banner.id }}
                      label="Delete"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
