import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase project credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Storage bucket name
export const STORAGE_BUCKET = "product-images";

// Check if credentials are configured
export const isSupabaseConfigured = (): boolean => {
  return (
    SUPABASE_URL.includes("supabase.co") &&
    SUPABASE_ANON_KEY.length > 10
  );
};

// Create client (will work but won't connect without real credentials)
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Helper function to get public URL for images
export const getImageUrl = (path: string): string => {
  if (!path) return "";

  // If it's already a full URL, return as-is
  if (path.startsWith("http")) {
    return path;
  }

  if (!isSupabaseConfigured()) {
    return "";
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to upload image
export const uploadProductImage = async (
  uri: string,
  fileName: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured - cannot upload images");
    return null;
  }

  try {
    // Create a unique file name
    const fileExt = fileName.split(".").pop() || "jpg";
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${uniqueFileName}`;

    // Use FormData for reliable React Native file uploads
    const formData = new FormData();
    formData.append("", {
      uri,
      name: uniqueFileName,
      type: `image/${fileExt === "png" ? "png" : "jpeg"}`,
    } as any);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, formData, {
        contentType: `multipart/form-data`,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

// Helper function to delete image
export const deleteProductImage = async (path: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    if (!path || path.startsWith("http")) return true;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

    if (error) {
      console.error("Error deleting image:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
};
