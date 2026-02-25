import { getInitials } from "../../utils/helpers";

const Avatar = ({ name = "Patient", size = "md" }) => {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 ${sizeClass}`}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
