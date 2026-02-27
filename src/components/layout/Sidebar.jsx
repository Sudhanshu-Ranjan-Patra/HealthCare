import {
  Activity,
  LayoutDashboard,
  Users,
  Bell,
  ShieldAlert,
  Settings,
  Smartphone,
  FileText,
} from "lucide-react";

import NavItem from "./NavItem";
import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {
  const { user } = useAuth();
  const isFamily = user?.role === "FAMILY";

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-blue-900">MediCare Pro</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Remote patient monitoring platform</p>
        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
          {isFamily ? "Family Portal" : "Admin Portal"}
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Overview</p>

        {isFamily ? (
          <>
            <NavItem icon={<LayoutDashboard size={20} />} label="Family Dashboard" to="/family/dashboard" />
            <NavItem icon={<Bell size={20} />} label="Alerts Feed" badge="Live" badgeColor="bg-rose-500" disabled />
            <NavItem icon={<FileText size={20} />} label="Medical Timeline" disabled />
          </>
        ) : (
          <>
            <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" to="/admin/dashboard" />
            <NavItem icon={<Users size={20} />} label="Patients" to="/admin/patients" />
            <NavItem icon={<ShieldAlert size={20} />} label="Critical Alerts" badge="Soon" disabled />
          </>
        )}

        <p className="mb-2 mt-7 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Operations</p>
        <NavItem icon={<Smartphone size={20} />} label="Device Registry" disabled />
        <NavItem icon={<Settings size={20} />} label="Settings" disabled />
      </nav>
    </aside>
  );
};

export default Sidebar;
