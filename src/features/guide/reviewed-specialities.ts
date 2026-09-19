/* ════════════════════════════════════════════════════════════
   التخصّصات التي أُعيدت كتابتها بالعربية الفصحى

   هذه القائمة هي **شرط دخول الطبقة الفائزة** في `guide-merge.ts`.

   ⚠️ ولا يجوز استبدالها بشرط محتوى مثل «له `intro` و`verdict`»:
   جُرّب ذلك فمرّر 147 تخصّصاً بدل 44، و74 منها ما تزال بالدارجة —
   أي أنّ الشرط كان سيرفع الدارجة إلى الواجهة بدل أن يزيلها.

   الإدراج هنا يعني أنّ التخصّص مرّ على `npm run audit:specialities`
   ونجح: فصحى خالصة، وحقول المخطّط وحدها، وفهرس متطابق.

   يُضاف السلَق بعد كتابة صفحته ونجاح الفحص — لا قبله.
════════════════════════════════════════════════════════════ */
export const REVIEWED_SLUGS: readonly string[] = [
  "addict",
  "adjoint-medical",
  "anesthesie-reanimation",
  "appareilleur-orthopediste",
  "assistant-social",
  "biomedical",
  "cs-eco",
  "dent-hyg",
  "dental-prosthetist",
  "dieteticien",
  "droit-info",
  "ensta",
  "esi-alger",
  "esi-sba",
  "esp",
  "estin",
  "gen-couns",
  "info-auto",
  "info-gest",
  "informatique",
  "isp",
  "it-int",
  "kine",
  "labo",
  "med-ai",
  "med-bio",
  "med-eco",
  "med-gen",
  "med-info",
  "med-informatics",
  "med-psy",
  "medcine",
  "medcine-dentaire",
  "military-health",
  "paramedical",
  "pedicure-podologue",
  "pharma-prep",
  "pharmacie",
  "prec-med",
  "psychomotricien",
  "public-health-hygiene",
  "radio",
  "sage-femme",
  "vetrinaire",
];
