import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/products" element={<DashboardLayout><Products /></DashboardLayout>} />
            <Route path="/categories" element={<DashboardLayout><div className="text-center py-12"><h2 className="text-2xl font-semibold">Categories</h2><p className="text-muted-foreground mt-2">Coming soon</p></div></DashboardLayout>} />
            <Route path="/suppliers" element={<DashboardLayout><div className="text-center py-12"><h2 className="text-2xl font-semibold">Suppliers</h2><p className="text-muted-foreground mt-2">Coming soon</p></div></DashboardLayout>} />
            <Route path="/sales" element={<DashboardLayout><div className="text-center py-12"><h2 className="text-2xl font-semibold">Sales</h2><p className="text-muted-foreground mt-2">Coming soon</p></div></DashboardLayout>} />
            <Route path="/reports" element={<DashboardLayout><div className="text-center py-12"><h2 className="text-2xl font-semibold">Reports</h2><p className="text-muted-foreground mt-2">Coming soon</p></div></DashboardLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
