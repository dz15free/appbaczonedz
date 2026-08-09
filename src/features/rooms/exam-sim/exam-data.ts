/* ════════════════════════════════════════════════════════════
   بيانات محاكاة البكالوريا — منقولة حرفياً من محاكي BacZoneDZ

   ⚠️ **لم يُغيَّر رابط واحد ولا مدّة واحدة.** هذه مواضيع حقيقية
   بمددها الرسمية؛ تعديل رقم هنا يعني طالباً يتدرّب على وقت خاطئ.
   المصدر: المحاكي المنشور، ومنه أيضاً منطق الاختيار (أساسي/إضافي/
   عشوائي/مخصّص) — لم يُعَد بناؤه بل نُقل.

   المحتوى يبقى خارجياً (Google Drive)، وقاعدة البيانات تحفظ الوصف
   والرابط فقط — كما في بقيّة المنصّة.
════════════════════════════════════════════════════════════ */

export interface SimExam {
  label: string;
  /** main | nafi | tamayoz | fergani | channel | custom */
  source?: string;
  examUrl: string;
  solutionUrl?: string | null;
  /** بالدقائق — `null` تعني: خذ مدّة المادّة */
  duration?: number | null;
}

export interface SimSubject {
  name: string;
  /** المدّة الرسمية بالدقائق */
  duration: number;
  icon: string;
  examUrl?: string;
  solutionUrl?: string;
  schedule?: string;
  extraExams?: SimExam[];
}

export interface Specialty {
  label: string;
  color: string;
  icon: string;
  subjects: SimSubject[];
}

