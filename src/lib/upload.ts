// رفع الملفات/الصور إلى Cloudinary (رفع غير موقّع — بلا خادم)
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const MAX_BYTES = 10 * 1024 * 1024; // 10 ميجابايت

export interface Uploaded {
  url: string;
  kind: "image" | "file";
  name: string;
}

export async function uploadFile(file: File): Promise<Uploaded> {
  if (!CLOUD || !PRESET) {
    throw new Error(
      "Cloudinary غير مُعدّ. أضف NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME و NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET في Vercel."
    );
  }
  if (file.size > MAX_BYTES) throw new Error("الحجم الأقصى 10 ميجابايت.");

  const isImage = file.type.startsWith("image/");
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("فشل رفع الملف. حاول مجدداً.");
  const data = await res.json();
  return { url: data.secure_url as string, kind: isImage ? "image" : "file", name: file.name };
}
