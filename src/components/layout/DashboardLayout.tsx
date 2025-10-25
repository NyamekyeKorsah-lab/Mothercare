import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// Update the import path if Sidebar is located elsewhere, for example:
// If Sidebar.tsx is in the same folder as DashboardLayout.tsx:
import { Sidebar } from "./Sidebar";
// Or create Sidebar.tsx in the same folder if it doesn't exist.

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
