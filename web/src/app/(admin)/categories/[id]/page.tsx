import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { deleteCategoryAction } from "@/features/categories/actions";
import { CategoryForm } from "@/features/categories/category-form";
import { fieldTypeLabels } from "@/features/categories/shared";
import { getCategory, listAllCategories } from "@/server/categories/categories";
import { fieldsForCategory } from "@/server/categories/custom-fields";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { RowAction } from "@/ui/row-action";

export default async function CategoryPage({
  params,
}: PageProps<"/categories/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "categories.manage")) return <NoAccess title="Category" />;

  const { id } = await params;
  const [category, categories, fields] = await Promise.all([
    getCategory(id),
    listAllCategories(),
    fieldsForCategory(id),
  ]);

  // A category can't move under itself or anything below it. The list is in
  // tree order, so its subtree is the run of deeper rows that follows it.
  const index = categories.findIndex((row) => row.id === id);
  const end = categories.findIndex(
    (row, at) => at > index && row.depth <= categories[index].depth,
  );
  const parents = categories.filter(
    (_, at) => at < index || (end !== -1 && at >= end),
  );
  const hasChildren = categories[index + 1]?.depth > categories[index].depth;

  return (
    <>
      <PageHeader title={category.name} />
      <div className="grid max-w-[1000px] gap-10 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <CategoryForm category={category} parents={parents} />
        <section>
          <h2 className="text-section font-medium">Fields on listings here</h2>
          <p className="text-muted mt-1 mb-4">
            {fields.length === 0
              ? "Listings in this category carry no extra fields."
              : "Sellers fill these in when they post in this category."}
          </p>
          {fields.length > 0 && (
            <ul className="border-line divide-rule divide-y border-y">
              {fields.map((field) => (
                <li
                  key={field.id}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                >
                  <Link
                    href={`/categories/fields/${field.id}`}
                    className="hover:underline"
                  >
                    {field.label}
                  </Link>
                  <span className="text-small text-muted text-right">
                    {fieldTypeLabels[field.type]}
                    {field.inherited && " · from a parent category"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/categories/fields"
            className="mt-4 inline-block font-medium hover:underline"
          >
            Manage listing fields
          </Link>
        </section>
      </div>
      <section className="border-line mt-10 max-w-[1000px] border-t pt-8">
        <h2 className="text-section font-medium">Remove this category</h2>
        <p className="text-muted mt-1 mb-4">
          {hasChildren
            ? "Move or remove its subcategories first."
            : "Its fields stay; they are only detached from it."}
        </p>
        {!hasChildren && (
          <div className="flex">
            <RowAction
              action={deleteCategoryAction}
              fields={{ id }}
              label={`Remove ${category.name}`}
              danger
            />
          </div>
        )}
      </section>
    </>
  );
}
