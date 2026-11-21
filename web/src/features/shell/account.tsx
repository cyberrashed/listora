import { signOutAction } from "../auth/actions";
import { currentStaff } from "../auth/current-staff";

export async function Account() {
  const actor = await currentStaff();
  if (!actor) return null;

  return (
    <div className="flex items-center gap-3">
      <p className="hidden text-right leading-4 sm:block">
        <span className="block font-medium">{actor.name}</span>
        <span className="text-small text-muted block">{actor.role}</span>
      </p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-muted hover:text-ink h-8 rounded-control px-2 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
