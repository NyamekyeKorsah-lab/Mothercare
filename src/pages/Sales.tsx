import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(amount);

const APPROVED_USERS = [
  "jadidianyamekyekorsah@gmail.com",
  "djanmichael695@gmail.com",
  "admin@mothercare.com",
];

const Sales = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState<number | "">("");
  const [total, setTotal] = useState<number | "">("");
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [user, setUser] = useState<any>(null);

  // ✅ Fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    getUser();
  }, []);

  const isApprovedUser = APPROVED_USERS.includes(user?.email);

  // ✅ Fetch session
  const fetchCurrentSession = async () => {
    const { data, error } = await supabase
      .from("account_sessions")
      .select("*")
      .order("accounted_date", { ascending: false })
      .limit(1)
      .single();
    if (error) setCurrentSession(null);
    else setCurrentSession(data);
  };

  useEffect(() => {
    fetchCurrentSession();
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  // ✅ Create new session + auto report
  const handleMakeAccount = async () => {
    if (!isApprovedUser) return toast.error("❌ You are not authorized to create sessions.");

    try {
      const { data: lastSession } = await supabase
        .from("account_sessions")
        .select("id, accounted_date")
        .order("accounted_date", { ascending: false })
        .limit(1)
        .single();

      if (lastSession) {
        const { data: lastSessionSales } = await supabase
          .from("sales")
          .select("total_price")
          .eq("session_id", lastSession.id);

        if (lastSessionSales?.length > 0) {
          const totalRevenue = lastSessionSales.reduce(
            (sum, s) => sum + Number(s.total_price || 0),
            0
          );
          const totalSales = lastSessionSales.length;

          const { error: reportError } = await supabase.from("reports").insert([{
            date: new Date().toISOString(),
            total_revenue: totalRevenue,
            total_sales: totalSales,
            notes: `Auto report for ${new Date(lastSession.accounted_date).toLocaleDateString()}`,
          }]);

          if (reportError) console.error(reportError.message);
          else toast.success(`📊 Report added: ${totalSales} sales — ₵${totalRevenue.toFixed(2)}`);
        }
      }

      const { data, error } = await supabase
        .from("account_sessions")
        .insert([{ accounted_date: new Date().toISOString() }])
        .select()
        .single();

      if (error) throw error;
      toast.success("✅ New account session created!");
      setCurrentSession(data);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      toast.error("❌ " + err.message);
    }
  };

  // ✅ Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, product_name, unit_price, quantity, status, reorder_level, categories:category_id(name)"
        );
      if (error) throw error;
      return data;
    },
  });

  // ✅ Fetch sales for current session
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", currentSession?.id],
    queryFn: async () => {
      if (!currentSession?.id) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(product_name, categories:category_id(name))")
        .eq("session_id", currentSession.id)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentSession,
  });

  // ✅ Add Sale
  const addSaleMutation = useMutation({
    mutationFn: async (newSale: any) => {
      if (!isApprovedUser) throw new Error("❌ You are not authorized to add sales.");
      if (!currentSession?.id) throw new Error("⚠️ No active session found.");

      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("quantity, status, reorder_level")
        .eq("id", newSale.product_id)
        .single();
      if (fetchError) throw fetchError;

      if (!product) throw new Error("Product not found");
      if (product.status === "Out of Stock" || product.quantity <= 0)
        throw new Error("❌ Product is out of stock!");
      if (newSale.quantity_sold > product.quantity)
        throw new Error("⚠️ Quantity sold exceeds available stock!");

      const newQty = product.quantity - newSale.quantity_sold;
      const newStatus =
        newQty <= 0
          ? "Out of Stock"
          : newQty <= (product.reorder_level ?? 5)
          ? "Low Stock"
          : "In Stock";

      const { error: saleError } = await supabase
        .from("sales")
        .insert([{ ...newSale, session_id: currentSession.id }]);
      if (saleError) throw saleError;

      const { error: updateError } = await supabase
        .from("products")
        .update({ quantity: newQty, status: newStatus })
        .eq("id", newSale.product_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("✅ Sale added & stock updated!");
      setIsOpen(false);
      setSelectedProduct(null);
      setQuantity("");
      setTotal("");
      setLastUpdated(new Date().toLocaleTimeString());
    },
    onError: (err: any) => toast.error("❌ " + err.message),
  });

  // ✅ Delete sale
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isApprovedUser) throw new Error("❌ You are not authorized to delete sales.");
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("🗑️ Sale deleted.");
      setLastUpdated(new Date().toLocaleTimeString());
    },
    onError: (err: any) => toast.error("❌ " + err.message),
  });

  // ✅ Auto-total calculation
  useEffect(() => {
    if (selectedProduct && quantity) {
      const totalValue = Number(selectedProduct.unit_price) * Number(quantity);
      setTotal(Number(totalValue.toFixed(2)));
    } else setTotal("");
  }, [selectedProduct, quantity]);

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const totalSales = sales.length;
  const averageSale = totalSales ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-6 px-3 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Sales
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage daily sales and performance in real time 📈
          </p>
          <p className="text-xs text-muted-foreground italic mt-1">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* ✅ Only approved users can make accounts or add sales */}
        {isApprovedUser && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleMakeAccount} className="bg-green-400 hover:bg-green-500 text-black">
              Make Account
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="px-4 py-2 sm:px-5 sm:py-2">
                  <Plus className="h-4 w-4 mr-1" /> Add Sale
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:rounded-lg">
                <DialogHeader>
                  <DialogTitle>Add New Sale</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedProduct || !quantity)
                      return toast.error("⚠️ Select a product and quantity.");
                    addSaleMutation.mutate({
                      product_id: selectedProduct.id,
                      quantity_sold: Number(quantity),
                      total_price: Number(total),
                    });
                  }}
                  className="space-y-3 py-2"
                >
                  <div>
                    <Label>Product</Label>
                    <Select
                      onValueChange={(val) => {
                        const selected = products.find((p) => p.id === val);
                        setSelectedProduct(selected);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...products]
                          .sort((a, b) => a.product_name.localeCompare(b.product_name))
                          .map((p) =>
                            p.status === "Out of Stock" || p.quantity <= 0 ? (
                              <SelectItem key={p.id} value={p.id} disabled>
                                {p.product_name} — Out of Stock
                              </SelectItem>
                            ) : (
                              <SelectItem key={p.id} value={p.id}>
                                {p.product_name}
                              </SelectItem>
                            )
                          )}

                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Input
                      disabled
                      value={selectedProduct?.categories?.name || ""}
                      placeholder="Auto-filled"
                    />
                  </div>

                  <div>
                    <Label>Quantity Sold</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value ? Number(e.target.value) : "")
                      }
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <Label>Price per unit</Label>
                    <Input
                      disabled
                      value={selectedProduct ? selectedProduct.unit_price : ""}
                      placeholder="Auto-filled"
                    />
                  </div>

                  <div>
                    <Label>Total Price</Label>
                    <Input disabled value={total || ""} placeholder="Auto calculated" />
                  </div>

                  <DialogFooter>
                    <Button type="submit" className="w-full py-3">
                      Save Sale
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-sm rounded-xl border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg sm:text-xl font-semibold tracking-tight">
            {formatCurrency(totalRevenue)}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg sm:text-xl font-semibold tracking-tight">
            {totalSales}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              Average Sale
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg sm:text-xl font-semibold tracking-tight">
            {formatCurrency(averageSale)}
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-semibold">
            Sales Records
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sales.length > 0 ? (
            <table className="w-full border-collapse text-sm text-gray-700">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left">
                  <th className="p-3">Date</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Total</th>
                  {isApprovedUser && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">{sale.products?.product_name}</td>
                    <td className="p-3">
                      {sale.products?.categories?.name || "—"}
                    </td>
                    <td className="p-3 text-center">{sale.quantity_sold}</td>
                    <td className="p-3 text-right">
                      {formatCurrency(sale.total_price)}
                    </td>
                    {isApprovedUser && (
                      <td className="p-3 text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSaleMutation.mutate(sale.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">
              No sales recorded yet for this session.
            </p>
          )}
        </CardContent>
      </Card>

      <footer className="text-[11px] text-center text-muted-foreground mt-8 pb-4">
        © {new Date().getFullYear()} Mount Carmel Inventory System
      </footer>
    </div>
  );
};

export default Sales;
