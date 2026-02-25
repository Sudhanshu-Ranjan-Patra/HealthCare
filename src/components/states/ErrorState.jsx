const ErrorState = ({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
}) => {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-800">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
