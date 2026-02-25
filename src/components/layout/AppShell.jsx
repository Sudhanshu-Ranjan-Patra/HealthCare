import Sidebar from "./Sidebar";
import Header from "./Header";

const AppShell = ({ children, headerProps }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-700">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header {...headerProps} />
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default AppShell;
