const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  ghost: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
};

const Button = ({
  type = "button",
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
