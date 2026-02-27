import { NavLink } from "react-router-dom";

const baseClassName =
  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition";

const NavItem = ({
  icon,
  label,
  to,
  badge,
  badgeColor = "bg-blue-500",
  disabled = false,
}) => {
  if (disabled || !to) {
    return (
      <div
        className={`${baseClassName} pointer-events-none text-slate-400 cursor-not-allowed`}
        aria-disabled="true"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{label}</span>
        </div>

        {badge && (
          <span className={`text-white text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseClassName} ${
          isActive ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100"
        }`
      }
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>

      {badge && (
        <span className={`text-white text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      )}
    </NavLink>
  );
};

export default NavItem;
