import { useNavigate } from "react-router-dom";
import { formatDate, getStatusColor, toTitleCase } from "../../utils/helpers";
import Avatar from "../shared/Avatar";

const PatientTable = ({ patients = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-6 py-3 text-left">Patient</th>
              <th className="px-6 py-3 text-left">Age</th>
              <th className="px-6 py-3 text-left">Gender</th>
              <th className="px-6 py-3 text-left">Condition</th>
              <th className="px-6 py-3 text-left">Last Visit</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {patients.length > 0 ? (
              patients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={patient.name} />
                      <div>
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-xs text-slate-400">{patient.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">{patient.age ?? "N/A"}</td>
                  <td className="px-6 py-4">{toTitleCase(patient.gender)}</td>
                  <td className="px-6 py-4">{patient.condition ?? "N/A"}</td>
                  <td className="px-6 py-4">{formatDate(patient.lastVisit)}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                        patient.status
                      )}`}
                    >
                      {toTitleCase(patient.status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-16 text-center">
                  <p className="text-base font-medium text-slate-700">No patients found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing the search term or status filter.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientTable;
