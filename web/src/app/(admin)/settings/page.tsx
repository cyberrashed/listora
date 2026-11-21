import { requireStaff } from "@/features/auth/current-staff";
import { SettingsForm } from "@/features/content/forms";
import { getSettings } from "@/server/settings/settings";
import { can } from "@/server/staff/authorize";
import { NoAccess } from "@/ui/no-access";
import { PageHeader } from "@/ui/page-header";

export default async function SettingsPage() {
  const actor = await requireStaff();
  if (!can(actor, "settings.manage")) return <NoAccess title="Settings" />;
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="How the marketplace runs. Every change is logged under Team."
      />
      <SettingsForm settings={settings} />
    </>
  );
}
