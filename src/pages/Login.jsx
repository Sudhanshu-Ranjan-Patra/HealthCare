import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login, familyLogin, familyRegister, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [patientId, setPatientId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [relation, setRelation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return (
      <Navigate
        to={user?.role === "FAMILY" ? "/family/dashboard" : "/admin/dashboard"}
        replace
      />
    );
  }

  const navigateAfterAuth = (loggedInUser) => {
    const target =
      location.state?.from?.pathname ||
      (loggedInUser.role === "FAMILY" ? "/family/dashboard" : "/admin/dashboard");
    navigate(target, { replace: true });
  };

  const onStaffSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loggedInUser = await login(email, password);
      navigateAfterAuth(loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onFamilyLoginSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loggedInUser = await familyLogin(patientId, phoneNumber, password);
      navigateAfterAuth(loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Family login failed");
    } finally {
      setLoading(false);
    }
  };

  const onFamilyRegisterSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loggedInUser = await familyRegister({
        patientId,
        phoneNumber,
        password,
        name: familyName,
        relation,
      });
      navigateAfterAuth(loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Family registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cyan-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Activity className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">MediCare Pro</h1>
            <p className="text-sm text-slate-500">Real-time MongoDB authentication</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("staff")}
            className={`rounded-md px-2 py-2 ${mode === "staff" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
          >
            Staff Login
          </button>
          <button
            type="button"
            onClick={() => setMode("family-login")}
            className={`rounded-md px-2 py-2 ${mode === "family-login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
          >
            Family Login
          </button>
          <button
            type="button"
            onClick={() => setMode("family-register")}
            className={`rounded-md px-2 py-2 ${mode === "family-register" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
          >
            Family Register
          </button>
        </div>

        {mode === "staff" && (
          <form className="space-y-4" onSubmit={onStaffSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {mode === "family-login" && (
          <form className="space-y-4" onSubmit={onFamilyLoginSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient ID</label>
              <input
                value={patientId}
                onChange={(event) => setPatientId(event.target.value.toUpperCase())}
                type="text"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="PT001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Family Phone Number</label>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                type="text"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="+1-555-2001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Family Sign In"}
            </button>
          </form>
        )}

        {mode === "family-register" && (
          <form className="space-y-4" onSubmit={onFamilyRegisterSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient ID</label>
              <input
                value={patientId}
                onChange={(event) => setPatientId(event.target.value.toUpperCase())}
                type="text"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="PT001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Family Phone Number</label>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                type="text"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="+1-555-2001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name (optional)</label>
              <input
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="Parent Name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Relation (optional)</label>
              <input
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="Parent / Sibling"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="Create password"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Family Account"}
            </button>
          </form>
        )}

        <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold">Demo staff login:</p>
          <p>admin@medicare.local / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
