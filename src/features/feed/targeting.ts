/* ════════════════════════════════════════════════════════════
   الاستهداف المشترك — شعبة ومادّة

   وحدة واحدة يستعملها **كل** ما يُستهدَف في المنصّة: عناصر التغذية
   الدراسية، ومهامّ اليوم، وغرف المراجعة، والدورات. ثلاث نسخ من منطق
   «هل هذا يناسب شعبتي؟» تعني ثلاثة أماكن يُنسى تصحيح أحدها — وقد وقع
   ذلك فعلاً: تبويب «مناسبة لشعبتك» في الدورات كان يُرتّب ولا يُصفّي،
   فرأى طالب علوم تجريبية دورةَ رياضيات تحت عنوان «مناسب لشعبتك».

   ولا تصنيف جديد: الشُّعب هي `TRACKS` والمواد هي سجلّ المواد القائم.
════════════════════════════════════════════════════════════ */

import { TRACKS } from "@/lib/constants";

export const BRANCHES = TRACKS;

/** خريطة الشُّعب: `{all:true}` أو `{sciences:true, math:true}` */
export type BranchMap = Record<string, boolean> & { all?: boolean };

export interface Targeted {
  branches?: BranchMap | null;
  /** معرّف المادّة، أو `general` / فارغ = بلا مادّة محدّدة */
  subject?: string | null;
}

export function isAllBranches(b?: BranchMap | null): boolean {
  if (!b) return true;              // بلا استهداف = للجميع
  if (b.all === true) return true;
  return branchIds(b).length === 0; // خريطة فارغة = للجميع
}

export function branchIds(b?: BranchMap | null): string[] {
  if (!b) return [];
  return Object.keys(b).filter((k) => k !== "all" && b[k] === true);
}

export function branchName(id: string): string {
  return BRANCHES.find((t) => t.id === id)?.name ?? id;
}

/** «كل الشعب» · «علوم تجريبية» · «علوم تجريبية + رياضيات» · «٣ شعب» */
export function branchLabel(b?: BranchMap | null): string {
  if (isAllBranches(b)) return "كل الشعب";
  const ids = branchIds(b);
  const names = ids.map(branchName);
  if (names.length <= 2) return names.join(" + ");
  return `${names[0]} + ${names.length - 1} شعب`;
}

/**
 * هل هذا المحتوى **موجَّه** لشعبة الطالب؟
 * «كل الشعب» تُعدّ مناسبة للجميع — وهذا مقصود: المحتوى العامّ يخصّ
 * كل طالب، ولا يجوز أن يختفي عنه لأنّه لم يُسمَّ باسم شعبته.
 */
export function matchesBranch(t: Targeted | null | undefined, track?: string | null): boolean {
  if (!t) return true;
  if (isAllBranches(t.branches)) return true;
  if (!track) return false;
  return branchIds(t.branches).includes(track);
}

/**
 * هل يخصّ الطالب **تحديداً** (لا «للجميع»)؟
 * يُستعمل لشارة «مناسب لشعبتك» ولترتيب الأولوية: المحتوى المصوَّب إلى
 * شعبته أولى من المحتوى العامّ.
 */
export function isExactBranchMatch(t: Targeted | null | undefined, track?: string | null): boolean {
  if (!t || !track || isAllBranches(t.branches)) return false;
  return branchIds(t.branches).includes(track);
}

export function matchesSubject(t: Targeted | null | undefined, subject?: string | null): boolean {
  const s = t?.subject;
  if (!s || s === "general" || s === "all") return true;
  if (!subject) return false;
  return s === subject;
}

/** يبني خريطة الشُّعب من قائمة معرّفات — فارغة تعني «كل الشعب» */
export function buildBranchMap(ids: string[]): BranchMap {
  const clean = ids.filter((id) => BRANCHES.some((b) => b.id === id));
  if (!clean.length) return { all: true };
  const map: BranchMap = {};
  clean.forEach((id) => { map[id] = true; });
  return map;
}

/** يُبدّل شعبة داخل الخريطة — إفراغها يُعيدها إلى «كل الشعب» */
export function toggleBranchIn(b: BranchMap | null | undefined, id: string): BranchMap {
  const cur = isAllBranches(b) ? [] : branchIds(b);
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  return buildBranchMap(next);
}

/**
 * درجة الملاءمة — أساس ترتيب التغذية.
 * الأعلى أوّلاً: مصوَّب إلى شعبتي ومادّتي ← شعبتي ← عامّ.
 */
export function relevanceScore(
  t: Targeted | null | undefined,
  student: { track?: string | null; subject?: string | null },
): number {
  let score = 0;
  if (isExactBranchMatch(t, student.track)) score += 40;
  else if (isAllBranches(t?.branches)) score += 12;
  if (t?.subject && t.subject !== "general" && t.subject === student.subject) score += 20;
  return score;
}
