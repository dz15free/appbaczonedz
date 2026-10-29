/** مقال أُعيدت كتابته — يُطبَّق من لوحة الأدمن على المقال الموجود بنفس الرابط */
export interface BlogRewrite {
  /** رابط المقال الحالي — لا يتغيّر، فلا تضيع فهرسته */
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  html: string;
}
