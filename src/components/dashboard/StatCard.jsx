
import { Activity } from "lucide-react";

const StatCard = ({ label, value, trend, icon, trendDown }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-start shadow-sm">
    <div className="space-y-1">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className={`text-xs font-bold ${trendDown ? 'text-red-500' : 'text-emerald-500'}`}>
        {trendDown ? '↓' : '↑'} {trend} <span className="text-slate-400 font-normal">vs last month</span>
      </p>
    </div>
    <div className="p-3 bg-blue-50 rounded-xl">
      {icon || <Activity className="text-blue-500" size={18} />}
    </div>
  </div>
);

export default StatCard;
