import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const APPROVED_USERS = [
  "jadidianyamekyekorsah@gmail.com",
  "foodmanager@gmail.com",
  "staff@mountcarmel.com",
];

const FoodSales = () => {
  const [open, setOpen] = useState(false);
  const [foodItem, setFoodItem] = useState<any>(null);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [foods, setFoods] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const queryClient = useQueryClient();

  // ✅ Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  // ✅ Get current weekday and set daily menu logic
  const getMenuForToday = (day: string) => {
    switch (day) {
      case "Monday":
        return ["Plain Rice", "Banku and Pepper"];
      case "Tuesday":
        return ["Jollof", "Beans"];
      case "Wednesday":
        return ["Fufu", "Plain Rice"];
      case "Thursday":
        return ["Banku and Pepper", "Plain Rice", "Yam"];
      case "Friday":
        return ["Banku and Okro", "Plain Rice"];
      case "Saturday":
        return ["Fufu", "Jollof"];
      case "Sunday":
        return ["Fufu", "Plain Rice"];
      default:
        return [];
    }
  };

  // ✅ Fetch foods from Supabase and filter for today
  useEffect(() => {
    const fetchFoods = async () => {
      const { data, error } = await supabase
        .from("food_items")
        .select("id, name, price, category")
        .order("name", { ascending: true });

      if (error) {
        toast.error("❌ Failed to load food items");
        return;
      }

      const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
      const todayMenu = getMenuForToday(dayName);

      const filteredFoods = data?.filter((f) => todayMenu.includes(f.name)) || [];
      setFoods(filteredFoods);
    };
    fetchFoods();
  }, []);

  // ✅ Fetch current kitchen session
  const fetchCurrentSession = async () => {
    const { data, error } = await supabase
      .from("kitchen_sessions")
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

  // ✅ Fetch all food sales for this session
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["food_sales", currentSession?.id],
    queryFn: async () => {
      if (!currentSession?.id) return [];
      const { data, error } = await supabase
        .from("food_sales")
        .select("*, food_items(name)")
        .eq("session_id", currentSession.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentSession,
  });

  // ✅ Add Sale
  const addSaleMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession?.id) throw new Error("No active kitchen account.");
      if (!foodItem) throw new Error("Please select a food item.");

      const { error } = await supabase.from("food_sales").insert([
        {
          food_item_id: foodItem.id,
          food_name: foodItem.name,
          price: Number(foodItem.price),
          quantity: Number(quantity),
          session_id: currentSession.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Food sale added successfully!");
      queryClient.invalidateQueries({ queryKey: ["food_sales"] });
      setOpen(false);
      setFoodItem(null);
      setQuantity("");
      setPrice("");
    },
    onError: (err: any) => toast.error("❌ Failed to add sale: " + err.message),
  });

  // ✅ Create new kitchen account session
  const handleMakeKitchenAccount = async () => {
    try {
      if (currentSession && sales.length > 0) {
        const totalRevenue = sales.reduce(
          (sum, s) => sum + s.price * s.quantity,
          0
        );
        const totalSales = sales.length;
        await supabase.from("kitchen_reports").insert([
          {
            session_id: currentSession.id,
            total_revenue: totalRevenue,
            total_sales: totalSales,
          },
        ]);
      }

      const { data, error } = await supabase
        .from("kitchen_sessions")
        .insert([{ accounted_date: new Date().toISOString() }])
        .select()
        .single();

      if (error) throw error;
      toast.success("✅ New kitchen account session created!");
      setCurrentSession(data);
      queryClient.invalidateQueries({ queryKey: ["food_sales"] });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      toast.error("❌ Failed: " + err.message);
    }
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const totalSales = sales.length;
  const isApproved = APPROVED_USERS.includes(user?.email || "");

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayMenu = getMenuForToday(todayName);

  return (
    <div className="space-y-6 px-3 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Food Sales</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-snug">
            Manage your restaurant daily food sales 🍛
          </p>
          <p className="text-xs text-muted-foreground italic mt-1">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="flex gap-2">
          {isApproved && (
            <Button
              onClick={handleMakeKitchenAccount}
              className="bg-green-400 hover:bg-green-500 text-black"
            >
              Make Kitchen Account
            </Button>
          )}
          {isApproved && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base">
                  <Plus className="h-4 w-4 mr-1" /> Add Sale
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:rounded-lg">
                <DialogHeader>
                  <DialogTitle>Add New Food Sale</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  {/* Food dropdown */}
                  <Label>Food Name</Label>
                  <Select
                    onValueChange={(id) => {
                      const selected = foods.find((f) => f.id === id);
                      setFoodItem(selected);
                      setPrice(selected?.price || "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Food" />
                    </SelectTrigger>
                    <SelectContent>
                      {foods.map((food) => (
                        <SelectItem key={food.id} value={food.id}>
                          {food.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Quantity */}
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />

                  {/* Auto Price */}
                  <Label>Price (₵)</Label>
                  <Input type="number" value={price} disabled />

                  <Button
                    className="w-full mt-2"
                    onClick={() => addSaleMutation.mutate()}
                    disabled={addSaleMutation.isPending}
                  >
                    {addSaleMutation.isPending ? "Saving..." : "Save Sale"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* 🧾 Today's Menu */}
      <div className="bg-muted/30 border rounded-xl p-4 text-sm">
        <p className="font-semibold text-gray-700">
          🍽️ Today's Menu ({todayName}):
        </p>
        <p className="mt-1 text-muted-foreground">
          {todayMenu.join(", ")}
        </p>
      </div>

      {/* Summary Cards (Dashboard Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-sm rounded-xl border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg sm:text-xl font-semibold tracking-tight">
            ₵{totalRevenue.toFixed(2)}
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
      </div>

      {/* Sales Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Recent Food Sales</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-center py-4 text-muted-foreground">Loading...</p>
          ) : sales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Food Name</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Price (₵)</TableHead>
                  <TableHead className="text-center">Total (₵)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.food_name || "—"}</TableCell>
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell className="text-center">{sale.price.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {(sale.quantity * sale.price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground text-sm sm:text-base">
              No food sales found. Add your first sale to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FoodSales;
