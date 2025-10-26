import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      console.error("Dashboard fetch error:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

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
    <div className="w-full px-2 sm:px-4 md:px-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="text-left ml-1 sm:ml-2 md:ml-0">
        <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Overview of your inventory
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4 w-full">
        {[
          {
            title: "Total Products",
            value: totalProducts,
            icon: <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
            sub: "Active items in stock",
          },
          {
            title: "Total Stock",
            value: totalStock,
            icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />,
            sub: "Units available",
          },
          {
            title: "Low Stock Alerts",
            value: lowStockItems.length,
            icon: <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
            sub: "Items need restock",
          },
          {
            title: "Total Sales",
            value: formatCurrency(totalRevenue),
            icon: <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />,
            sub: `${totalSalesCount} recorded sale${totalSalesCount !== 1 ? "s" : ""}`,
          },
        ].map((item, i) => (
          <Card
            key={i}
            className="flex flex-col justify-center items-start sm:items-center p-3 sm:p-4 rounded-xl shadow-sm w-full overflow-hidden"
          >
            <CardHeader className="flex flex-col items-start sm:items-center justify-center space-y-1 p-0 text-left sm:text-center w-full">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                {item.title} {item.icon}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-left sm:text-center p-0 mt-1 flex flex-col justify-center items-start sm:items-center w-full">
              <div className="font-bold text-lg sm:text-xl md:text-2xl leading-tight break-words text-balance w-full truncate">
                {item.value}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {item.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="shadow-sm w-full sm:w-[98%] ml-1 sm:ml-2 md:ml-0">
          <CardHeader className="px-3 sm:px-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-4">
            {lowStockItems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50"
              >
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">{p.product_name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Reorder level: {p.reorder_level}
                  </p>
                </div>
                <Badge variant="destructive" className="text-[10px] sm:text-xs px-2 py-1">
                  {p.quantity} / {p.reorder_level} units
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Sales */}
      {sales.length > 0 && (
        <Card className="shadow-sm w-full sm:w-[98%] ml-1 sm:ml-2 md:ml-0">
          <CardHeader className="px-3 sm:px-4">
            <CardTitle className="text-sm sm:text-base font-semibold">
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-4">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50"
              >
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">{sale.product_name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm sm:text-base break-words truncate max-w-[80px] sm:max-w-none">
                    {formatCurrency(Number(sale.total_price))}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
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
