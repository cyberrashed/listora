import { requireStaff } from "@/features/auth/current-staff";
import { deleteFieldAction } from "@/features/categories/actions";
import { FieldForm } from "@/features/categories/field-form";
import { listAllCategories } from "@/server/categories/categories";
import { getField } from "@/server/categories/custom-fields";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { RowAction } from "@/ui/row-action";

export default async function FieldPage({
  params,
}: PageProps<"/categories/fields/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "categories.manage")) return <NoAccess title="Field" />;

  const { id } = await params;
  const [field, categories] = await Promise.all([
    getField(id),
    listAllCategories(),
  ]);

  return (
    <>
      <PageHeader title={field.label} />
      <FieldForm field={field} categories={categories} />
      <section className="border-line mt-10 max-w-[1000px] border-t pt-8">
        <h2 className="text-section font-medium">Remove this field</h2>
        <p className="text-muted mt-1 mb-4">
          It disappears from the posting form in every category.
        </p>
        <div className="flex">
          <RowAction
            action={deleteFieldAction}
            fields={{ id }}
            label={`Remove ${field.label}`}
            danger
          />
        </div>
      </section>
    </>
  );
}
