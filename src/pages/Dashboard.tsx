import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  // ✅ Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const { data: prodData, error: prodError } = await supabase.from("products").select("*");
      if (prodError) throw prodError;
      setProducts(prodData || []);

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false })
        .limit(10);
      if (salesError) throw salesError;
      setSales(salesData || []);
    } catch (err) {
      console.error("❌ Dashboard fetch error:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const productChannel = supabase
      .channel("realtime-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchDashboardData();
          toast.info("🔄 Product data updated!");
        }
      )
      .subscribe();

    const salesChannel = supabase
      .channel("realtime-sales")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => {
          fetchDashboardData();
          toast.info("💰 Sales data updated!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(salesChannel);
    };
  }, []);

  // ✅ Calculations
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockItems = products.filter((p) => p.quantity <= (p.reorder_level || 0));
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const totalSalesCount = sales.length;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);

  return (
    <div className="space-y-6 px-2 sm:px-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          Overview of your inventory
        </p>
      </div>

      {/* ✅ Summary Cards — 3 to 4 cards per row on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* Total Products */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-md h-full flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalProducts}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              Active items in stock
            </p>
          </CardContent>
        </Card>

        {/* Total Stock */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-md h-full flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Stock
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalStock}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              Units available
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-md h-full flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              Items need restock
            </p>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card className="p-3 sm:p-4 rounded-xl shadow-md h-full flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              {totalSalesCount} recorded sale{totalSalesCount !== 1 && "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Low Stock Details */}
      {lowStockItems.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm sm:text-base">{p.product_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Reorder level: {p.reorder_level}
                    </p>
                  </div>
                  <Badge variant="destructive" className="self-start sm:self-center">
                    {p.quantity} / {p.reorder_level} units
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Recent Sales */}
      {sales.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm sm:text-base">{sale.product_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm sm:text-base">
                      {formatCurrency(Number(sale.total_price))}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {sale.quantity_sold} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
