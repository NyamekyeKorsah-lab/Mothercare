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

const APPROVED_USER = "jadidianyamekyekorsah@gmail.com"; // ✅ added restriction email

const Sales = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState<number | "">("");
  const [total, setTotal] = useState<number | "">("");
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [user, setUser] = useState<any>(null); // ✅ added user state

  // ✅ Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    getUser();
  }, []);

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

  const handleMakeAccount = async () => {
    const { data, error } = await supabase
      .from("account_sessions")
      .insert([{ accounted_date: new Date().toISOString() }])
      .select()
      .single();

    if (error) toast.error("❌ Failed to make account: " + error.message);
    else {
      toast.success("✅ New account session created!");
      setCurrentSession(data);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setLastUpdated(new Date().toLocaleTimeString());
    }
  };

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

  const addSaleMutation = useMutation({
    mutationFn: async (newSale: any) => {
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

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
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

  useEffect(() => {
    if (selectedProduct && quantity) {
      const totalValue = Number(selectedProduct.unit_price) * Number(quantity);
      setTotal(Number(totalValue.toFixed(2)));
    } else setTotal("");
  }, [selectedProduct, quantity]);

  useEffect(() => {
    fetchCurrentSession();
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const totalSales = sales.length;
  const averageSale = totalSales ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-6 px-3 sm:px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Sales
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Comprehensive Sales Management
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Track revenue, transactions, and performance in real time.
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 italic">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* ✅ Restrict access to Add and Make Account */}
        {user?.email === APPROVED_USER && (
          <div className="flex flex-row lg:flex-col lg:items-end gap-2 flex-wrap lg:flex-nowrap">
            <Button onClick={handleMakeAccount} variant="outline">
              Make Account
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="bg-rose-200 text-black hover:bg-rose-300"
                >
                  📜 View Old Sales
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Previous Account Sessions</DialogTitle>
                </DialogHeader>
                <OldSalesList currentSessionId={currentSession?.id} />
              </DialogContent>
            </Dialog>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Sale
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
                <DialogHeader>
                  <DialogTitle>Add New Sale</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedProduct || !quantity) {
                      toast.error("⚠️ Select a product and quantity.");
                      return;
                    }
                    addSaleMutation.mutate({
                      product_id: selectedProduct.id,
                      quantity_sold: Number(quantity),
                      total_price: Number(total),
                    });
                  }}
                  className="space-y-4 py-2"
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
                        {products.map((p) =>
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
                    <Input
                      disabled
                      value={total || ""}
                      placeholder="Auto calculated"
                    />
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

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { title: "Total Revenue", value: formatCurrency(totalRevenue), sub: `${totalSales} sales total` },
          { title: "Total Sales", value: totalSales, sub: "Recorded sales" },
          { title: "Average Sale", value: formatCurrency(averageSale), sub: "Per transaction" },
        ].map((item, i) => (
          <Card key={i} className="p-4 text-center shadow-md rounded-xl border border-gray-100 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg font-semibold">
            Sales Records
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          {sales.length > 0 ? (
            <table className="w-full border-collapse text-sm text-gray-700">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left">
                  <th className="p-3">Date</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Total</th>
                  {user?.email === APPROVED_USER && (
                    <th className="p-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">{sale.products?.product_name}</td>
                    <td className="p-3">
                      {sale.products?.categories?.name || "—"}
                    </td>
                    <td className="p-3 text-center">
                      {sale.quantity_sold}
                    </td>
                    <td className="p-3 text-right">
                      {formatCurrency(sale.total_price)}
                    </td>
                    {user?.email === APPROVED_USER && (
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

/* ---------- Old Sales List ---------- */
const OldSalesList = ({ currentSessionId }: { currentSessionId?: string }) => {
  const [sessionsWithSales, setSessionsWithSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessionsWithSales();
  }, [currentSessionId]);

  const fetchSessionsWithSales = async () => {
    setLoading(true);
    const { data: sessions } = await supabase
      .from("account_sessions")
      .select("id, accounted_date")
      .neq("id", currentSessionId)
      .order("accounted_date", { ascending: false });

    const result = await Promise.all(
      (sessions || []).map(async (s) => {
        const { data: sales } = await supabase
          .from("sales")
          .select("*, products(product_name, categories:category_id(name))")
          .eq("session_id", s.id);
        const totalRevenue = (sales || []).reduce(
          (sum, sale) => sum + Number(sale.total_price || 0),
          0
        );
        return { ...s, sales, totalRevenue };
      })
    );
    setSessionsWithSales(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-center text-sm text-muted-foreground">
          Loading previous sessions...
        </p>
      ) : sessionsWithSales.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No previous sales sessions found.
        </p>
      ) : (
        sessionsWithSales.map((session) => (
          <div
            key={session.id}
            className="border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-base mb-3">
              Session — {new Date(session.accounted_date).toLocaleString()}
            </h3>
            {session.sales.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="p-2">Date</th>
                        <th className="p-2">Product</th>
                        <th className="p-2">Category</th>
                        <th className="p-2 text-center">Quantity</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.sales.map((sale: any) => (
                        <tr key={sale.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-2">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            {sale.products?.product_name || "N/A"}
                          </td>
                          <td className="p-2">
                            {sale.products?.categories?.name || "—"}
                          </td>
                          <td className="p-2 text-center">
                            {sale.quantity_sold}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(sale.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-semibold mt-2">
                  Total Revenue: {formatCurrency(session.totalRevenue)}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No sales recorded for this session.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Sales;
