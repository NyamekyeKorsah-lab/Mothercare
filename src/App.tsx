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
import Sales from "./pages/Sales";
import Categories from "./pages/Categories";
import FoodSales from "./pages/FoodSales";
import Reports from "./pages/Reports";
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
            {/* 🔐 Auth Page */}
            <Route path="/auth" element={<Auth />} />

            {/* 🧭 Dashboard Layout — wraps all main pages */}
            <Route element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="sales" element={<Sales />} />
              <Route path="foodsales" element={<FoodSales />} />

              {/* 🧾 Reports now renders full reports page */}
              <Route path="reports" element={<Reports />} />

              {/* 🧍 Placeholder for future Suppliers page */}
              <Route
                path="suppliers"
                element={
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold">Suppliers</h2>
                    <p className="text-muted-foreground mt-2">Coming soon</p>
                  </div>
                }
              />
            </Route>

            {/* ⚠️ 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
