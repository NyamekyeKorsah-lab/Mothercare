import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const { data: prodData, error: prodError } = await supabase
        .from("products")
        .select("*");
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

  const totalProducts = products.length;
  const totalStock = products.reduce(
    (sum, p) => sum + (p.quantity || 0),
    0
  );
  const lowStockItems = products.filter(
    (p) => p.quantity <= (p.reorder_level || 0)
  );
  const totalSales = sales.reduce(
    (sum, s) => sum + Number(s.total_amount || 0),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);

  return (
    <div className="space-y-6 px-3 sm:px-6 md:px-8 pb-8">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Overview of your inventory
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl sm:text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active items in stock
            </p>
          </CardContent>
        </Card>

        {/* Total Stock */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl sm:text-3xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Units available
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl sm:text-3xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items need restock
            </p>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl sm:text-3xl font-bold">
              {formatCurrency(totalSales)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue generated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Section */}
      {lowStockItems.length > 0 && (
        <Card className="shadow border border-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockItems.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="text-center sm:text-left">
                  <p className="font-medium text-sm sm:text-base">{p.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Reorder level: {p.reorder_level}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <Badge variant="destructive" className="text-xs sm:text-sm">
                    {p.quantity} / {p.reorder_level} units
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
