// تحضير المرفقات بلا أي خدمة خارجية: الصور تُضغط، والكل يُحوّل إلى base64
const MAX_IMAGE_SRC = 15 * 1024 * 1024; // 15MB مصدر الصورة (تُضغط بعدها)
const MAX_FILE = 5 * 1024 * 1024; // 5MB حد عملي لـ base64 في RTDB

export interface Prepared {
  kind: "image" | "file";
  name: string;
  dataUrl: string;
}

/* نسخة مصغّرة + نسخة كاملة.
   المصغّرة وحدها تُحمَّل في قائمة المنشورات، والكاملة عند التكبير فقط.
   هذا يقلّل استهلاك حصّة التنزيل إلى نحو الخُمس. */
export interface PreparedImage {
  name: string;
  thumb: string;   // ~400px  — للعرض في القائمة
  full: string;    // ~1400px — عند التكبير أو التحميل
}

export async function prepareImagePair(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("الملف ليس صورة.");
  if (file.size > MAX_IMAGE_SRC) throw new Error("الصورة كبيرة جداً.");
  const [thumb, full] = await Promise.all([
    compressImage(file, 400, 0.6),
    compressImage(file, 1400, 0.75),
  ]);
  return { name: file.name, thumb, full };
}

export async function prepareFile(file: File): Promise<Prepared> {
  const isImage = file.type.startsWith("image/");
  if (isImage) {
    if (file.size > MAX_IMAGE_SRC) throw new Error("الصورة كبيرة جداً.");
    const dataUrl = await compressImage(file, 1000, 0.7);
    return { kind: "image", name: file.name, dataUrl };
  }
  if (file.size > MAX_FILE) throw new Error("الحد الأقصى للملف 5 ميجابايت.");
  const dataUrl = await readAsDataUrl(file);
  return { kind: "file", name: file.name, dataUrl };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("فشل قراءة الملف."));
    r.readAsDataURL(file);
  });
}

// تصغير الصورة وضغطها (JPEG) لتصبح خفيفة
function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("تعذّر معالجة الصورة."));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("تعذّر تحميل الصورة."));
    img.src = url;
  });
}
