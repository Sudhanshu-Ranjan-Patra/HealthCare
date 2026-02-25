import { Search, X } from "lucide-react";
import Button from "../shared/Button";

const PatientFilters = ({
  searchTerm = "",
  setSearchTerm = () => {},
  statusFilter = "all",
  setStatusFilter = () => {},
  resultCount,
}) => {
  const hasFilters = Boolean(searchTerm) || statusFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-slate-100 py-2 pl-10 pr-4 text-sm outline-none ring-blue-500 transition focus:ring-2"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="follow-up">Follow-up</option>
            <option value="discharged">Discharged</option>
          </select>

          {hasFilters && (
            <Button onClick={clearFilters} variant="ghost" className="gap-2">
              <X size={14} />
              Clear
            </Button>
          )}
        </div>

        <p className="text-sm font-medium text-slate-500">
          {typeof resultCount === "number" ? `${resultCount} patient records` : "Patient records"}
        </p>
      </div>
    </div>
  );
};

export default PatientFilters;
