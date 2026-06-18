/**
 * يضغط صورة الأفاتار إلى مربّع 200×200 بصيغة JPEG (base64)
 * لتخزينها في RTDB دون استهلاك مساحة كبيرة.
 */
export function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذّر تحميل الصورة"));
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("تعذّر معالجة الصورة"));

        // اقتصاص مربّع من المنتصف (object-fit: cover)
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);

        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
