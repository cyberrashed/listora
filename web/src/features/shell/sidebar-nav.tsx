import { accountItems, navGroups, type NavItem } from "./nav";
import { NavLink } from "./nav-link";

function Items({ items }: { items: NavItem[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.href}>
          <NavLink href={item.href}>
            <item.icon size={16} strokeWidth={1.5} className="flex-none" />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function SidebarNav() {
  return (
    <nav aria-label="Main" className="flex min-h-full flex-col">
      {navGroups.map((group) => (
        <section key={group.label ?? "overview"}>
          {group.label && (
            <p className="text-small text-muted mt-5 mb-1.5 px-2">
              {group.label}
            </p>
          )}
          <Items items={group.items} />
        </section>
      ))}
      <div className="mt-auto pt-5">
        <Items items={accountItems} />
      </div>
    </nav>
  );
}
