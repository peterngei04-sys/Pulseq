import { supabase } from "../lib/supabase";

export const uploadImage = async (file) => {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from("post-images") // ✅ fixed: was "posts-images" (typo)
    .upload(filePath, file);

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from("post-images") // ✅ fixed here too
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};
