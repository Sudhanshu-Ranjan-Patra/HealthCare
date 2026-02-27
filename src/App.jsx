import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import Login from "./pages/Login";
import FamilyDashboard from "./pages/FamilyDashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

const DefaultRoute = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user?.role === "FAMILY" ? "/family/dashboard" : "/admin/dashboard"} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DefaultRoute />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/patients"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
              <Patients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/patients/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
              <PatientDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/family/dashboard"
          element={
            <ProtectedRoute allowedRoles={["FAMILY"]}>
              <FamilyDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<DefaultRoute />} />
      </Routes>
    </Router>
  );
}

export default App;
