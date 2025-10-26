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
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchDashboardData)
      .subscribe();

    const salesChannel = supabase
      .channel("realtime-sales")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(salesChannel);
    };
  }, []);

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockItems = products.filter((p) => p.quantity <= (p.reorder_level || 0));
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const totalSalesCount = sales.length;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-8">
      {/* Header */}
      <div className="text-start px-1 sm:px-2">
        <h1 className="text-3xl font-semibold leading-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your inventory</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {[ 
          { title: "Total Products", value: totalProducts, icon: <Package className="h-5 w-5 text-primary" /> },
          { title: "Total Stock", value: totalStock, icon: <TrendingUp className="h-5 w-5 text-accent" /> },
          { title: "Low Stock Alerts", value: lowStockItems.length, icon: <AlertTriangle className="h-5 w-5 text-destructive" /> },
          { title: "Total Sales", value: formatCurrency(totalRevenue), icon: <DollarSign className="h-5 w-5 text-secondary" /> },
        ].map((item, i) => (
          <Card
            key={i}
            className="w-full shadow-soft flex flex-col justify-center items-center py-4 sm:py-5"
          >
            <CardHeader className="flex flex-col items-center justify-center space-y-1 p-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                {item.title} {item.icon}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center p-0 mt-2">
              <div className="text-2xl sm:text-3xl font-bold break-words">{item.value}</div>
              {item.title === "Total Products" && (
                <p className="text-xs text-muted-foreground mt-1">Active items in stock</p>
              )}
              {item.title === "Total Stock" && (
                <p className="text-xs text-muted-foreground mt-1">Units available</p>
              )}
              {item.title === "Low Stock Alerts" && (
                <p className="text-xs text-muted-foreground mt-1">Items need restock</p>
              )}
              {item.title === "Total Sales" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {totalSalesCount} recorded sale{totalSalesCount !== 1 && "s"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="shadow-card w-full">
          <CardHeader className="px-3 sm:px-4">
            <CardTitle className="flex items-center gap-2 text-start">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:px-4">
            {lowStockItems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="text-start">
                  <p className="font-medium">{p.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Reorder level: {p.reorder_level}
                  </p>
                </div>
                <Badge variant="destructive" className="whitespace-nowrap">
                  {p.quantity} / {p.reorder_level} units
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Sales */}
      {sales.length > 0 && (
        <Card className="shadow-card w-full">
          <CardHeader className="px-3 sm:px-4">
            <CardTitle className="text-start">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 sm:px-4">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="text-start">
                  <p className="font-medium">{sale.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium break-words">
                    {formatCurrency(Number(sale.total_price))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sale.quantity_sold} units
                  </p>
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
