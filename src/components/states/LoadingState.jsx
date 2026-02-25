const LoadingState = ({ label = "Loading..." }) => {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 text-slate-600">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <p className="font-medium">{label}</p>
      </div>
    </div>
  );
};

export default LoadingState;