const examData: Record<string, Specialty> = {
    math: {
        label: "رياضيات", color: "#2c5cc5", icon: "bx-math",
        subjects: [
            { name: "الرياضيات", duration: 270, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1G4J-ccY-qikJK5pimxzXgaRiuYrdFcXu/preview", solutionUrl: "https://drive.google.com/file/d/1IQp4pFPm1clMIrKfIlu7IQPBi3ogxkli/preview", schedule: "الاثنين 04 ماي - 08:30" },
            { name: "العلوم الفيزيائية", duration: 270, icon: "bx-atom", examUrl: "https://drive.google.com/file/d/17EZX9WNeV5uFrNwpNKuXUUOFu7QwQ6-F/preview", solutionUrl: "https://drive.google.com/file/d/1LzgcoYk3Vc2AFjO8UmM19HV13YxzIj-H/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "العلوم الطبيعية", duration: 150, icon: "bx-test-tube", examUrl: "https://drive.google.com/file/d/1iWRaeTH4K0ITGn5yLGGaEidhJcPY193v/preview", solutionUrl: "https://drive.google.com/file/d/1d2XefeyNPn8w5S_FQ4TWeBGR1hJi2nM-/preview",  },
            { name: "اللغة العربية", duration: 150, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1lfIXDuPheU68cIz4RU1nLosn_pwp7et9/preview", solutionUrl: "https://drive.google.com/file/d/1J1ED3nxvnN3yGnvWgs4R446Q3W9KT6te/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/17-4u8xcL5hLLJRgTYusXQUj-dOyT17L6/preview", solutionUrl: "https://drive.google.com/file/d/1e_0IT0m1itjegNQ_lnDsTr1WbkffFZ06/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1r9LEVgy2HwV8B8JCabJpVrdzRysZvw-H/preview", solutionUrl: "https://drive.google.com/file/d/1D7I4GYzifVhzV0iQucemW3SKu8tj7sB8/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1nl3vZkHrWN3ITAJWmTDIsNWg4Jc_-KUW/preview", solutionUrl: "https://drive.google.com/file/d/1O-dbnO9S5OOrnDXimDt0dieXQe2RC0D-/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" }
        ]
    },
    science: {
        label: "علوم تجريبية", color: "#28a745", icon: "bx-test-tube",
        subjects: [
            { name: "العلوم الطبيعية", duration: 270, icon: "bx-test-tube", examUrl: "https://drive.google.com/file/d/1DAqJnxqPgJXKWKOaBKNthCaC0U611sNl/preview", solutionUrl: "https://drive.google.com/file/d/1dsXZZmamv1oYB13vlXQ2kemdDS4c4aI4/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "الرياضيات", duration: 210, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1XkxKLbgNfdqeiyR9hhOiro9bFyI6BucF/preview", solutionUrl: "https://drive.google.com/file/d/1IMYqPJE_q4mHtnErhnHbq_d9iTx8fRv9/preview", schedule: "الاثنين 04 ماي - 08:30" },
            { name: "العلوم الفيزيائية", duration: 210, icon: "bx-atom", examUrl: "https://drive.google.com/file/d/1jcmPtJnvMdLN8__NIyl8yzGWXz--ujqI/preview", solutionUrl: "https://drive.google.com/file/d/1281tFAO53RmODuSoaKTgUQiyhM5TW55q/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 150, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1lfIXDuPheU68cIz4RU1nLosn_pwp7et9/preview", solutionUrl: "https://drive.google.com/file/d/1J1ED3nxvnN3yGnvWgs4R446Q3W9KT6te/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/17-4u8xcL5hLLJRgTYusXQUj-dOyT17L6/preview", solutionUrl: "https://drive.google.com/file/d/1e_0IT0m1itjegNQ_lnDsTr1WbkffFZ06/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1r9LEVgy2HwV8B8JCabJpVrdzRysZvw-H/preview", solutionUrl: "https://drive.google.com/file/d/1D7I4GYzifVhzV0iQucemW3SKu8tj7sB8/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1nl3vZkHrWN3ITAJWmTDIsNWg4Jc_-KUW/preview", solutionUrl: "https://drive.google.com/file/d/1O-dbnO9S5OOrnDXimDt0dieXQe2RC0D-/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" }
        ]
    },
    tech_elec: {
        label: "تقني رياضي (هندسة كهربائية)", color: "#f39c12", icon: "bxs-bolt-circle",
        subjects: [
            { name: "هندسة كهربائية", duration: 270, icon: "bxs-bolt-circle", examUrl: "https://drive.google.com/file/d/1RPb8yxD8pwp34lmuKuPDSAlLY8oMBsF4/preview", solutionUrl: "https://drive.google.com/file/d/1k-3Sb8Sda5m3ooMq0o6dIfj2btAuAiKW/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "الرياضيات", duration: 270, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1zLNcWx2rksnEqgmZO3-XVu7M6BQgP7S-/preview", solutionUrl: "https://drive.google.com/file/d/1qKQISWZhJbpN9nSy5wTsBtE8DDbyUvtT/preview", schedule: "الاثنين 04 ماي - 08:30" },
            { name: "العلوم الفيزيائية", duration: 270, icon: "bx-atom", examUrl: "https://drive.google.com/file/d/17EZX9WNeV5uFrNwpNKuXUUOFu7QwQ6-F/preview", solutionUrl: "https://drive.google.com/file/d/1LzgcoYk3Vc2AFjO8UmM19HV13YxzIj-H/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 150, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1lfIXDuPheU68cIz4RU1nLosn_pwp7et9/preview", solutionUrl: "https://drive.google.com/file/d/1J1ED3nxvnN3yGnvWgs4R446Q3W9KT6te/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/17-4u8xcL5hLLJRgTYusXQUj-dOyT17L6/preview", solutionUrl: "https://drive.google.com/file/d/1e_0IT0m1itjegNQ_lnDsTr1WbkffFZ06/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1r9LEVgy2HwV8B8JCabJpVrdzRysZvw-H/preview", solutionUrl: "https://drive.google.com/file/d/1D7I4GYzifVhzV0iQucemW3SKu8tj7sB8/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1nl3vZkHrWN3ITAJWmTDIsNWg4Jc_-KUW/preview", solutionUrl: "https://drive.google.com/file/d/1O-dbnO9S5OOrnDXimDt0dieXQe2RC0D-/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" }
        ]
    },
    tech_civil: {
        label: "تقني رياضي (هندسة مدنية)", color: "#f39c12", icon: "bx-buildings",
        subjects: [
            { name: "هندسة مدنية", duration: 270, icon: "bx-buildings", examUrl: "https://drive.google.com/file/d/1KyCdMfFgV0TG40kJkXQfp9apCfykSZ3M/preview", solutionUrl: "https://drive.google.com/file/d/18DmSEoOalCDtQBGZ_CQSU8dQADVeREN3/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "الرياضيات", duration: 270, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1zLNcWx2rksnEqgmZO3-XVu7M6BQgP7S-/preview", solutionUrl: "https://drive.google.com/file/d/1qKQISWZhJbpN9nSy5wTsBtE8DDbyUvtT/preview", schedule: "الاثنين 04 ماي - 08:30" },
            { name: "العلوم الفيزيائية", duration: 270, icon: "bx-atom", examUrl: "https://drive.google.com/file/d/17EZX9WNeV5uFrNwpNKuXUUOFu7QwQ6-F/preview", solutionUrl: "https://drive.google.com/file/d/1LzgcoYk3Vc2AFjO8UmM19HV13YxzIj-H/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 150, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1lfIXDuPheU68cIz4RU1nLosn_pwp7et9/preview", solutionUrl: "https://drive.google.com/file/d/1J1ED3nxvnN3yGnvWgs4R446Q3W9KT6te/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/17-4u8xcL5hLLJRgTYusXQUj-dOyT17L6/preview", solutionUrl: "https://drive.google.com/file/d/1e_0IT0m1itjegNQ_lnDsTr1WbkffFZ06/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1r9LEVgy2HwV8B8JCabJpVrdzRysZvw-H/preview", solutionUrl: "https://drive.google.com/file/d/1D7I4GYzifVhzV0iQucemW3SKu8tj7sB8/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1nl3vZkHrWN3ITAJWmTDIsNWg4Jc_-KUW/preview", solutionUrl: "https://drive.google.com/file/d/1O-dbnO9S5OOrnDXimDt0dieXQe2RC0D-/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" }
        ]
    },
    tech_mech: {
        label: "تقني رياضي (هندسة ميكانيكية)", color: "#f39c12", icon: "bx-cog",
        subjects: [
            { name: "هندسة ميكانيكية", duration: 270, icon: "bx-cog", examUrl: "https://drive.google.com/file/d/1zYx3agyuvK3hoe4-pa3P-ANzJkXJ_21A/preview", solutionUrl: "https://drive.google.com/file/d/17UPsfdgYsRgqQY2ym8ZYMbF_hgnIxhh4/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "الرياضيات", duration: 270, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1zLNcWx2rksnEqgmZO3-XVu7M6BQgP7S-/preview", solutionUrl: "https://drive.google.com/file/d/1qKQISWZhJbpN9nSy5wTsBtE8DDbyUvtT/preview", schedule: "الاثنين 04 ماي - 08:30" },
            { name: "العلوم الفيزيائية", duration: 270, icon: "bx-atom", examUrl: "https://drive.google.com/file/d/17EZX9WNeV5uFrNwpNKuXUUOFu7QwQ6-F/preview", solutionUrl: "https://drive.google.com/file/d/1LzgcoYk3Vc2AFjO8UmM19HV13YxzIj-H/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 150, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1lfIXDuPheU68cIz4RU1nLosn_pwp7et9/preview", solutionUrl: "https://drive.google.com/file/d/1J1ED3nxvnN3yGnvWgs4R446Q3W9KT6te/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/17-4u8xcL5hLLJRgTYusXQUj-dOyT17L6/preview", solutionUrl: "https://drive.google.com/file/d/1e_0IT0m1itjegNQ_lnDsTr1WbkffFZ06/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1r9LEVgy2HwV8B8JCabJpVrdzRysZvw-H/preview", solutionUrl: "https://drive.google.com/file/d/1D7I4GYzifVhzV0iQucemW3SKu8tj7sB8/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1nl3vZkHrWN3ITAJWmTDIsNWg4Jc_-KUW/preview", solutionUrl: "https://drive.google.com/file/d/1O-dbnO9S5OOrnDXimDt0dieXQe2RC0D-/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" }
        ]
    },
    tech_process: {
        label: "تقني رياضي (هندسة طرائق)", color: "#f39c12", icon: "bxs-flask",
        subjects: [
            { name: "هندسة طرائق", duration: 270, icon: "bxs-flask", examUrl: "https://drive.google.com/file/d/1U7TPPiMT6kRRuAktbzUCeyQRVFnk1FCv/preview", solutionUrl: "https://drive.google.com/file/d/13sUQKa5yIfok-yqfipzmXIfjzoJzJCDv/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "الرياضيات", duration: 270, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1zLNcWx2rksnEqgmZO3-XVu7M6BQgP7S-/preview", solutionUrl: "https://drive.google.com/file/d/1qKQISWZhJbpN9nSy5wTsBtE8DDbyUvtT/preview", schedule: "الاثنين 04 ماي - 08:30" },
            { name: "العلوم الفيزيائية", duration: 270, icon: "bx-atom", examUrl: "https://drive.google.com/file/d/17EZX9WNeV5uFrNwpNKuXUUOFu7QwQ6-F/preview", solutionUrl: "https://drive.google.com/file/d/1LzgcoYk3Vc2AFjO8UmM19HV13YxzIj-H/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 150, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1lfIXDuPheU68cIz4RU1nLosn_pwp7et9/preview", solutionUrl: "https://drive.google.com/file/d/1J1ED3nxvnN3yGnvWgs4R446Q3W9KT6te/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/17-4u8xcL5hLLJRgTYusXQUj-dOyT17L6/preview", solutionUrl: "https://drive.google.com/file/d/1e_0IT0m1itjegNQ_lnDsTr1WbkffFZ06/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1r9LEVgy2HwV8B8JCabJpVrdzRysZvw-H/preview", solutionUrl: "https://drive.google.com/file/d/1D7I4GYzifVhzV0iQucemW3SKu8tj7sB8/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1nl3vZkHrWN3ITAJWmTDIsNWg4Jc_-KUW/preview", solutionUrl: "https://drive.google.com/file/d/1O-dbnO9S5OOrnDXimDt0dieXQe2RC0D-/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" }
        ]
    },
    management: {
        label: "تسيير واقتصاد", color: "#8e44ad", icon: "bx-line-chart",
        subjects: [
            { name: "التسيير المحاسبي والمالي", duration: 270, icon: "bx-calculator", examUrl: "https://drive.google.com/file/d/1lglWie7KOgJ5AH8XqpbKkodP1pOf15oi/preview", solutionUrl: "https://drive.google.com/file/d/1Lb-erDiwfGWgmXKvpod_jkR_mLF2HiZg/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "الاقتصاد والمناجمنت", duration: 210, icon: "bx-line-chart", examUrl: "https://drive.google.com/file/d/1WfaJ_UCy1K8OQvRq20HnrIiidmvSDgYb/preview", solutionUrl: "https://drive.google.com/file/d/1QUNB05Gvo9gDVNBth7QjQslKGImnzie4/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "القانون", duration: 150, icon: "bx-briefcase", examUrl: "https://drive.google.com/file/d/1HZjg0JTD4juK-Tyx4LkgETCqI4domYD1/preview", solutionUrl: "https://drive.google.com/file/d/1LnqgNlawVgxj8CDY-_agbTKyTCqPI5vi/preview", schedule: "الأحد 03 ماي - 11:30" },
            { name: "الرياضيات", duration: 210, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1QHeNhbOnzd77x9WMrdwg1G-FvPJtPtac/preview", solutionUrl: "https://drive.google.com/file/d/14tl8cUMVQ7rf8O3mLymhE3t110KH2Izx/preview", schedule: "الاثنين 04 ماي - 08:30" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1nZQeDE1JRY7cS-xeyv1D7zxgDxSWwrF6/preview", solutionUrl: "https://drive.google.com/file/d/1YC4exLpxk1AJjsrK72iTkXVN7o9qzc03/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "اللغة العربية", duration: 150, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1lfIXDuPheU68cIz4RU1nLosn_pwp7et9/preview", solutionUrl: "https://drive.google.com/file/d/1J1ED3nxvnN3yGnvWgs4R446Q3W9KT6te/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/17-4u8xcL5hLLJRgTYusXQUj-dOyT17L6/preview", solutionUrl: "https://drive.google.com/file/d/1e_0IT0m1itjegNQ_lnDsTr1WbkffFZ06/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1r9LEVgy2HwV8B8JCabJpVrdzRysZvw-H/preview", solutionUrl: "https://drive.google.com/file/d/1D7I4GYzifVhzV0iQucemW3SKu8tj7sB8/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" }
        ]
    },
    literature: {
        label: "آداب وفلسفة", color: "#e74c3c", icon: "bx-book-open",
        subjects: [
            { name: "الفلسفة", duration: 270, icon: "bx-brain", examUrl: "https://drive.google.com/file/d/12Y_wk1eFhLOGM2MfkFyEJ8kmlDrgTmeE/preview", solutionUrl: "https://drive.google.com/file/d/1gCwKhsRlS7PeJ5_9g9ez_HcBimsQjxjc/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "اللغة العربية", duration: 270, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1LBcnE-aHFigFoX83hZwaJ0cxLHvVoFHj/preview", solutionUrl: "https://drive.google.com/file/d/1Ws1EtpQ9BFy3LN4cqVyOKMngszUvzR4h/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "تاريخ وجغرافيا", duration: 270, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1cw49tUoyYTYul-3XU_-mcROjj2L_32SL/preview", solutionUrl: "https://drive.google.com/file/d/1XOPp3fdgk8reD7nvmzFsBuqbpw9a_4YZ/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "اللغة الفرنسية", duration: 150, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/1wm3N7u6uS9141pjthC-LnUR1FXnT2ZwB/preview", solutionUrl: "https://drive.google.com/file/d/1q8wKYQs4DP7looZHDsPs6HZMmadduS2R/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 150, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1XQG_JG6NxLTSu2rygH4AdF_dTMslcxRJ/preview", solutionUrl: "https://drive.google.com/file/d/1YhgCr2uz_OT7co81_6t-ETY7kOZ2HSPw/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" },
            { name: "الرياضيات", duration: 150, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1V3Cgq03y-coRYy9he3_JbAA32JlO-KMP/preview", solutionUrl: "https://drive.google.com/file/d/1vwkFcP1n74OL7Ku3FFCPQnXHOb4OHC8e/preview", schedule: "الاثنين 04 ماي - 08:30" }
        ]
    },
    lang_german: {
        label: "لغات أجنبية (ألمانية)", color: "#16a085", icon: "bx-world",
        subjects: [
            { name: "اللغة الفرنسية", duration: 210, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/1wm3N7u6uS9141pjthC-LnUR1FXnT2ZwB/preview", solutionUrl: "https://drive.google.com/file/d/1q8wKYQs4DP7looZHDsPs6HZMmadduS2R/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 210, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1YgpvZrn0Z4qZyDDSaevsh2Tau3FfVga-/preview", solutionUrl: "https://drive.google.com/file/d/1DoziOVaNbogf2MzrF-ZQt7CzW08NleMN/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "اللغة الألمانية", duration: 210, icon: "bx-comment-dots", examUrl: "https://drive.google.com/file/d/12D9Zth_njs3YXZJX8nT43DiWa7NE9cUX/preview", solutionUrl: "https://drive.google.com/file/d/1Nx24z8IEO64rmAdd0q6Iw2nV2DTVqGyX/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 210, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1eWJBioO7WIl3nN32KycPRAwDsDG76VBv/preview", solutionUrl: "https://drive.google.com/file/d/1NO3eqI5KuIBtTId_04OrdZ7ntJhbLELz/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1t6tJ9jEB8KHLDvPpcx-HFjH5q12Ip0OV/preview", solutionUrl: "https://drive.google.com/file/d/143IixWiSj4h9Iv_SEpKYRhc5R78BMzJW/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "الفلسفة", duration: 210, icon: "bx-brain", examUrl: "https://drive.google.com/file/d/10M79Tvm7C12IwiQ9gVa936AgX6ktGJ48/preview", solutionUrl: "https://drive.google.com/file/d/178dn4Kt4CLBo7lEtHLsChPInuS_5XXBg/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" },
            { name: "الرياضيات", duration: 150, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1V3Cgq03y-coRYy9he3_JbAA32JlO-KMP/preview", solutionUrl: "https://drive.google.com/file/d/1vwkFcP1n74OL7Ku3FFCPQnXHOb4OHC8e/preview", schedule: "الاثنين 04 ماي - 08:30" }
        ]
    },
    lang_spanish: {
        label: "لغات أجنبية (إسبانية)", color: "#16a085", icon: "bx-world",
        subjects: [
            { name: "اللغة الفرنسية", duration: 210, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/1wm3N7u6uS9141pjthC-LnUR1FXnT2ZwB/preview", solutionUrl: "https://drive.google.com/file/d/1q8wKYQs4DP7looZHDsPs6HZMmadduS2R/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 210, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1YgpvZrn0Z4qZyDDSaevsh2Tau3FfVga-/preview", solutionUrl: "https://drive.google.com/file/d/1DoziOVaNbogf2MzrF-ZQt7CzW08NleMN/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "اللغة الإسبانية", duration: 210, icon: "bx-comment-dots", examUrl: "https://drive.google.com/file/d/1tlgAn7PwOtoR-oH-QuFxL-wbFzJUMl3P/preview", solutionUrl: "https://drive.google.com/file/d/1YXXeCPbzF0hrEW6MHyU14IkKGv4kpOSg/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 210, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1eWJBioO7WIl3nN32KycPRAwDsDG76VBv/preview", solutionUrl: "https://drive.google.com/file/d/1NO3eqI5KuIBtTId_04OrdZ7ntJhbLELz/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1t6tJ9jEB8KHLDvPpcx-HFjH5q12Ip0OV/preview", solutionUrl: "https://drive.google.com/file/d/143IixWiSj4h9Iv_SEpKYRhc5R78BMzJW/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "الفلسفة", duration: 210, icon: "bx-brain", examUrl: "https://drive.google.com/file/d/10M79Tvm7C12IwiQ9gVa936AgX6ktGJ48/preview", solutionUrl: "https://drive.google.com/file/d/178dn4Kt4CLBo7lEtHLsChPInuS_5XXBg/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" },
            { name: "الرياضيات", duration: 150, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1V3Cgq03y-coRYy9he3_JbAA32JlO-KMP/preview", solutionUrl: "https://drive.google.com/file/d/1vwkFcP1n74OL7Ku3FFCPQnXHOb4OHC8e/preview", schedule: "الاثنين 04 ماي - 08:30" }
        ]
    },
    lang_italian: {
        label: "لغات أجنبية (إيطالية)", color: "#16a085", icon: "bx-world",
        subjects: [
            { name: "اللغة الفرنسية", duration: 210, icon: "bx-message-rounded-dots", examUrl: "https://drive.google.com/file/d/1wm3N7u6uS9141pjthC-LnUR1FXnT2ZwB/preview", solutionUrl: "https://drive.google.com/file/d/1q8wKYQs4DP7looZHDsPs6HZMmadduS2R/preview", schedule: "الثلاثاء 05 ماي - 15:00" },
            { name: "اللغة الإنجليزية", duration: 210, icon: "bx-world", examUrl: "https://drive.google.com/file/d/1YgpvZrn0Z4qZyDDSaevsh2Tau3FfVga-/preview", solutionUrl: "https://drive.google.com/file/d/1DoziOVaNbogf2MzrF-ZQt7CzW08NleMN/preview", schedule: "الاثنين 04 ماي - 15:00" },
            { name: "اللغة الإيطالية", duration: 210, icon: "bx-comment-dots", examUrl: "https://drive.google.com/file/d/1dWEC9EDYV-yVV7_TYafkboujGLFNzbVd/preview", solutionUrl: "https://drive.google.com/file/d/1cFrTcVPbt1cRGFi5MoXqsMhiTwZOM56p/preview", schedule: "الخميس 07 ماي - 08:30" },
            { name: "اللغة العربية", duration: 210, icon: "bx-book-open", examUrl: "https://drive.google.com/file/d/1eWJBioO7WIl3nN32KycPRAwDsDG76VBv/preview", solutionUrl: "https://drive.google.com/file/d/1NO3eqI5KuIBtTId_04OrdZ7ntJhbLELz/preview", schedule: "الأحد 03 ماي - 08:30" },
            { name: "تاريخ وجغرافيا", duration: 210, icon: "bx-map-alt", examUrl: "https://drive.google.com/file/d/1t6tJ9jEB8KHLDvPpcx-HFjH5q12Ip0OV/preview", solutionUrl: "https://drive.google.com/file/d/143IixWiSj4h9Iv_SEpKYRhc5R78BMzJW/preview", schedule: "الأربعاء 06 ماي - 08:30" },
            { name: "الفلسفة", duration: 210, icon: "bx-brain", examUrl: "https://drive.google.com/file/d/10M79Tvm7C12IwiQ9gVa936AgX6ktGJ48/preview", solutionUrl: "https://drive.google.com/file/d/178dn4Kt4CLBo7lEtHLsChPInuS_5XXBg/preview", schedule: "الثلاثاء 05 ماي - 08:30" },
            { name: "العلوم الإسلامية", duration: 150, icon: "bx-moon", examUrl: "https://drive.google.com/file/d/1fhOrK51LPssye7Cd755yUeCkdRwF8dZs/preview", solutionUrl: "https://drive.google.com/file/d/1wLaZhLISXi3c84H1laUYO3Gx4UktAA69/preview", schedule: "الأحد 03 ماي - 15:00" },
            { name: "الرياضيات", duration: 150, icon: "bx-math", examUrl: "https://drive.google.com/file/d/1V3Cgq03y-coRYy9he3_JbAA32JlO-KMP/preview", solutionUrl: "https://drive.google.com/file/d/1vwkFcP1n74OL7Ku3FFCPQnXHOb4OHC8e/preview", schedule: "الاثنين 04 ماي - 08:30" }
        ]
    }
};

// ─── NAFI EXTRA EXAMS — 2026 ─────────────────────────────────────────────────
(function attachNafiExams() {
    const pu = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
    const ne = (n: number, id: string): SimExam => ({ label: `موضوع ${String(n).padStart(2,'0')}`, source: 'nafi', examUrl: pu(id), solutionUrl: pu(id), duration: null });

    const mathMATH = [ne(1,'17uLPDZz5ObEXwXL5La0_5ZLdQJWnrqd0'),ne(2,'15NfJO6AJIkPt7Jc8LHhSliNggvsaZjIF'),ne(3,'1ysLozkt6hDo-7RF3SZ_DfhumhjRI2lOC'),ne(4,'1umWCs3WJOe_YeSdti0C76mLf-lJX53x1'),ne(5,'1ytOyTTUZnsg2WPjssUFuxEFOdwupyN6F'),ne(6,'1_6lew7VqenvwFQjZVfmHwRoutwG3Rt5D'),ne(7,'1ir49WZBT7x0J8L15ns7fduIryVKT6-9J'),ne(8,'1ZhKjoSA9n0riYEfWMMbbDn4oIcKnXrJo'),ne(9,'1QOOX-qufUKtR6B39J1CaWttBgzCMqNMn'),ne(10,'15hDZI585-ZAFzc_kstFHdgrVN26Zd7eH'),ne(11,'18M6kpzcjdROz1GnuJkh6uWg51HqCIN8O'),ne(12,'1IZO_Ju0dIo3BssPxW2zSR-mtWU9k8MFh'),ne(13,'1y3Y1odAJhl-4s7nGZQ-APC_HZ3ILZ4pp'),ne(14,'1QVP2YSXEh4XIiMRJIqorkjP8dAYY9SDm'),ne(15,'17c2u_kxV48CLL0SbyxAsu3S65Bsm2Lhx'),ne(16,'1aCUeu5utGCugux_SjMxGehTOAzwm9gTq'),ne(17,'1QNGyImW6l2b0A96x_xJyOQpdS3kVzdGh'),ne(18,'1ziKFqfGnu5HZBCZX8qgnG3pVC_gosS8L'),ne(19,'1YtvPdc5iu456P9_ykpVWcRaU3tDweGWc')];
    const mathTR = [ne(1,'1U5RpE4yFCVgqDsodQTxK7GD53FWlflZD'),ne(2,'1ZEmbT-Kcax_XP6CJwVkXcfkDMxNInVn7'),ne(3,'19KUuS5xOaAwP-AmXnZzWDF0A9zUVjEdL'),ne(4,'1QhY29z0Y9iV-nNN5IazNiXOHNqEZRNgC'),ne(5,'1TyWOfeeWDdL2b1L8tQlvcVa9wbIhxUug'),ne(6,'1I7JSBlPrYN6QKCBEzHA3OCVMzwhRU0mo'),ne(7,'1pDp29dx95EbbVmzm2PEXdkqvlpjSzD6H'),ne(8,'1myvP6ZlfRCEBdjGcAnuFsRjlBZ2hjvlf'),ne(9,'1nvCurR4ZF0nlMECqiiW3-mHsX-0PhpRR'),ne(10,'1VzEcMG8YQgvLnN32_rj5NHN-84PyC6LX')];
    const mathSC = [ne(1,'1Jr_zsbkvu3BG_KjL2zVTokpDMJIMzZ60'),ne(2,'1RD9joXRLa1L3XnCdpmJu4WJeczYS1wXi'),ne(3,'1JMVI3AQ6vOvKDIh2i_QnrApmi0MdElDq'),ne(4,'1J-bfnXGrF3gquZdVLWgQpLdow5dj7l4x'),ne(5,'1A74vFZYP5lBeVof5--ndSBKq5R0dZH6i'),ne(6,'1go-y98kuz9-wzHJa79oYjFVqw5wnIef'),ne(7,'1wD2Yl3PqfgbCnsniBtvSAW8hk1jZblV5'),ne(8,'1FbgBu-3K3s7MtzRRa_HzpQJnCRuQ6cBv'),ne(9,'1UHYaP1SjaIdQPZxDyHrw2HzpIg9V4HLG'),ne(10,'1Pids0BB7OfiKVlWPDASWKjbEk7iJhpb2'),ne(11,'1QtIp_S_k9iBP76nTXNwr1SoOMcqb4GRE'),ne(12,'1IbuPxcSnRtoRLi7nYnpa5iixJ0Ak8qVx'),ne(13,'1qSx7WacE0tt303bfDHOmSoFrNu2Y73Wh'),ne(14,'1sYwtIE8FY8HOXLExnM2xsO3DyfkhEPKh'),ne(15,'1SEM2gJTHqjUvjwci6Ukw0jo6I50WFHVw'),ne(16,'17FaLmNX-ALF0TCRjQT2Hr2NKglhTisO1'),ne(17,'1czWAtw3Pz0YZHyR3nF_5BrMCDhxZfp3A'),ne(18,'12zE-c3oMRKV3kewuWwO4AxhrTYEqSOqA'),ne(19,'1PWbGfoYj1XZ2OfwkUe8od1NzHy93USH4'),ne(20,'1Oqs-4ULStb5WNfEz-HJxPimPR5H1FeRU')];
    const physSC = [ne(1,'1ZH6jVpejgKB2Wkv3YYQ9IErMEvQJA9eV'),ne(2,'11pQxpzMVSnsg1Hkzqx6fz4ZOlfqkUHxM'),ne(3,'18VdAsjJ1txcGkc6USbcuSxp2pMAOra_M'),ne(4,'1BGwNm9BTaZzxPP65q8h9FsCuUBx3Eidk'),ne(5,'120oDDBKkQVbWJ3SxanxrShnWif25aQLP'),ne(6,'1Zu2yautSmL3mad9x-pbvD5ex1WS_N7wd'),ne(7,'1lyau-0w8yg-IuOy96xPlqJdWsKfb6Hbr'),ne(8,'10xlW1hM2Ncw8WQ4xgPndlEG8dEUllkYs'),ne(9,'16lAKnIPqdj9FzRSS-ijocyIIpLyip9Zk'),ne(10,'1J_12SBL8p1fM6NEmiDVOq_-rU1QxTxs7'),ne(11,'1g1-nH9dwl5booLBCLu9FI5XySm_GzMec'),ne(12,'1KJ8yH79j6n8r2YuG5aWsWI93fVX0z9xq')];
    const physRT = [ne(1,'1h59Uq0EkRv9tK9V3NklNk3YAvxIIdPfy'),ne(2,'1-EqCafk1p7Ikp4GGtZqX5tE7oZ9Yb16S'),ne(3,'1NAqt2FUd2CkdRs0Tb_AMqyZ-Ivet4pcj'),ne(4,'1ti956-Jwgtmyy5Dmwglfnwme15CRQYr_'),ne(5,'1EYoL72kxJLXuz0jt3g3JZtpKW4HJ4lsr'),ne(6,'1dVyJkuE_aiREJ54y1KsIJ3Zhj3sg8Iq_'),ne(7,'1sPYwfa2WcEudAMJ-JdN0KxOIRZmIRhjf'),ne(8,'1u5dSiXJZYaHZ_4UdeqHH8ArciHhqUb6l'),ne(9,'1nYoCtlCitGg0o1ksyLI6qNyGE1Az191Z'),ne(10,'1nI7hdOgq01v56Y_j4lzSSC5UGnhj8WeS'),ne(11,'1xLr5co6T-BheT01nlYft4hgFllHuwqFI'),ne(12,'14j6DPh8rNAczQ28JTyZgHGpVVnxg_VL2')];
    const sciSC = [ne(1,'1edeUQY116GYomHBfXQLHi-TxpKh3MneS'),ne(2,'1eeWfs0CNRhGVI7Bz6lQj3yEzI1EJfE8l'),ne(3,'10N4K8Pjbtu9x3v69KAL4wC358eFRhDlN'),ne(4,'16x-ot20mkPSjJRtBTCigG9Zz9m3nojUI'),ne(5,'1WGPmUN33hRRJzKC5nSoBw9s_JsfzfcaV'),ne(6,'17Q6FqZlF-yrCVY3GXK6-Kbb7bu_r_57E'),ne(7,'1ig-dG2evkj-dDyUgOUWxAb2uDlsjXqTe'),ne(8,'1kgh-yGJ45_BgxiWBKXCz0DKyMN2FL6q9'),ne(9,'1NnQzMnNQRP4QwgVsU4M8BvXCDTvORN3C'),ne(10,'1rZUIJHArGjhGHRd2997JyzM644ocFaJj'),ne(11,'1P4IE6SA7eRNvwU-_HDlH-E136fyWcI0y'),ne(12,'1QyRLlGijFvUeszFYGUV90vkK0gwZ0KRW'),ne(13,'1aa3SHvYLQNKsNbi1bwE39Nj7sqrm3yA0'),ne(14,'1puYGeVWTmKLsltIWlogRy6kTrH-xZwuQ'),ne(15,'1TLXxjbLG5fGg9Dytef03Xh80hbK1CqmM'),ne(16,'1u5rxBbbcMCf3zXrHlhRXfU_ls4JA5jZo'),ne(17,'1mJGD0ink8_3OxLB0lSD7jgvoXW3v-N7D'),ne(18,'10PBqGnnNYH6zXVcKaoSygIagSootPQLf'),ne(19,'13yrQYaD7jasXDQHtUGg8S5oeYgQvJySJ'),ne(20,'1Vu28hJCjia1egUlxORkNIKA8xpDkGp3n'),ne(21,'1p1aKw8jNM6ehFr8KKmdi_alRNJF_IWuE'),ne(22,'1GUsG9zm1MTrz7oBWkZHQgz5zdrYPURXW'),ne(23,'1l2mCYn4OG1-gqW_GJvSoX7T5yfgeWS_J'),ne(24,'1RIYAAS7kfhP2TkRJDJeJF6OxBGZ4ZUjQ'),ne(25,'1toWs3rpsh4yEppTJkmJgi8PeYIMml_-W'),ne(26,'1jo1Wv6ssVK-x30R86VIS0mFoy6uZc1NH')];
    const sciMATH = [ne(1,'1v7EPT2Fp6eseSF2G1lczwccR6NxXFBUU'),ne(2,'1YM_dLWfTH56htc-_4VXzDJEuW0_UW5b_'),ne(3,'133ZrE-dcg_8jf9e8e332ufR4CDBDaB_c'),ne(4,'19-w9Q_kdJWRiedw-Ri6ErSeHHzG2fpBY'),ne(5,'18AU0DNjdFiJLKiQyhyYTuCdhWMnMj2xS')];
    const arabicSci = [ne(1,'1mM2ysRQQNAsHkjC053cCrdj7L8P6T5Aj'),ne(2,'14Dr-RSuYl_ufsbANiy9wCu7XUtCSdqvo'),ne(3,'1PioSric6PnWeWxoZ533Jfs8k1S78s_J2'),ne(4,'1dpltTCDezpQuJNjoqpqJAqn5SKoJpfga')];
    const english = [ne(1,'1B9lSLnTn1sEhoAaXPuIHdMYNGCLZRnna'),ne(2,'1YnaTgYh5qwrctNsBybMH3u4COIKeFTUg'),ne(3,'1I910vX_Ex_XkFsgwZbN0dq_MPm5wiY8d'),ne(4,'1vWObfGInJtqgyK5ARMaezjEukyScCzC4'),ne(5,'1K9tomL8wV8Mbznv97vNehZntCXzP8_3B'),ne(6,'1Z0gBCfrxA8hvtSuyWVfCi59IDD9sWeAy'),ne(7,'1CSqnqdz3zZK_pXYsICLKxnPRenCHdECr'),ne(8,'1FB9bzSx1viaPQV8RvXBPJiVyzEzbchj4'),ne(9,'1bwyPJI33KMJIKKjQmY32jirtJBxoQuhx')];
    const frenchSci = [ne(1,'1yLf9qvkVDyBMM5nlBXsN2P6TaDMbIkBQ'),ne(2,'1eiN1bVK5sbWFMnGzKXXKzXzwfqSpYXhR'),ne(3,'19GYOjoBQ7qcHMVQCR-gxtWC1DOWoF4WU')];
    const histGeo = [ne(1,'1uUDN16SbCqSlSDNYBN6T4GEM1VxdpkZx'),ne(2,'1o1gl767QVYPk6sAiKb1ppAyrycLH0Gw8'),ne(3,'1wdhzBUb3UOoWdbBPkafkqYgTDtK4ToHR'),ne(4,'1iw-Owa3j3TiLYQHeV5o77pSeB0HyB-Hy'),ne(5,'1pv0kWQdkKJ9JWbtZR3Ws3xCYsxu_Y_2a'),ne(6,'1_piGelsEnlyLFzgtEq9MA-Yz0d2DIkk1'),ne(7,'1FrO_OQIRIclfhn7tuHg9FkLtUkm8j7AO'),ne(8,'1WfqGbp0k-zO26Re9Mnzo4fvmHZnJW2ny'),ne(9,'1hhmNtU_F7BNmHARezscv6t3b_lZdyo0R'),ne(10,'1zw6xcGGs3J3yoUw9n-l-YhHzHkIRcEPZ'),ne(11,'1ZQNahmcR5IcCtv0JBY6mpFQUsBVGsgj_'),ne(12,'1QHe-NHOSbnQOWKxuxeluPIY6ieb0Vygt'),ne(13,'181fO1frE7db9i9Oje0jQN_Fbx5UGOE8P'),ne(14,'1PLtvWOM-6MhqzjFSvDSBgkmc1uSX31jv'),ne(15,'1vYDyHmnqyQhRnfuGa8r6zf-L5379OqhT')];
    const islamic = [ne(1,'1bLx5mjQ0EMuXkRFU3Yw6Wk_829thb9C2'),ne(2,'122NA-hsaTkjwt-ffpsDjoXVtrSBSvZmD'),ne(3,'1q5wONkT-MeMcuKBJSAkYcljHUaa3cWpf'),ne(4,'1r6Mgpd8rItfwgH7ch9qbuMUZC65fZWG-'),ne(5,'1b-TggM5wzncQGv0ZOawiXKWMOUd7daKD'),ne(6,'1gVcj-WaN_NpAWZTQQNzncTqUIgebhUmC')];
    const techElec  = [ne(1,'1jGjTZ-Tx-ca-7HxAa_QcG93IW4hTTP5p'),ne(2,'1v8CmiPV-xB5LWfEx7Vxr-apu5NdBWXAs'),ne(3,'10weOvZwk4IJlFnVba28SjjqoDIsvRaqv'),ne(4,'1fjzvj4IVz4ej2vdHrXYuodb2ZrxSlV7C'),ne(5,'1GK8-pp4bESuHiIYR_EBJLrkVqYmXu5GX'),ne(6,'1jofXTChrp_GSpbU7Vs2OXdOovAaNS-Ci'),ne(7,'1v193KJaGCl-gg0JQPocApE0jP2DImSyP'),ne(8,'1MTJch6mBIsUhEkSvwrxSU0m_3aVX18pM'),ne(9,'1mEOLZ00ay8C_wyAXmvmYcZ7CoeCksroV'),ne(10,'1sdew7eb5ADKRCBh7avjBLN7ZdVVL00xG')];
    const techCivil = [ne(1,'1uW0Ww7PEuvyxl4dLpyB7qLJi4NgaWzJ6'),ne(2,'1njQ3Pq8yQkN03kO_IwuGGDLciLehKGUz'),ne(3,'18yeTOcfzg1gwkcJdbLlvOhQsisjeNzo9'),ne(4,'1LjClcowURF_HcFXjGuyB6yY9013OuL5m'),ne(5,'1zmeYnAMkgY2-pg5Uq7vcPUh9OQXqKdvW'),ne(6,'1yQusDrYyJm-jHqE433eoZMaxKpquCpzx'),ne(7,'1_DyDxRC_by3Y9aJuPefoTuJxvjG-_ZIe'),ne(8,'1yFi0UqaYWqurH2_qgb11ibyiMX1EHoGS'),ne(9,'1V-QLU7nliR4J3Yx0Wnj8xzm90xVHL3dO'),ne(10,'1E-Qc_BTjflFcqgjDx8xxRMOh_mq2Tm8Z'),ne(11,'1pJvaVh3ixD7rAe2fpVztH4PGbt36uBFG'),ne(12,'1RvGVxfnUwWW47SaLBQJBzKJFR1N-x6kr'),ne(13,'1g6RREzwcaeVrpFcJjw3d4soVSiFBv34y'),ne(14,'1YD-Oqo01_wxGIiTuWgHXb5E15Fr8IPcL'),ne(15,'1Jm8mYCTwhgvgX7yCbkX4XlAjIR6srSSg'),ne(16,'1FpZdvpcE4rzB9FVyqnMay87kWO2atvhM'),ne(17,'1iR8UTn45V2LXfFdX-R6a79IOTbzqHqrL'),ne(18,'18ZDeHyTXM-bw4O5kPAzY3xj-MHYvrdfX'),ne(19,'1e_d3qwuBbV-c5JI45clx0BuN95jAgLRt'),ne(20,'18jQM_CuwsotBcFE_kPpRyoam-O7iMZ2n'),ne(21,'1F0ToI2ND76SXT8fdqPhv9MgzZZjPVC5N'),ne(22,'1gvRKBQ4iY2gY1MsaXmyBv0-Za6MxE74s'),ne(23,'1xgjzhE3WuG-HkbfIgVfQK5EYNaz-x-Up'),ne(24,'1w0rnnOftGcSlFJHhCDYH8UDRrZmaPPfg')];
    const techMech  = [ne(1,'1pXq0_q1D0v0g9m7f5jxU8uKZ6pLdwpSE'),ne(2,'1qLVQVDArYpqkQIWYr2JpMVNRxmjF0i5T'),ne(3,'1Sw7a6LL7zDm_LpVl0pqPckb014soENiw'),ne(4,'1RcHp0TE7P-Oborqnll1BYPafyaPjk_4g'),ne(5,'16bfkoPCHR6HPy7AWBpb_lamHWzDb6BWZ'),ne(6,'1VV8HC5oLtPZwhrmcieJz4Ur2xGNhrS2f'),ne(7,'11UNWeFi2VjF3JWlt2fp55bJZZL9d2rvU'),ne(8,'1_-K4N4IXas58QFKHtJUb7aVjeldfgIrF')];
    const techProc  = [ne(1,'1OZD1MRbc3gM60X6Fb-q6TUz2oi9iZOX0'),ne(2,'1XuTsoR3PV142CA0bUpIBOiuoIbd-iuXT'),ne(3,'1z6XWkj3myXiT3etOj5aqE9Nc5ZQ-TlHZ'),ne(4,'1JreY1Khn-4r05ePckrQv8KJMlp84o9Bi'),ne(5,'1SO_uLrrNzvhXIv3ZVfE3KgIdlai1fnhK')];

    function gs(spec: string, name: string): SimSubject | null {
    const sp = examData[spec];
    return sp?.subjects?.find((s) => s.name === name) ?? null;
  }
  function setExtra(subj: SimSubject | null, arr: SimExam[]) { if (subj) subj.extraExams = arr; }
    
    ['math','science','tech_elec','tech_civil','tech_mech','tech_process','management','literature','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => {
        const is = gs(sp,'العلوم الإسلامية'); if (is) is.extraExams = islamic;
    });
    ['math','science','tech_elec','tech_civil','tech_mech','tech_process','management'].forEach((sp: string) => {
        const ar = gs(sp,'اللغة العربية');    if (ar) ar.extraExams = arabicSci;
        const fr = gs(sp,'اللغة الفرنسية');  if (fr) fr.extraExams = frenchSci;
        const en = gs(sp,'اللغة الإنجليزية'); if (en) en.extraExams = english;
        const hg = gs(sp,'تاريخ وجغرافيا');   if (hg) hg.extraExams = histGeo;
    });
    ['literature','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => {
        const fr = gs(sp,'اللغة الفرنسية'); if (fr) fr.extraExams = frenchSci;
    });

    setExtra(gs('science','العلوم الفيزيائية'), physSC);
    setExtra(gs('math','العلوم الفيزيائية'), physRT);
    ['tech_elec','tech_civil','tech_mech','tech_process'].forEach((sp: string) => {
        setExtra(gs(sp,'العلوم الفيزيائية'), physRT);
    });

    setExtra(gs('math','الرياضيات'), mathMATH);
    setExtra(gs('science','الرياضيات'), mathSC);
    ['tech_elec','tech_civil','tech_mech','tech_process'].forEach((sp: string) => {
        setExtra(gs(sp,'الرياضيات'), mathTR);
    });

    setExtra(gs('science','العلوم الطبيعية'), sciSC);
    setExtra(gs('math','العلوم الطبيعية'), sciMATH);

    setExtra(gs('tech_elec','هندسة كهربائية'), techElec);
    setExtra(gs('tech_civil','هندسة مدنية'), techCivil);
    setExtra(gs('tech_mech','هندسة ميكانيكية'), techMech);
    setExtra(gs('tech_process','هندسة طرائق'), techProc);
})();

// ─── TAMAYOZ EXTRA EXAMS ────────────────────────────────────
(function attachTamayozExams() {
    const pu = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
    const nt = (n: number, id: string): SimExam => ({ label: `موضوع ${String(n).padStart(2,'0')}`, source: 'tamayoz', examUrl: pu(id),  solutionUrl: pu(id),  duration: null });
    const nts = (n: number, eid: string, sid: string): SimExam => ({ label: `موضوع ${String(n).padStart(2,'0')}`, source: 'tamayoz', examUrl: pu(eid), solutionUrl: pu(sid), duration: null });
    function gs(spec: string, name: string): SimSubject | null {
    const sp = examData[spec];
    return sp?.subjects?.find((s) => s.name === name) ?? null;
  }
  function setExtra(subj: SimSubject | null, arr: SimExam[]) { if (subj) subj.extraExams = arr; }
    function add(subj: SimSubject | null, arr: SimExam[]) { if (subj) subj.extraExams = (subj.extraExams || []).concat(arr); }

    const mathRIADHI_T = [nts(1,'1ZNTBvTIHZhy09pQxV0-RIt5urV9SiZPe','1uqJGhqfXa8TIKmZSH3oJNEKJZVnf6Q8e')];
    add(gs('math','الرياضيات'), mathRIADHI_T);

    const mathSCI_T = [nts(1,'1DeoXRstUciuHOIbEFAaivBLhp0wZOSi3','1a4-vv6y2jWrDF0c4wUYRwy5HTfX0wri0')];
    add(gs('science','الرياضيات'), mathSCI_T);

    const mathMGMT_T = [nt(1,'1TuVVqudw4eFaXELMRFJ_qVwWXb5Sp0LT'),nt(2,'1cgI8t4uX8MdZaSRarQdcFJfRofl-BYW7'),nt(3,'1atka8hJVqDX300fHybcLP2_2CDUJkGVG'),nt(4,'1u3YeFMsxZylkM8_rYE1PIRnuVnWBhWCI'),nt(5,'1d32XyCrNRBYBuL0sk4GEBgl-ORBbmcw4'),nt(6,'1E1E-XWiDbSL3DogjhO6wdy511XkUvKu0'),nt(7,'1pn3YdRgHh2-eSc2GX8t1BKFRXgrTmcaI'),nt(8,'1v-3OyF4Pi1d1ofZLDj--ig6IXxBiWUdo'),nt(9,'1mlYVwCfmFlj4UhDM4on93HiEIa6naDTB'),nt(10,'1cUdivD2vcCgAYsNfWdZCR3rhq7pH3klR'),nt(11,'1ncCOvpqYLvB79wZBkPqRoh12zmBq9hMD'),nt(12,'1NzSn-N6HVPrWKnhWMqaqxU6tpCAaVBFS'),nt(13,'1LPUKjpL654Bus1S-c9HVmgHLmfCfwc1G'),nt(14,'1BKyqJuLsZ4qoDZY3ff0muqvvFpPhz7yg'),nt(15,'1wu8Xoz5wenuqKm53vv6ob4gGWjgQATUd'),nt(16,'1XGRvA3yJ2cg2u82Yv0r2yOXWsqZAOnP0'),nt(17,'1vNBm5rWpCJEvgOJnK5R4Ew3IvarjMaFD'),nt(18,'1pmlac12cXzQRBDB2BsPCn_I1lu0NrkCA'),nt(19,'12jnv0xL46ug335eotH66ebDmu3w4tb78'),nt(20,'1gjHnVDHyABOpcUC-aZqPnj1WpgKN0mGE')];
    add(gs('management','الرياضيات'), mathMGMT_T);

    const mathLIT_T = [nt(1,'1Z0BThIEeBVzSXPEyAlZuwyHr6YTEmozQ'),nt(2,'1rcH0-RNROx0OwLR8pF8Og0hU6oC3Ln_y'),nt(3,'1hunKpUmPPJkuIRx-uoeU33Q5FMJI1KxX'),nt(4,'12OlW1-csahSAnttdyCeXz1_jgiNU6NpF'),nt(5,'11pgFgemllPPm04vf4iHCRuXzXXNwBk_8'),nt(6,'1F6ndz6yE9LGWqZl1tB8qyk6pddjGgK2J'),nt(7,'1nBU0--2Efjdh4hiVtwBE6bl9MpxyJZgS'),nt(8,'1t69o8gKmLhB0VfWQnJtXGyWYSXPaQgeV'),nt(9,'1P9HW9V-sKAqBrpxuU7ulOv23juJgW1eX'),nt(10,'1CI1SYHruxXTTkkAZ5-ybq6iD2u3jYDPv'),nt(11,'1z9WSXudHXuHkQGlMJrH-YSI8HJMlPqAh'),nt(12,'1W6aNum0TepX8V1FhvCt5Xc94dCu4vNzd'),nt(13,'15EFQAO2OjtIHf7PJoiX4PqX99fyU07mW'),nt(14,'1fNUDZUuVjtC3WHTQ4Sy2CHFyQ2-L7RnX'),nt(15,'1XmDTYmFzDjPcw7HFkcPq6f-kb1s5Ra-Q')];
    ['literature','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => add(gs(sp,'الرياضيات'), mathLIT_T));

    const acct_T = [nt(1,'1_JXKrLxiGfYL2cW4D8h0FLz5FOwpqlAY'),nt(2,'1K7XIZO_R-IkflAFItyix81Ju5x2vCioB'),nt(3,'1WTBt-h7IWGnvcHTr6Az-hKpW-LyTQWxC'),nt(4,'1EDIjGYn6RJ4fYcfHKITtKrFRWf2R3hyj'),nt(5,'1ovQie4xbfaqINdMRFWRm9XkOEHWHKt0V'),nt(6,'10nW5lsTPNzrIM7d28ZJwmCclGuClSXY7'),nt(7,'1p5efBgCfxoHYG-vefQe5UjBa1YjglYxm'),nt(8,'1c55Y6qEahattY2K0x-XKc_LGa_ob2fpS'),nt(9,'1E2O1mCwmdbgfaqhFO7yp4jmGLs5crcRj'),nt(10,'1GxtMEebIukcs0CODI4wcfdVrR2xPOanb'),nt(11,'1ktaYUR6bHXIedom0MpzQodfwTBJZV4-L'),nt(12,'1tatTAKKZREBs07Y_bjMdSE2f566a-eH4')];
    add(gs('management','التسيير المحاسبي والمالي'), acct_T);

    const econ_T = [nt(1,'1fnYWUun5Q4srWDHu7cvNgAFPS4V0uOBu'),nt(2,'1Zvr8NLgddBf776KEUz4GUtxa6MRA5tMf'),nt(3,'1tEEnKpyPF-Hj2NeVf5fBH-WV75t6kFUv'),nt(4,'11u39GXLGHzHtb5iRMbXs7DxD7BFtNSwL'),nt(5,'12cum1ZJLRxOB0e2IBYoXqhZ320TnKP8g'),nt(6,'1CA4M0QtTyR4kZRay5twe1ZjhxqWZhtXr'),nt(7,'1dIeeAOpAn0-lDFgwul98Hd9qxk8ZjaFZ'),nt(8,'1ZZ2Ng3lHLHuMBUXEeiQtA6uQWZ5L5t-j'),nt(9,'1BHLFYJnCqDQA72R3oL2pYG7yMQCfPzEp'),nt(10,'1QHRog82xfj88we3cd9f0ZY0GsMq9fXlV'),nt(11,'12CCpNf1rmHCZWFdKW8j9dAk4K37eUVSZ')];
    add(gs('management','الاقتصاد والمناجمنت'), econ_T);

    const law_T = [nt(1,'1L0HfzMxwqUcQ0xFM1ye65MiwVpBxd-_v'),nt(2,'1BS5owyIgSnzwh42kWoahxR163X1CjHUP'),nt(3,'1X48UCiRBse1KyL8UWm72ZkZgH-IO4KCk'),nt(4,'1aCipOD5PTiCjHROruGqET9ArIgx_7xu6'),nt(5,'12U2W5CU6nmUcv3yXqJYO6lNR7NmBTZcu'),nt(6,'1EIB5Pgn2KyC7puH9uJql6utvOVl4gJlB'),nt(7,'1CzT58GDUlVo4CwukIy8Tt-EIgOkSKMs3'),nt(8,'18r2NDYE85xvv9aXpDHsD7heX6dCD-Toc'),nt(9,'1t0K5KghqeVNeyLNC1f_JknkWO1pFITZr'),nt(10,'1956YWjWBKiKRtDKYgHk5YD3cmj0wjYxV'),nt(11,'1hU_dY38gMBmMFffpiuPWbv52DULtGe58')];
    add(gs('management','القانون'), law_T);

    const arabicSCI_T = [nt(1,'1ao2WLuJKihdBmFxQGQSfwS__GLfhazfs'),nt(2,'1Irg3oJDFc5WvKSJpn1LYZciI3vqibA8_'),nt(3,'1-hbqxKH35FzOM_HLX7fy3pT-sCLWDD-a'),nt(4,'1thGENKTnpL04Z9VqiFKvZptm9v5pgcTs'),nt(5,'13o73kmOtquhoOWR4ZBR6Y67f5gecDotZ'),nt(6,'1Q8MStdMJ0qiNYRXh8pyQv0qeNYRPo3cC'),nt(7,'11lY3a8yaJaxCVIbCE9DjLah7crZE2Cly'),nt(8,'1hCcUCbXOvGg3ebD0QQgvy_FSvD0QwzbV'),nt(9,'1OFYNPpKY4RR1i9ut0tPVCN3JsvEbKAw-'),nt(10,'1zgdwmnIsfStBMgofPI8yPglUPoCYDemv'),nt(11,'1cMn2bQFGuGHw3-Q6ojtGRioZzc-cBy1B'),nt(12,'1BeZx8DsCiGMbkFwXFeqBeUVzDU1FVDM0')];
    ['math','science','tech_elec','tech_civil','tech_mech','tech_process','management'].forEach((sp: string) => add(gs(sp,'اللغة العربية'), arabicSCI_T));

    const arabicLIT_T = [nt(1,'1nAHVmzQBSvp3iRjxB9kYSreNzv9gmFTQ'),nt(2,'1-Y0liJORwidXeQue6Sw4989i5cd6en8S'),nt(3,'1PSirtHjxyzziXZbyRDrlU0STrLzHJBA2'),nt(4,'1u6TH9B6Uc9bZ9TGJ3dU4fl9HPpc4fwtO'),nt(5,'1MojwPfb1vFLIa5kODVM5yvy5QRYt8HlD'),nt(6,'1V5I8Uc2mBSRWccVYNCCw_XiGS69i9JyT'),nt(7,'1Kmpo8Cg8TWE_ZkTLbYmvu1lsfoSB83WL'),nt(8,'1zM4aa5LngREWjLnhuJdq0gvA0qrepDSa'),nt(9,'1crRjKLvHdmPnqXy6dPc9KMrd7kovCFHz'),nt(10,'16X3TK3zXTa5_umjf9uk058lrkG3_V-HP'),nt(11,'10uaJJSGCV4idNOWDlhYBytbtIogyNCRZ'),nt(12,'175uNZElnnsLtAT2Ygj5Vu3Owk6ijvXbE'),nt(13,'1SzAK1A9HOD-FwiYscIUdPUt2JqySAjNZ'),nt(14,'1MmTVRoBJutRnyaHaKEt9VovjRWWTyl1q'),nt(15,'11DEtu_AwZtD4_5E0Hv6D4e4mlHHBktIw'),nt(16,'17D9FCfbV5xgktUR8EfDZ4Kbpf7-K52Qh'),nt(17,'1JMggtFQ0CjvYgK1e62eK-L5bNxAmauUP')];
    ['literature','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => add(gs(sp,'اللغة العربية'), arabicLIT_T));

    const french_T = [nt(1,'1pw1dFZN9j3oIqhn8d9OCtvC2ndFz27wG'),nt(2,'1V2xErXPhypJXWge0PothInQ9RwwPeyyJ'),nt(3,'1jnnddeN_Ypa92a4w_xz0_U4UgOQXPR2L'),nt(4,'1HzPcyLaVHh24Zim9XYYlm13JIDOuSzf9'),nt(5,'1hEuO_ICZz6XpZL9u7gHzhyXj_1iwOEId'),nt(6,'17CgD7g_RvcqCCqAU-crbdhpe_-DKwOZx'),nt(7,'1wa0q_WEJCNyMRgv8mK8UPU3f8LiJGQai'),nt(8,'1B3BpcIAUSp4WJczL6QROXcVz1BuHCTYl'),nt(9,'1o2ZHbqb495qnQRyOs9ObkFCKmI9dLd4f'),nt(10,'1cKLmep4pOOElhcjSPOf7kGoiUDD3-loC'),nt(11,'1UiUPo2FN485BHuPpaCIaaKWz1GFQiyc4'),nt(12,'1AA0Utc1h0gR-eioQ5YcchQuu2n4-Zarq'),nt(13,'1PYQTBuv2ZtmLLqv5c47eBv-CpgdSHK2Y'),nt(14,'1p5UuQDaicBYXDvTzepF4GFAfTnou3iDj')];
    ['math','science','tech_elec','tech_civil','tech_mech','tech_process','management','literature','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => add(gs(sp,'اللغة الفرنسية'), french_T));

    const englishSCI_T = [nt(1,'1aKmeqtqo7FpjHEt5peWVETKsL2M0GhOS'),nt(2,'1JRUFRrLlr0uyZV_AcoF1BqkLvHwYkogi'),nt(3,'1STX0J94qa4pldlM5shgcZT6A2v3fuKg2'),nt(4,'13fRbSFepFF8JjGahqQS3GCtXYQHXBNR4'),nt(5,'1oQSZsvj_zYUjtFJpaZSrkmUmJ6nQ_4hZ'),nt(6,'1WeM6ijkTy8qkgzTv4psIAsARTG7DIB5w'),nt(7,'1weU3nYvRfjay7K68U70chgS6-ivlS006'),nt(8,'1fcIWnX2lNv2sVYsZ0OuReXcaYsNO8cMO'),nt(9,'1LZs1rVq6heb7fzIgU2GcFkonlK98NAmi'),nt(10,'1MVHBz_1SxIbPgDSHnQFYh1mFz0QQMUEC'),nt(11,'1hJ_QYNlii80O-gDDzdufh48hsGNm8eyp'),nt(12,'1QLQ6XUAZOnv2V-Agmhf6TS1r7YYmU_X6'),nt(13,'1E6Iab48I3eOceNmUXpFIlvyshtWJtBGH'),nt(14,'1jdsUzcJV-ET2iXqgscwj8D1jxNZIff0V'),nt(15,'1O11qjtx4No1Xk4piJWp7a6KjSUHtQ4Xa'),nt(16,'1j7VCI0Ze9vi2blHrspxcrJVZEI3gGjnj'),nt(17,'1tqhPYaoaKF6VockWYCeq3K5fpTimTQ00'),nt(18,'1-nKSAulFNyMBLgKfvH9WMaEtKTO9cfMq'),nt(19,'1dEa5dAR8ClY5paeBVTHAdtC1NQOj-i1n'),nt(20,'1BHzV9S0mWAZQtWEJDwlIbxN6AVUasRTg'),nt(21,'1r_GHqXWGtxFRvzaxazqZHqquvi146W0t')];
    ['math','science','tech_elec','tech_civil','tech_mech','tech_process','management'].forEach((sp: string) => add(gs(sp,'اللغة الإنجليزية'), englishSCI_T));

    const englishLIT_T = [nt(1,'1eaJa6Tw44Vat_bx8IYhTk0t3vU0Fu8u8'),nt(2,'1i4yv54qCt7DBDksS46bF4bg8VD4v42Iy'),nt(3,'19giGAYXowGTZcRuZ8e4h0TWSLJRXYLC9'),nt(4,'1S572huiBfF2o9_KbI5FX0C-a7sAHw9mJ'),nt(5,'1PHU-7I3xLt7-_CQYfoJQw-Ntfe0XvIHP'),nt(6,'1vT5Yd-v1uEGicY_r87Up1vRGkFqipFVT'),nt(7,'1syHjts3Mg-WGwn_2vgZwH-5XkBWTLJYd'),nt(8,'1moMCO-wijbLSbJzjj-4HBbCS45T_ZALI'),nt(9,'1i4yv54qCt7DBDksS46bF4bg8VD4v42Iy'),nt(10,'1_ztUBDCkAF288Z4WYSn0jtBBs6USKxSZ'),nt(11,'1S572huiBfF2o9_KbI5FX0C-a7sAHw9mJ'),nt(12,'1Kof7-eVaKZ1xTyCQVlRgJZ7hOtu-LZih'),nt(13,'1RR6FGOtQNBBCxfpI4-TWbhjlMZj1bD3A'),nt(14,'1bAjoW4EA-wm3Gm_s2l8Ol28-NnAfENs-'),nt(15,'1JCC7gcyeriFIxqTU-saLwcQ_Xc4AEAuN'),nt(16,'1fVarXI1-JJellafmaAkogkxV765HYAxz'),nt(17,'1huSKD_tKi-tyCe4lf57kS521sd7FtTl3'),nt(18,'1YwHF3bEv1Qt574hV8QpymzggeRw9S3G4'),nt(19,'1CFmbvhrNJ2OWNpyDqOoYVRol8ZWThtTw'),nt(20,'1WXzGVcIVr2C4T2uPrromgrXZToyC7o9j')];
    ['literature','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => add(gs(sp,'اللغة الإنجليزية'), englishLIT_T));

    const histMAIN_T = [nt(1,'1shR4wx96tbYm_pTjrQqvmG_msf0E3RsM'),nt(2,'1DAH1c5uCDtNcp_w_xB36C2LlB3HYBSwx'),nt(3,'1Z71tt9Ba1HhBQWfpCO87_PFoy37tEXI4'),nt(4,'1F6yK-8LBAZuoLnnxRgTRrR6dhiBizokS'),nt(5,'1IX3XPc_x6WhK2FtOP3AUBc2w2m-OCvko'),nt(6,'11apIPoCodL1oS87EizwsRuuN1813Gtui'),nt(7,'1rQ_o1QWtmFGvrj-v6bG7bgDQGDbVNnd6'),nt(8,'1ZsjwbEePmNRGPxPIpMI2UFl7RJxlOddK'),nt(9,'1fAs-n0eSFqiJInxuQh_HSiNX1YiS1UNW'),nt(10,'1ZnDDZIhfLvDRLxSxgBPUNf56AdmKIuGx'),nt(11,'1W-G0G1ME2tLQIA_b-7IRZEce9B23tjtJ'),nt(12,'1rZGEyFzq48NKjq7kJcdACxMMkVCOfwha'),nt(13,'18Ouw9DOLo5nPvsHa-GohvKVDDhY6c38n'),nt(14,'1ZL12VhMgt5rE8PQeisq2-3k-dn_X5H5w'),nt(15,'1mxLXXF2osxvGcd9TiMRc7aVgrXxlzCCP'),nt(16,'17HXsm3B6ENbTuIqgy4JU5eXpG8v0hMGz'),nt(17,'1_HjRLBpAS76r7ThSVqHufFdqW8KSO5wK'),nt(18,'1y4iCpFSjfQRqVJu6i3eiI8tNbU72w9j9'),nt(19,'10ciJ7I3Lj5Rh-XEan0Bqyv3wyqzd439L'),nt(20,'1HVIBI1ykwqgGfXVKxSq_WJ75-7_IzYBF')];
    ['math','science','tech_elec','tech_civil','tech_mech','tech_process','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => add(gs(sp,'تاريخ وجغرافيا'), histMAIN_T));

    const histLIT_T = [nt(1,'1a-ZicAUgeeq1e0IUlMRvCcdiWtDUtcs1'),nt(2,'13zgtz3okpp960pIUr_4vFLjJ2vgnPsmX'),nt(3,'1cOiW0h0xgA3BxsBHgsIukFvGkP46rj8W'),nt(4,'1-318Gdbtp83HFvRIgwVotf6b6zauRB_z'),nt(5,'1DCjW0tXnEEe4ye_lpMBL6aegkfUhq-W6'),nt(6,'1uCc_DgS7l6xjufbHFGtTLunsMDOVdJGV'),nt(7,'1MIPLWjVFvMqkKU40V_ybXZfzUm-wYLI_'),nt(8,'1JLReu61mj9kYdxAh4eCPR0gPQVKY0uu_'),nt(9,'1tuHB0TjAuxVhpXqLeE_hkSxhegyG9GB1'),nt(10,'1FaxovmTrfAspp8r83M90P-mtZa5BCQea'),nt(11,'1tqqN_AcdTEaFQIAKj40J2V771JigvHj3')];
    add(gs('literature','تاريخ وجغرافيا'), histLIT_T);

    const histMGMT_T = [nt(1,'1KkYG46rB6fnrWhOnmqOlk7SufTxTPD6u'),nt(2,'1Ad82OGWYSbg2HXlTh0Xt8uZbF1lW0vbP'),nt(3,'1POUNF6AzRx8IKhQUwwGYvSQj_D_S007U'),nt(4,'1NLhSchm9ul9xV5BiGvIbjc8zM9sDBpR_'),nt(5,'1_tWJ3ASqfGePTzX-S5NG5Wmv4uWMe1do'),nt(6,'12ihxHEa9FFdyLswNgjzBF0XESHdiil4w'),nt(7,'1BIMqQrnFLl3qXvkm27qJ-qRZwsRyo41L'),nt(8,'18NHilI76wruIdmDBNXV4CDkROgPVk_NM'),nt(9,'1ipRl_VPTK3PZhKA5uCFkzHqvX53G26QJ'),nt(10,'1UZgZPISuAzLUXFMMdJiiIIs_92XvKlWw')];
    add(gs('management','تاريخ وجغرافيا'), histMGMT_T);

    const islamicALL_T = [nt(1,'1yuziwlq2LHKdvjuMXQ8_TUUZh44ZnTfh'),nt(2,'1HjIJZVgdAHB5vg-HUmvvfk87VT8YmeGn'),nt(3,'1jwaTPfxA6AKoGo8nzP8P-VrgFjtnzDGn'),nt(4,'1s4TZK79comK3qvs26kA0n-4dCHySymQs'),nt(5,'1J8l3VGeD3iKF4J-xmsRpH-sQqdDDT0Hq'),nt(6,'1yX4z6zXDpQ6sOKTt6Mz2LkAsLfWk7gKT'),nt(7,'1J_xtrlMoy6Dupj9Qfqmfp1X5roaMkp-P'),nt(8,'1X3stsxO65-u30xOc-fThSV71J4G8JyME'),nt(9,'1-fKAxpyBsJsfp4EposY9o74j4zzo9CQK'),nt(10,'13wzGB0R4rJmcpCSewR4VM_al1fE6Os9w'),nt(11,'191L1o1p5SRwm_km0x2VTepE5tdQZpRD4'),nt(12,'1ejqoBA-DmvVlAQMLFfVY5UUXNvXm6Q5I'),nt(13,'1iQVsItkKyunB3DSWcrMtZADYJICflWDb'),nt(14,'1d0tEXSeXTJdiyth3U9VtuTbnmhEcTAoR'),nt(15,'1jZMXNA07mpUJKwHRGFqzxgFek106_Mey'),nt(16,'1aKHiFrs06sm5eO6g3QvV8Lf6DEM78b20'),nt(17,'1FBUU-dhc-Z9ySbduzpg1OXH_Tj_Ze82f'),nt(18,'1fx_ICbIcObCe4hH3bjuam1LA0-TzUr6l'),nt(19,'1IRuHnr-0qQex9ICFmo0lZdtAw6-Tlhk_'),nt(20,'1f9qh--HDelkwyHlxW_KNdHqnKXkKukU0')];
    ['math','science','tech_elec','tech_civil','tech_mech','tech_process','management','literature','lang_german','lang_spanish','lang_italian'].forEach((sp: string) => add(gs(sp,'العلوم الإسلامية'), islamicALL_T));

    add(gs('lang_german','اللغة الألمانية'), [nt(1,'1kru-2bvSib3laiBrFQs4rKToXpZy43O4'),nt(2,'14ATmj_Mh3Rc4ljUy4EKw4TJ_I3uT25ec'),nt(3,'1EzHShz4PzdPvvK8BIy2y-M-9iUdjIt1f'),nt(4,'1qTQXIsIGAFQo3WvC6MelNAP4USGSzt8p'),nt(5,'1GrkzkMJQ-peWOS-yCD5sj6uefVQHe3YL'),nt(6,'1-VjX3fMYUbdywdZ1URn80fZ-jZwgc4A4'),nt(7,'10APiNszJgSenkb8l60bc1lsrSvJsnk-x'),nt(8,'1ykuGnHSSOichWwq-0ilHYSVT9vU3YTe1'),nt(9,'1Kcfa8rXzw-27aie7Jr0BFPo3j0zQOU6Q'),nt(10,'1PyJbs1wOyQ1oC-fjP3oMI15Gql8z3up_'),nt(11,'1jO7qP4YBFK2L4oCptAsUSn_pAKgKipUc')]);
    add(gs('lang_spanish','اللغة الإسبانية'), [nt(1,'1Q62BpqZXNEAsgz1bDxP4vbPq127C2pBL'),nt(2,'17zY4ZHwTv5O1QJd2DfkGkaeB-vN62eLI'),nt(3,'1P6dlCb2qDybEOONB0-GatkTCMQ89349T'),nt(4,'10QRfz8R6M6LjrUxU0m4LK60azlayOPAQ'),nt(5,'1UYwXo3MZe1nReMCZAd0I2nJNZX5x_-wT'),nt(6,'1kq90BTmPjYYYUjZ0uUO3affK171bIWIO'),nt(7,'1LKxOJkMErkOGyGfNDlWVekSVssc-R69N'),nt(8,'1nGD_yuGj2aHkVxEdPRWAyk5B9sbvCPnK'),nt(9,'1dIc3wBGb23ar-6m3K6EIlYyE0YVRjGkT'),nt(10,'1y0b5EnIVLD_GDEqtwrAGmlAru4AiTyEs'),nt(11,'1aaNgNzdI1UmBdVA5DPjFlmudoNiSZrPO')]);
    add(gs('lang_italian','اللغة الإيطالية'), [nt(1,'1x4EqWbp8fPnON8qYqXBRhrfapns_GRHg'),nt(2,'16-gQM6nH6vT0rCGBkhby-ZQHiSyJLTPx'),nt(3,'1HoXJEnfP8IUU_CKw6cv6eYcixY8Fkqto')]);
})();

// ─── FERGHANI EXTRA EXAMS ────────────────────────────────────
(function attachFerganiExams() {
    const pu = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
    const fe = (n: number, id: string): SimExam => ({ label: `موضوع للأستاذ فرقاني ${String(n).padStart(2,'0')}`, source: 'fergani', examUrl: pu(id),  solutionUrl: pu(id),  duration: null });
    function gs(spec: string, name: string): SimSubject | null {
    const sp = examData[spec];
    return sp?.subjects?.find((s) => s.name === name) ?? null;
  }
  function setExtra(subj: SimSubject | null, arr: SimExam[]) { if (subj) subj.extraExams = arr; }
    function add(subj: SimSubject | null, arr: SimExam[]) { if (subj) subj.extraExams = (subj.extraExams || []).concat(arr); }

    const physFERGANI = [
        fe(1, '15e7dlmGL4kZqByP7eWvfI14NtRbgVH9R'), fe(2, '1Dn-glKKFNiqyNaPYv5dfj1166bRgj5Nd'), fe(3, '1lUNErRvn0OoyZhvs1FxX0KjsjmaaZcuR'), fe(4, '1ogIvK0QQTbNV3r49pdPBfKBBTXq-vm3V'), fe(5, '1wfwtikTonJBjLJiUn6crVOONBodH9Sck'),
        fe(6, '1WNUaYYskQM4dTW0w6BWhOsewJlDOxhRS'), fe(7, '1MAR96F_dXw63bkMalONhGHxONb2sIKfY'), fe(8, '1xk3-DVb1mKb9QRZ4CMEmrf5aK24TQNO1'), fe(9, '1VCpFMy_1JK9MunUWV-Pz4XFz82iaDK_c'), fe(10, '1HJAwDKVcwoaSDMakR1cLH6yzwAdk3nNC'),
        fe(11, '1KfdPBq4hNbnU-bl0BMDWkK9DneTgpOKI'), fe(12, '1m1lSmmw7tYB6CzVJCCvk-tj0UnbZKGe8'), fe(13, '14hYXKFQUjNVaccLLHDkAFO9VcNcUSEh3'), fe(14, '1dWbZEWszJ1Np1qvQOjZNodhkJCZhTvyL'), fe(15, '1YM_mB9Zk3h-0lt3IQZjTGZQv8aSYMbcF'),
        fe(16, '1E7JIPfYtvKnJryutQI0TGlfY6ywgVSHQ'), fe(17, '1ZOs8iS6oi4wxGFSopIvxdkkpxCmX0b2K'), fe(18, '1pSaccu_nOK_Vta10gaRFoVcM83hQZvAA'), fe(19, '1PnPCaEO1SoVTbLKgmFhDclzeD217gJAP'), fe(20, '10-HR5mQBAEBI8KRGwfSBt1b_Q1Q1Z7wv')
    ];

    ['math','science','tech_elec','tech_civil','tech_mech','tech_process'].forEach((sp: string) => add(gs(sp,'العلوم الفيزيائية'), physFERGANI));
})();

/* ── واجهة الاستعمال ── */

export const SPECIALTY_KEYS = Object.keys(examData);

export function specialty(key: string): Specialty | null {
  return examData[key] ?? null;
}

export function subjectsOf(key: string): SimSubject[] {
  return examData[key]?.subjects ?? [];
}

/**
 * كل مواضيع مادّة: الأساسي أوّلاً ثمّ الإضافية — بالترتيب نفسه الذي
 * يستعمله المحاكي، فلا يختلف ما يراه الأستاذ عمّا اعتاده الطالب.
 */
export function examPool(sub: SimSubject | null | undefined): SimExam[] {
  if (!sub) return [];
  const pool: SimExam[] = [];
  if (sub.examUrl) {
    pool.push({
      label: "موضوع أساسي (2026)",
      source: "main",
      examUrl: sub.examUrl,
      solutionUrl: sub.solutionUrl ?? null,
      duration: sub.duration,
    });
  }
  if (sub.extraExams) pool.push(...sub.extraExams);
  return pool;
}

export const SOURCE_LABEL: Record<string, string> = {
  main: "أساسي",
  nafi: "نافع",
  tamayoz: "تميز",
  fergani: "فرقاني",
  channel: "قناة",
  custom: "مخصّص",
};

/* `formatSimDuration` تعيش في `exam-session` لا هنا: عارض الامتحان
   يحتاجها ولا يحتاج جدول المواضيع، واستيرادها من هنا كان يجرّ ٥٤
   كيلوبايت من الروابط إلى حزمة كل غرفة. */
export { formatSimDuration } from "@/features/rooms/exam-sim/exam-session";

/** رابط Drive بصيغة العرض — نفس التحويل المستعمل في المحاكي */
export function toPreviewUrl(url: string): string {
  return url.trim().replace(/\/(view|edit)(\?.*)?$/, "/preview");
}

export { examData };
export default examData;
