import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Categories() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // ✅ Fetch categories from Supabase
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // ✅ Add category
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("categories").insert([{ name }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Category added successfully!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowAdd(false);
    },
    onError: (err: any) => toast.error("❌ Failed to add category: " + err.message),
  });

  // ✅ Edit category
  const editCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("categories")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✏️ Category updated!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowEdit(false);
    },
    onError: (err: any) => toast.error("❌ Failed to update: " + err.message),
  });

  // ✅ Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("🗑️ Category deleted!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => toast.error("❌ Failed to delete: " + err.message),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Categories
          </h1>
          <p className="text-gray-500">
            Organize your products into clean, structured categories
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-sm text-gray-500 font-medium">
            Total Categories
          </h3>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {categories.length}
          </p>
        </Card>
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-800 p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-3 px-4 text-sm font-semibold">Category</th>
              <th className="py-3 px-4 text-sm font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat: any) => (
              <tr
                key={cat.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="py-3 px-4">{cat.name}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowEdit(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteCategoryMutation.mutate(cat.id)}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <p className="text-center text-gray-500 py-6">
            No categories yet. Add one to get started.
          </p>
        )}
      </div>

      {/* Add Category Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.name as any).value;
              addCategoryMutation.mutate(name);
              form.reset();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input name="name" type="text" required />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={addCategoryMutation.isPending}
            >
              {addCategoryMutation.isPending ? "Saving..." : "Save Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.name as any).value;
                editCategoryMutation.mutate({
                  id: selectedCategory.id,
                  name,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  name="name"
                  type="text"
                  defaultValue={selectedCategory.name}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={editCategoryMutation.isPending}
              >
                {editCategoryMutation.isPending
                  ? "Updating..."
                  : "Update Category"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
