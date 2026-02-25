import {
  Activity,
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  BarChart3,
  MessageSquare,
  Bell,
  Settings,
} from "lucide-react";

import NavItem from "./NavItem";

const Sidebar = () => {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex items-center gap-2 p-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-blue-900">MediCare Pro</span>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>

        <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" to="/dashboard" />
        <NavItem icon={<Users size={20} />} label="Patients" to="/patients" />
        <NavItem icon={<Calendar size={20} />} label="Appointments" badge="12" disabled />
        <NavItem icon={<FileText size={20} />} label="Medical Records" disabled />
        <NavItem icon={<BarChart3 size={20} />} label="Analytics" disabled />

        <p className="mb-2 mt-8 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Communication
        </p>

        <NavItem
          icon={<MessageSquare size={20} />}
          label="Messages"
          badge="5"
          badgeColor="bg-red-500"
          disabled
        />
        <NavItem
          icon={<Bell size={20} />}
          label="Notifications"
          badge="5"
          badgeColor="bg-red-500"
          disabled
        />
        <NavItem icon={<Activity size={20} />} label="Health Monitor" disabled />
      </nav>

      <div className="border-t border-slate-100 p-4">
        <NavItem icon={<Settings size={20} />} label="Settings" disabled />
      </div>
    </aside>
  );
};

export default Sidebar;
