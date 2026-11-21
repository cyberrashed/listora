import { requireStaff } from "@/features/auth/current-staff";
import { PackageForm } from "@/features/packages/package-form";
import { listAllCategories } from "@/server/categories/categories";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function NewPackagePage() {
  const actor = await requireStaff();
  if (!can(actor, "packages.manage")) return <NoAccess title="Packages" />;

  const categories = (await listAllCategories()).filter((row) => !row.parentId);

  return (
    <>
      <PageHeader title="Add package" />
      <PackageForm categories={categories} />
    </>
  );
}
