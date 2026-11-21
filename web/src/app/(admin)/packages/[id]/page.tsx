import { requireStaff } from "@/features/auth/current-staff";
import { PackageForm } from "@/features/packages/package-form";
import { listAllCategories } from "@/server/categories/categories";
import { getPackage } from "@/server/packages/packages";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function EditPackagePage({
  params,
}: PageProps<"/packages/[id]">) {
  const actor = await requireStaff();
  if (!can(actor, "packages.manage")) return <NoAccess title="Packages" />;

  const [pkg, categories] = await Promise.all([
    getPackage(actor, (await params).id),
    listAllCategories(),
  ]);

  return (
    <>
      <PageHeader
        title={pkg.name}
        description="Changes apply to new sales. Credits already bought keep their terms."
      />
      <PackageForm
        key={pkg.id}
        pkg={pkg}
        categories={categories.filter((row) => !row.parentId)}
      />
    </>
  );
}
