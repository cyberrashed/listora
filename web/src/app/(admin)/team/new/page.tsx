import { requireStaff } from "@/features/auth/current-staff";
import { NewStaffForm } from "@/features/team/new-staff-form";
import { can } from "@/server/staff/authorize";
import { listRoles } from "@/server/staff/team";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function NewStaffPage() {
  const actor = await requireStaff();
  if (!can(actor, "team.manage")) return <NoAccess title="Add staff member" />;

  const roles = await listRoles(actor);

  return (
    <>
      <PageHeader
        title="Add staff member"
        description="They can sign in as soon as you save."
      />
      <NewStaffForm roles={roles.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
