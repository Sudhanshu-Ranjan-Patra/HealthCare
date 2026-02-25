import { Search, Bell, PanelLeft } from "lucide-react";

const Header = ({
  userName = "Dr. Ateeq",
  role = "Physician",
  notificationCount = 3,
}) => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden"
          aria-label="Open menu"
        >
          <PanelLeft size={18} />
        </button>

        <div className="relative hidden w-80 md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search patients, appointments..."
            className="w-full rounded-lg bg-slate-100 py-2 pl-10 pr-4 text-sm outline-none ring-blue-500 transition focus:ring-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <p className="hidden text-xs font-medium text-slate-500 md:block">{today}</p>

        <div className="relative cursor-pointer rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[10px] text-white">
              {notificationCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 md:pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">{role}</p>
          </div>

          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              userName
            )}&background=1e3a8a&color=fff`}
            className="h-10 w-10 rounded-full"
            alt="profile"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
