import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

  // ✅ Track user
  const [user, setUser] = useState<any>(null);

  // ✅ List of approved users who can manage categories
  const APPROVED_USERS = [
    "jadidianyamekyekorsah@gmail.com",
    "djanmichael695@gmail.com",
    "admin@mothercare.com",
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  const isApprovedUser = APPROVED_USERS.includes(user?.email);

  // ✅ Fetch categories (sorted alphabetically)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return (data || []).sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
    },
  });

  // ✅ Add category
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!isApprovedUser) {
        toast.error("❌ You do not have permission to add categories.");
        return;
      }
      const { error } = await supabase.from("categories").insert([{ name }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Category added successfully!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowAdd(false);
    },
    onError: (err: any) =>
      toast.error("❌ Failed to add category: " + err.message),
  });

  // ✅ Edit category
  const editCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!isApprovedUser) {
        toast.error("❌ You do not have permission to edit categories.");
        return;
      }
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
      if (!isApprovedUser) {
        toast.error("❌ You do not have permission to delete categories.");
        return;
      }
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
    <div className="space-y-6 px-3 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Categories
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Structured Category Management
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Organize and maintain your product categories efficiently.
          </p>
        </div>

        {/* ✅ Add button only for approved users */}
        {isApprovedUser && (
          <Button
            onClick={() => setShowAdd(true)}
            className="gap-2 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3"
          >
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card className="p-4 sm:p-6 rounded-xl shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-xs sm:text-sm text-gray-500 font-medium">
            Total Categories
          </h3>
          <p className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            {categories.length}
          </p>
        </Card>
      </div>

      {/* Category List */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg font-semibold">
            Category List
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          {categories.length > 0 ? (
            <table className="w-full text-left border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 font-semibold">Category</th>
                  {isApprovedUser && (
                    <th className="py-3 px-4 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: any) => (
                  <tr
                    key={cat.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">{cat.name}</td>

                    {/* ✅ Actions visible only for approved users */}
                    {isApprovedUser && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setShowEdit(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              deleteCategoryMutation.mutate(cat.id)
                            }
                            disabled={deleteCategoryMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-6 text-sm sm:text-base">
              No categories yet. Add one to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Category Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isApprovedUser)
                return toast.error("❌ Unauthorized action.");
              const form = e.target as HTMLFormElement;
              const name = (form.name as any).value.trim();
              if (!name) return toast.error("Name cannot be empty.");
              addCategoryMutation.mutate(name);
              form.reset();
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input name="name" type="text" required className="text-base py-2" />
            </div>
            <Button
              type="submit"
              className="w-full py-3 text-base"
              disabled={addCategoryMutation.isPending}
            >
              {addCategoryMutation.isPending ? "Saving..." : "Save Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isApprovedUser)
                  return toast.error("❌ Unauthorized action.");
                const form = e.target as HTMLFormElement;
                const name = (form.name as any).value.trim();
                if (!name) return toast.error("Name cannot be empty.");
                editCategoryMutation.mutate({
                  id: selectedCategory.id,
                  name,
                });
              }}
              className="space-y-4 py-2"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  name="name"
                  type="text"
                  defaultValue={selectedCategory.name}
                  required
                  className="text-base py-2"
                />
              </div>
              <Button
                type="submit"
                className="w-full py-3 text-base"
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

      {/* Footer */}
      <footer className="text-[11px] text-center text-muted-foreground mt-8 pb-4">
        © {new Date().getFullYear()} Mount Carmel Inventory System
      </footer>
    </div>
  );
}
