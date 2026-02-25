import { CircleCheck, Clock3, ShieldAlert } from "lucide-react";

const rows = [
  {
    id: "care-plan",
    label: "Care Plan Adherence",
    value: "92%",
    tone: "text-emerald-600",
    icon: CircleCheck,
  },
  {
    id: "avg-response",
    label: "Avg Alert Response",
    value: "4m 20s",
    tone: "text-amber-600",
    icon: Clock3,
  },
  {
    id: "critical-alerts",
    label: "Critical Alerts (24h)",
    value: "3",
    tone: "text-red-600",
    icon: ShieldAlert,
  },
];

const PerformanceCard = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">Clinical Performance</h3>
      <p className="mt-1 text-xs text-slate-500">Operational quality metrics from the last 24 hours</p>

      <div className="mt-4 space-y-3">
        {rows.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-slate-500" />
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
              </div>
              <p className={`text-sm font-semibold ${item.tone}`}>{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceCard;
