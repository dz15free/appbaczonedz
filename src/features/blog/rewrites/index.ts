import type { BlogRewrite } from "./types";
import { BATCH_1 } from "./batch-1";
import { BATCH_2 } from "./batch-2";
import { BATCH_3 } from "./batch-3";
import { BATCH_4 } from "./batch-4";

export type { BlogRewrite } from "./types";

/* المقالات الـ21 بعد إعادة كتابتها — تُطبَّق من لوحة الأدمن مقالاً مقالاً */
export const BLOG_REWRITES: BlogRewrite[] = [...BATCH_1, ...BATCH_2, ...BATCH_3, ...BATCH_4];
