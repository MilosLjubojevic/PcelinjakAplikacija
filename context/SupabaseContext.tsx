import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase, deleteProductImage, isSupabaseConfigured } from "../utils/supabase";
import {
  Product,
  ProductPriceOption,
  ProductWithOptions,
  Order,
  OrderItem,
  OrderWithItems,
  AllowedEmail,
} from "../types";

interface SupabaseContextType {
  // Configuration status
  isConfigured: boolean;

  // Products
  products: ProductWithOptions[];
  productsLoading: boolean;
  productsError: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, "id">) => Promise<Product | null>;
  updateProduct: (id: number, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;

  // Price Options
  addPriceOption: (option: Omit<ProductPriceOption, "id">) => Promise<ProductPriceOption | null>;
  updatePriceOption: (id: number, updates: Partial<ProductPriceOption>) => Promise<boolean>;
  deletePriceOption: (id: number) => Promise<boolean>;

  // Orders
  orders: OrderWithItems[];
  ordersLoading: boolean;
  ordersError: string | null;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (id: number, sent: boolean) => Promise<boolean>;
  deleteOrder: (id: number) => Promise<boolean>;

  // Allowed Emails
  allowedEmails: AllowedEmail[];
  allowedEmailsLoading: boolean;
  allowedEmailsError: string | null;
  fetchAllowedEmails: () => Promise<void>;
  addAllowedEmail: (email: string) => Promise<AllowedEmail | null>;
  deleteAllowedEmail: (id: number) => Promise<boolean>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  // Products state
  const [products, setProducts] = useState<ProductWithOptions[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Allowed emails state
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [allowedEmailsLoading, setAllowedEmailsLoading] = useState(false);
  const [allowedEmailsError, setAllowedEmailsError] = useState<string | null>(null);

  // Fetch all products with their price options
  const fetchProducts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProductsError("Supabase nije konfigurisan. Dodajte kredencijale u utils/supabase.ts");
      return;
    }

    setProductsLoading(true);
    setProductsError(null);

    try {
      // Fetch products
      const { data: productsData, error: productsErr } = await supabase
        .from("Products")
        .select("*")
        .order("id", { ascending: true });

      if (productsErr) throw productsErr;

      // Fetch all price options
      const { data: optionsData, error: optionsErr } = await supabase
        .from("Product_price_options")
        .select("*")
        .order("id", { ascending: true });

      if (optionsErr) throw optionsErr;

      // Combine products with their options
      const productsWithOptions: ProductWithOptions[] = (productsData || []).map((product) => ({
        ...product,
        price_options: (optionsData || []).filter((opt) => opt.product_id === product.id),
      }));

      setProducts(productsWithOptions);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      setProductsError(error.message || "Failed to fetch products");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Add new product
  const addProduct = useCallback(async (product: Omit<Product, "id">): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from("Products")
        .insert([product])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProducts((prev) => [...prev, { ...data, price_options: [] }]);
      return data;
    } catch (error: any) {
      console.error("Error adding product:", error);
      return null;
    }
  }, []);

  // Update product
  const updateProduct = useCallback(async (id: number, updates: Partial<Product>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("Products")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      return true;
    } catch (error: any) {
      console.error("Error updating product:", error);
      return false;
    }
  }, []);

  // Delete product
  const deleteProduct = useCallback(async (id: number): Promise<boolean> => {
    try {
      // Get the product to delete its image
      const product = products.find((p) => p.id === id);

      // Delete price options first (due to foreign key)
      const { error: optionsErr } = await supabase
        .from("Product_price_options")
        .delete()
        .eq("product_id", id);

      if (optionsErr) throw optionsErr;

      // Delete the product
      const { error } = await supabase.from("Products").delete().eq("id", id);

      if (error) throw error;

      // Delete image from storage if exists
      if (product?.image) {
        await deleteProductImage(product.image);
      }

      // Update local state
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (error: any) {
      console.error("Error deleting product:", error);
      return false;
    }
  }, [products]);

  // Add price option
  const addPriceOption = useCallback(
    async (option: Omit<ProductPriceOption, "id">): Promise<ProductPriceOption | null> => {
      try {
        const { data, error } = await supabase
          .from("Product_price_options")
          .insert([option])
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setProducts((prev) =>
          prev.map((p) =>
            p.id === option.product_id
              ? { ...p, price_options: [...p.price_options, data] }
              : p
          )
        );
        return data;
      } catch (error: any) {
        console.error("Error adding price option:", error);
        return null;
      }
    },
    []
  );

  // Update price option
  const updatePriceOption = useCallback(
    async (id: number, updates: Partial<ProductPriceOption>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("Product_price_options")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        // Update local state
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            price_options: p.price_options.map((opt) =>
              opt.id === id ? { ...opt, ...updates } : opt
            ),
          }))
        );
        return true;
      } catch (error: any) {
        console.error("Error updating price option:", error);
        return false;
      }
    },
    []
  );

  // Delete price option
  const deletePriceOption = useCallback(async (id: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("Product_price_options")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          price_options: p.price_options.filter((opt) => opt.id !== id),
        }))
      );
      return true;
    } catch (error: any) {
      console.error("Error deleting price option:", error);
      return false;
    }
  }, []);

  // Fetch all orders with items
  const fetchOrders = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setOrdersError("Supabase nije konfigurisan. Dodajte kredencijale u utils/supabase.ts");
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);

    try {
      // Fetch orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from("Orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;

      // Fetch all order items
      const { data: itemsData, error: itemsErr } = await supabase
        .from("Order_items")
        .select("*");

      if (itemsErr) throw itemsErr;

      // Fetch products and price options for reference
      const { data: productsData } = await supabase.from("Products").select("*");
      const { data: optionsData } = await supabase.from("Product_price_options").select("*");

      // Combine orders with items and calculate totals
      const ordersWithItems: OrderWithItems[] = (ordersData || []).map((order) => {
        const orderItems = (itemsData || [])
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            product: productsData?.find((p) => p.id === item.product_id),
            price_option: optionsData?.find((o) => o.id === item.product_price_option),
          }));

        const total = orderItems.reduce((sum, item) => {
          const price = parseFloat(item.price_option?.price || "0");
          return sum + price * item.quantity;
        }, 0);

        return {
          ...order,
          items: orderItems,
          total,
        };
      });

      setOrders(ordersWithItems);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setOrdersError(error.message || "Failed to fetch orders");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Update order status
  const updateOrderStatus = useCallback(async (id: number, sent: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("Orders")
        .update({ sent })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, sent } : o))
      );
      return true;
    } catch (error: any) {
      console.error("Error updating order status:", error);
      return false;
    }
  }, []);

  // Delete order
  const deleteOrder = useCallback(async (id: number): Promise<boolean> => {
    try {
      // Delete order items first
      const { error: itemsErr } = await supabase
        .from("Order_items")
        .delete()
        .eq("order_id", id);

      if (itemsErr) throw itemsErr;

      // Delete the order
      const { error } = await supabase.from("Orders").delete().eq("id", id);

      if (error) throw error;

      // Update local state
      setOrders((prev) => prev.filter((o) => o.id !== id));
      return true;
    } catch (error: any) {
      console.error("Error deleting order:", error);
      return false;
    }
  }, []);

  // Fetch allowed emails
  const fetchAllowedEmails = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAllowedEmailsError("Supabase nije konfigurisan.");
      return;
    }

    setAllowedEmailsLoading(true);
    setAllowedEmailsError(null);

    try {
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllowedEmails(data || []);
    } catch (error: any) {
      console.error("Error fetching allowed emails:", error);
      setAllowedEmailsError(error.message || "Failed to fetch allowed emails");
    } finally {
      setAllowedEmailsLoading(false);
    }
  }, []);

  // Add allowed email
  const addAllowedEmail = useCallback(async (email: string): Promise<AllowedEmail | null> => {
    try {
      const { data, error } = await supabase
        .from("allowed_emails")
        .insert([{ email }])
        .select()
        .single();

      if (error) throw error;

      setAllowedEmails((prev) => [data, ...prev]);
      return data;
    } catch (error: any) {
      console.error("Error adding allowed email:", error);
      return null;
    }
  }, []);

  // Delete allowed email
  const deleteAllowedEmail = useCallback(async (id: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("allowed_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAllowedEmails((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch (error: any) {
      console.error("Error deleting allowed email:", error);
      return false;
    }
  }, []);

  const value: SupabaseContextType = {
    isConfigured: isSupabaseConfigured(),
    products,
    productsLoading,
    productsError,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addPriceOption,
    updatePriceOption,
    deletePriceOption,
    orders,
    ordersLoading,
    ordersError,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
    allowedEmails,
    allowedEmailsLoading,
    allowedEmailsError,
    fetchAllowedEmails,
    addAllowedEmail,
    deleteAllowedEmail,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
}
