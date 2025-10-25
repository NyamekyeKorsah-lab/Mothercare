import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(*), suppliers(*)");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["recent-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(*)")
        .order("sale_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const totalStock = products?.reduce((sum, p) => sum + p.quantity, 0) || 0;
  const lowStockItems = products?.filter(p => p.quantity <= p.reorder_level) || [];
  const totalSales = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const totalProducts = products?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your inventory</p>
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
            <div className="text-3xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue generated
            </p>
          </CardContent>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.categories?.category_name}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {product.quantity} / {product.reorder_level} units
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sales && sales.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{sale.products?.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${Number(sale.total_amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
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
