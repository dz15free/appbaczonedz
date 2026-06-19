// الثوابت الجزائرية: الشُّعب، المواد لكل شعبة، والولايات (58)

export interface Track {
  id: string;
  name: string;
}

// شُعب البكالوريا في الجزائر (النظام الحالي)
export const TRACKS: Track[] = [
  { id: "sciences", name: "علوم تجريبية" },
  { id: "math", name: "رياضيات" },
  { id: "tech-math", name: "تقني رياضي" },
  { id: "economics", name: "تسيير واقتصاد" },
  { id: "literature", name: "آداب وفلسفة" },
  { id: "languages", name: "لغات أجنبية" },
  { id: "arts", name: "فنون" },
];

// المواد لكل شعبة (مفاتيح موحّدة تُستخدم في الغرف والمكتبة والاختبارات)
export interface Subject {
  id: string;
  name: string;
}

// كل المواد الممكنة في النظام (قائمة موحّدة)
export const ALL_SUBJECTS: Subject[] = [
  { id: "arabic", name: "اللغة العربية" },
  { id: "arabic-lit", name: "اللغة العربية وآدابها" },
  { id: "islamic", name: "العلوم الإسلامية" },
  { id: "math", name: "الرياضيات" },
  { id: "science", name: "علوم الطبيعة والحياة" },
  { id: "physics", name: "العلوم الفيزيائية" },
  { id: "technology", name: "التكنولوجيا" },
  { id: "philosophy", name: "الفلسفة" },
  { id: "history-geo", name: "التاريخ والجغرافيا" },
  { id: "french", name: "اللغة الفرنسية" },
  { id: "english", name: "اللغة الإنجليزية" },
  { id: "amazigh", name: "اللغة الأمازيغية" },
  { id: "third-lang", name: "اللغة الأجنبية الثالثة" },
  { id: "law", name: "القانون" },
  { id: "accounting", name: "التسيير المحاسبي والمالي" },
  { id: "economics", name: "الاقتصاد والمناجمنت" },
  { id: "art-major", name: "مادة التخصص الفني" },
];

// مواد كل شعبة (بالمعرّفات)
export const TRACK_SUBJECTS: Record<string, string[]> = {
  sciences: ["arabic", "islamic", "math", "science", "physics", "philosophy", "history-geo", "french", "english", "amazigh"],
  math: ["arabic", "islamic", "math", "science", "physics", "philosophy", "history-geo", "french", "english", "amazigh"],
  "tech-math": ["arabic", "islamic", "math", "technology", "physics", "philosophy", "history-geo", "french", "english", "amazigh"],
  economics: ["arabic", "islamic", "law", "math", "accounting", "economics", "philosophy", "history-geo", "french", "english", "amazigh"],
  literature: ["arabic-lit", "islamic", "philosophy", "history-geo", "math", "french", "english", "third-lang", "amazigh"],
  languages: ["arabic", "islamic", "philosophy", "history-geo", "math", "french", "english", "third-lang", "amazigh"],
  arts: ["arabic", "islamic", "philosophy", "history-geo", "french", "english", "art-major"],
};

// مساعد: إرجاع مواد شعبة معيّنة ككائنات {id, name}
export function subjectsForTrack(trackId: string | undefined | null): Subject[] {
  if (!trackId || !TRACK_SUBJECTS[trackId]) return ALL_SUBJECTS;
  const ids = TRACK_SUBJECTS[trackId];
  return ids.map((id) => ALL_SUBJECTS.find((s) => s.id === id)!).filter(Boolean);
}

// مساعد: اسم المادة من معرّفها
export function subjectName(id: string | undefined | null): string {
  if (!id) return "عام";
  return ALL_SUBJECTS.find((s) => s.id === id)?.name ?? id;
}

// مساعد: اسم الشعبة من معرّفها
export function trackName(id: string | undefined | null): string {
  if (!id) return "—";
  return TRACKS.find((t) => t.id === id)?.name ?? id;
}

// الأدوار في المنصة
export type UserRole = "student" | "teacher" | "admin";

export const ROLE_LABELS: Record<string, string> = {
  student: "طالب",
  teacher: "أستاذ",
  admin: "إدارة",
};

// الولايات الـ58
export const WILAYAS: string[] = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار",
  "البليدة", "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر",
  "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة",
  "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة", "وهران", "البيض",
  "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي",
  "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت",
  "غرداية", "غليزان", "تيميمون", "برج باجي مختار", "أولاد جلال", "بني عباس",
  "إن صالح", "إن قزام", "تقرت", "جانت", "المغير", "المنيعة",
];
