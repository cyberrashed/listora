import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { reorderFieldAction } from "@/features/categories/actions";
import { categoryTabs, fieldTypeLabels } from "@/features/categories/shared";
import { listAllCategories } from "@/server/categories/categories";
import { listFields } from "@/server/categories/custom-fields";
import { can } from "@/server/staff/authorize";
import { buttonClass } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { plural } from "@/ui/format";
import { PageHeader } from "@/ui/page-header";
import { ReorderButtons } from "@/ui/reorder-buttons";
import { Tabs } from "@/ui/tabs";

export default async function FieldsPage() {
  const actor = await requireStaff();
  const [fields, categories] = await Promise.all([
    listFields(),
    listAllCategories(),
  ]);
  const canManage = can(actor, "categories.manage");
  const names = new Map(categories.map((row) => [row.id, row.name]));

  return (
    <>
      <PageHeader
        title="Categories"
        description={`${plural(fields.length, "field")} that sellers fill in. The order here is the order of the form.`}
      >
        {canManage && (
          <Link
            href="/categories/fields/new"
            className={buttonClass("primary")}
          >
            New field
          </Link>
        )}
      </PageHeader>
      <Tabs items={categoryTabs} current="/categories/fields" />
      {fields.length === 0 ? (
        <EmptyState>
          No fields yet. Without them a listing has only a title, a price and a
          description.
        </EmptyState>
      ) : (
        <table className="data-table max-w-[1000px]">
          <thead>
            <tr>
              <th>Field</th>
              <th>Applies to</th>
              <th>Rules</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const detail = [
                fieldTypeLabels[field.type],
                field.unit,
                field.options.length > 0 && field.options.join(", "),
              ].filter(Boolean);
              const rules = [
                field.required && "Required",
                field.filterable && "Filter",
              ].filter(Boolean);

              return (
                <tr key={field.id}>
                  <td>
                    {canManage ? (
                      <Link
                        href={`/categories/fields/${field.id}`}
                        className="font-medium hover:underline"
                      >
                        {field.label}
                      </Link>
                    ) : (
                      <span className="font-medium">{field.label}</span>
                    )}
                    <span className="text-small text-muted block">
                      {detail.join(" · ")}
                    </span>
                  </td>
                  <td className="wide">
                    {field.categoryIds.length === 0 ? (
                      <span className="text-muted">Not in use</span>
                    ) : (
                      field.categoryIds
                        .map((id) => names.get(id))
                        .filter(Boolean)
                        .join(", ")
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {rules.join(" · ") || <span className="text-muted">—</span>}
                  </td>
                  {canManage && (
                    <td className="end">
                      <ReorderButtons
                        action={reorderFieldAction}
                        id={field.id}
                        name={field.label}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
