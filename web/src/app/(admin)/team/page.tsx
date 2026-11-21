import Link from "next/link";
import { requireStaff } from "@/features/auth/current-staff";
import { setStaffActiveAction } from "@/features/team/actions";
import { teamTabs } from "@/features/team/tabs";
import { can } from "@/server/staff/authorize";
import { listStaff } from "@/server/staff/team";
import { buttonClass } from "@/ui/button";
import { formatDate, plural } from "@/ui/format";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";
import { Pill } from "@/ui/pill";
import { RowAction } from "@/ui/row-action";
import { Tabs } from "@/ui/tabs";

export default async function TeamPage() {
  const actor = await requireStaff();
  if (!can(actor, "team.manage")) return <NoAccess title="Team" />;

  const staff = await listStaff(actor);
  const active = staff.filter((member) => member.active).length;

  return (
    <>
      <PageHeader
        title="Team"
        description={`${plural(active, "person", "people")} can sign in to the back office.`}
      >
        <Link href="/team/new" className={buttonClass("primary")}>
          Add staff member
        </Link>
      </PageHeader>
      <Tabs items={teamTabs} current="/team" />
      <table className="data-table max-w-[1000px]">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
              <td>
                <span className="font-medium">{member.name}</span>
                <span className="text-small text-muted block">
                  {member.email}
                </span>
              </td>
              <td>{member.role}</td>
              <td>{formatDate(member.joinedAt)}</td>
              <td>
                {member.active ? (
                  <span className="text-muted">Active</span>
                ) : (
                  <Pill>Deactivated</Pill>
                )}
              </td>
              <td className="end">
                {member.id !== actor.id && (
                  <RowAction
                    action={setStaffActiveAction}
                    fields={{ id: member.id, active: String(!member.active) }}
                    label={member.active ? "Deactivate" : "Reactivate"}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
