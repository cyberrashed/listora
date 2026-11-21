import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { reorderCategoryAction } from "@/features/categories/actions";
import { NewCategoryForm } from "@/features/categories/new-category-form";
import { categoryTabs } from "@/features/categories/shared";
import { listAllCategories } from "@/server/categories/categories";
import { can } from "@/server/staff/authorize";
import { EmptyState } from "@/ui/empty-state";
import { plural } from "@/ui/format";
import { PageHeader } from "@/ui/page-header";
import { Pill } from "@/ui/pill";
import { ReorderButtons } from "@/ui/reorder-buttons";
import { Tabs } from "@/ui/tabs";

export default async function CategoriesPage() {
  const actor = await requireStaff();
  const categories = await listAllCategories();
  const canManage = can(actor, "categories.manage");
  const groups = categories.filter((category) => category.depth === 0).length;

  return (
    <>
      <PageHeader
        title="Categories"
        description={`${plural(categories.length, "category", "categories")} in ${plural(groups, "group")}. The order here is the order customers see.`}
      />
      <Tabs items={categoryTabs} current="/categories" />
      {canManage && <NewCategoryForm parents={categories} />}
      {categories.length === 0 ? (
        <EmptyState>
          No categories yet. Add the first one to open the marketplace for
          listings.
        </EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Category</th>
              <th>Slug</th>
              <th className="end">Own fields</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <span
                    className="flex items-center gap-2"
                    style={{ paddingLeft: category.depth * 24 }}
                  >
                    {canManage ? (
                      <Link
                        href={`/categories/${category.id}`}
                        className={`hover:underline ${category.depth === 0 ? "font-medium" : ""}`}
                      >
                        {category.name}
                      </Link>
                    ) : (
                      <span
                        className={category.depth === 0 ? "font-medium" : ""}
                      >
                        {category.name}
                      </span>
                    )}
                    {!category.active && <Pill>Hidden</Pill>}
                  </span>
                </td>
                <td className="text-muted">{category.slug}</td>
                <td className="end">
                  {category.fields || <span className="text-muted">—</span>}
                </td>
                {canManage && (
                  <td className="end">
                    <ReorderButtons
                      action={reorderCategoryAction}
                      id={category.id}
                      name={category.name}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
