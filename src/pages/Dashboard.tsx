import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

const Dashboard = () => {
  const queryClient = useQueryClient();

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(*), suppliers(*)");
    if (error) throw error;
    return data || [];
  };

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*, products(*)")
      .order("sale_date", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data || [];
  };

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    retry: 2, // retry twice if first fetch fails
  });

  const { data: sales = [], refetch: refetchSales } = useQuery({
    queryKey: ["recent-sales"],
    queryFn: fetchSales,
    retry: 2,
  });

  // 🔁 Auto-refresh on mount (fixes empty dashboard issue)
  useEffect(() => {
    const refreshData = async () => {
      if (!products?.length) await refetchProducts();
      if (!sales?.length) await refetchSales();
    };
    refreshData();

    // Optional: Re-fetch every 30 seconds to keep dashboard live
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [products, sales, refetchProducts, refetchSales]);

  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockItems = products.filter((p) => p.quantity <= p.reorder_level);
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalProducts = products.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your inventory
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active items in stock
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Units available
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items need restock
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">GHS {totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue generated
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
