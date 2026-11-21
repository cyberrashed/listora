import { requireStaff } from "@/features/auth/current-staff";
import { deleteRoleAction } from "@/features/team/actions";
import { NewRoleForm, RolePermissionsForm } from "@/features/team/role-forms";
import { teamTabs } from "@/features/team/tabs";
import { can } from "@/server/staff/authorize";
import { listRoles } from "@/server/staff/team";
import { plural } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { RowAction } from "@/ui/row-action";
import { Tabs } from "@/ui/tabs";

function Section({
  title,
  note,
  aside,
  children,
}: {
  title: string;
  note: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line grid gap-4 border-b py-8 first:pt-0 last:border-b-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
      <div className="pt-4">
        <h2 className="text-section font-medium">{title}</h2>
        <p className="text-muted mt-1">{note}</p>
        {aside && <div className="mt-4 flex">{aside}</div>}
      </div>
      <div className="bg-raised rounded-sheet p-4">{children}</div>
    </section>
  );
}

export default async function RolesPage() {
  const actor = await requireStaff();
  if (!can(actor, "team.manage")) return <NoAccess title="Team" />;

  const roles = await listRoles(actor);

  return (
    <>
      <PageHeader
        title="Team"
        description="A role decides which sections its staff can open and what they can change."
      />
      <Tabs items={teamTabs} current="/team/roles" />
      <div className="max-w-[1000px]">
        {roles.map((role) => (
          <Section
            key={role.id}
            title={role.name}
            note={
              role.members === 0
                ? "No staff hold this role."
                : `Held by ${plural(role.members, "staff member")}.`
            }
            aside={
              !role.owner &&
              role.members === 0 && (
                <RowAction
                  action={deleteRoleAction}
                  fields={{ id: role.id }}
                  label="Remove role"
                  danger
                />
              )
            }
          >
            {role.owner ? (
              <p>
                Owners can do everything, including managing the team. This role
                can&apos;t be edited or removed.
              </p>
            ) : (
              <RolePermissionsForm role={role} />
            )}
          </Section>
        ))}
        <Section
          title="New role"
          note="Start from nothing and tick what the role needs."
        >
          <NewRoleForm />
        </Section>
      </div>
    </>
  );
}
