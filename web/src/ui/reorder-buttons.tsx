import { ChevronDown, ChevronUp } from "lucide-react";

const button =
  "text-muted hover:bg-raised hover:text-ink flex size-7 items-center justify-center rounded-control transition-colors";

/** Moves one row up or down among its neighbours. */
export function ReorderButtons({
  action,
  id,
  name,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  name: string;
}) {
  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <button
        name="direction"
        value="up"
        aria-label={`Move ${name} up`}
        className={button}
      >
        <ChevronUp size={16} strokeWidth={1.5} />
      </button>
      <button
        name="direction"
        value="down"
        aria-label={`Move ${name} down`}
        className={button}
      >
        <ChevronDown size={16} strokeWidth={1.5} />
      </button>
    </form>
  );
}
