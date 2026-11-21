import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { GrantForm } from "@/features/packages/grant-form";
import { listAllCategories } from "@/server/categories/categories";
import { listPackages } from "@/server/packages/packages";
import { getSettings } from "@/server/settings/settings";
import { can } from "@/server/staff/authorize";
import { buttonClass } from "@/ui/button";
import { formatCount, formatMoney } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pill } from "@/ui/pill";

export default async function PackagesPage() {
  const actor = await requireStaff();
  if (!can(actor, "packages.manage")) return <NoAccess title="Packages" />;

  const [packages, categories, { freeListingsPerMonth }] = await Promise.all([
    listPackages(actor),
    listAllCategories(),
    getSettings(),
  ]);
  const categoryName = new Map(categories.map((row) => [row.id, row.name]));

  return (
    <>
      <PageHeader
        title="Packages"
        description={`Every account posts ${freeListingsPerMonth} listings a month for free. Packages sell more, and put listings on top.`}
      >
        <Link href="/packages/new" className={buttonClass("primary")}>
          Add package
        </Link>
      </PageHeader>
      <div className="grid max-w-[1100px] gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Gives</th>
              <th className="end">Price</th>
              <th className="end">Sold</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="wide">
                  <Link
                    href={`/packages/${pkg.id}`}
                    className="font-medium hover:underline"
                  >
                    {pkg.name}
                  </Link>{" "}
                  {!pkg.active && <Pill>Off sale</Pill>}
                  <span className="text-small text-muted block">
                    {pkg.categoryId
                      ? `${categoryName.get(pkg.categoryId) ?? "A category"} only`
                      : "Every category"}
                  </span>
                </td>
                <td>
                  {pkg.quantity}{" "}
                  {pkg.kind === "featured"
                    ? `featured for ${pkg.featureDays} days each`
                    : pkg.quantity === 1
                      ? "listing"
                      : "listings"}
                  <span className="text-small text-muted block">
                    within {pkg.days} days
                  </span>
                </td>
                <td className="end whitespace-nowrap">
                  {formatMoney(pkg.priceCents)}
                </td>
                <td className="end tabular-nums">{formatCount(pkg.sold)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className="bg-raised rounded-sheet content-start p-4">
          <h2 className="text-section mb-1 font-medium">Give a package</h2>
          <p className="text-small text-muted mb-4">
            For a customer who had a problem, or a seller you want to win over.
          </p>
          <GrantForm
            packages={packages.map((pkg) => ({ id: pkg.id, name: pkg.name }))}
          />
        </section>
      </div>
    </>
  );
}
