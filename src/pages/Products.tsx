import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [reorderLevel, setReorderLevel] = useState<string>("5");
  const [categoryId, setCategoryId] = useState<string>("");

  // Fetch products (with categories)
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories:category_id(name)")
        .order("product_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Add Product
  const addProductMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert([
        {
          product_name: productName,
          quantity: Number(quantity) || 0,
          unit_price: Number(unitPrice) || 0,
          reorder_level: Number(reorderLevel) || 0,
          category_id: categoryId || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("✅ Product added successfully!");
      resetForm();
    },
    onError: (err: any) => toast.error("❌ Failed to add product: " + err.message),
  });

  // Edit Product
  const editProductMutation = useMutation({
    mutationFn: async () => {
      if (!editingProduct) return;
      const { error } = await supabase
        .from("products")
        .update({
          product_name: productName,
          quantity: Number(quantity),
          unit_price: Number(unitPrice),
          reorder_level: Number(reorderLevel),
          category_id: categoryId || null,
        })
        .eq("id", editingProduct.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("✏️ Product updated successfully!");
      resetForm();
    },
    onError: (err: any) => toast.error("❌ Failed to update product: " + err.message),
  });

  // Delete Product
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("🗑️ Product deleted successfully");
    },
    onError: () => toast.error("❌ Failed to delete product"),
  });

  const resetForm = () => {
    setOpen(false);
    setEditOpen(false);
    setEditingProduct(null);
    setProductName("");
    setQuantity("");
    setUnitPrice("");
    setReorderLevel("5");
    setCategoryId("");
  };

  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setProductName(product.product_name);
    setQuantity(String(product.quantity));
    setUnitPrice(String(product.unit_price));
    setReorderLevel(String(product.reorder_level));
    setCategoryId(product.category_id || "");
    setEditOpen(true);
  };

  const filteredProducts = products?.filter((p) =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 px-3 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 mb-8 leading-snug break-words">
            Manage your product inventory <br className="block sm:hidden" /> 📦
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 mt-1 sm:mt-0">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md sm:rounded-lg sm:max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label>Product Name</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />

              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />

              <Label>Unit Price (₵)</Label>
              <Input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />

              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />

              <Button
                className="w-full mt-3"
                onClick={() => addProductMutation.mutate()}
                disabled={addProductMutation.isPending}
              >
                {addProductMutation.isPending ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Product List</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-10 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto px-0">
          {filteredProducts?.length ? (
            <table className="w-full text-left border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">{product.product_name}</td>
                    <td className="py-3 px-4">{product.categories?.name || "—"}</td>
                    <td className="py-3 px-4">{product.quantity}</td>
                    <td className="py-3 px-4">₵{product.unit_price.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      {product.quantity <= product.reorder_level ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white">In Stock</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
              No products found. Add your first product to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;
