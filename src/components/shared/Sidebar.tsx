import { Link } from "@tanstack/react-router";
import { Home, Bot, Calendar, MessageSquare, Users } from "lucide-react";

interface SidebarProps {
  aiNavDisabled: boolean;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/ai", label: "AI Assistant", icon: Bot, lockable: true },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/users", label: "Users", icon: Users, adminOnly: true },
] as const;

export function Sidebar({ aiNavDisabled }: SidebarProps) {
  return (
    <aside className="w-60 border-r border-gray-200 bg-white flex flex-col">
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isLocked = item.lockable && aiNavDisabled;
          const Icon = item.icon;

          if (isLocked) {
            return (
              <div
                key={item.to}
                title="Unavailable during an active quiz"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 cursor-not-allowed select-none"
              >
                <Icon size={18} />
                <span className="text-sm">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 [&.active]:bg-classly-green/10 [&.active]:text-classly-green"
              activeProps={{ className: "active" }}
            >
              <Icon size={18} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
