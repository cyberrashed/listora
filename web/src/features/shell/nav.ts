import {
  BadgeCheck,
  Bell,
  Flag,
  FolderTree,
  Images,
  LayoutGrid,
  LifeBuoy,
  type LucideIcon,
  MessagesSquare,
  Newspaper,
  Package,
  Receipt,
  Settings,
  Star,
  Tag,
  UserCog,
  Users,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label?: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    items: [{ href: "/", label: "Overview", icon: LayoutGrid }],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/listings", label: "Listings", icon: Tag },
      { href: "/categories", label: "Categories", icon: FolderTree },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Moderation",
    items: [
      { href: "/reports", label: "Reports", icon: Flag },
      { href: "/reviews", label: "Reviews", icon: Star },
      { href: "/verification", label: "Verification", icon: BadgeCheck },
      { href: "/conversations", label: "Conversations", icon: MessagesSquare },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/packages", label: "Packages", icon: Package },
      { href: "/payments", label: "Payments", icon: Receipt },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/home-screen", label: "Home screen", icon: Images },
      { href: "/blog", label: "Blog", icon: Newspaper },
      { href: "/help-pages", label: "Help pages", icon: LifeBuoy },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export const accountItems: NavItem[] = [
  { href: "/team", label: "Team", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const navItems: NavItem[] = [
  ...navGroups.flatMap((group) => group.items),
  ...accountItems,
];
