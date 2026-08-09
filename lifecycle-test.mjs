/* اختبار دورة الحياة كاملة على المحاكي — يُكرّر بالضبط تسلسل الكتابات
   الذي تُنفّذه الواجهة (createCourse ← saveCourse ← submitForReview ←
   موافقة ← نشر ← تسجيل ← تقدّم ← تقييم ← حذف).
   npx firebase emulators:exec --only database "node lifecycle-test.mjs"  */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, update, remove, push } from 'firebase/database';
import fs from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'baczone-lifecycle-test',
  database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync('firebase-rtdb-rules.json', 'utf8') },
});
const db = (uid) => (uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database());
const out = [];
const step = async (name, fn) => {
  try { await fn(); out.push(['✔', name]); }
  catch (e) { out.push(['✘', name + ' → ' + String(e).slice(0, 200)]); }
};

await env.withSecurityRulesDisabled(async (ctx) => {
  await set(ref(ctx.database(), 'users'), {
    A: { name: 'Admin', role: 'admin' },
    T: { name: 'Teacher', role: 'teacher' },
    S: { name: 'Student', role: 'student', track: 'sciences' },
  });
});

const CID = 'course1';
const row = (status, extra = {}) => ({
  title: 'الدوال العددية', shortDesc: 'ملخّص', fullDesc: null, coverUrl: null,
  subject: 'math', branches: { sciences: true, math: true }, level: 'advanced',
  outcomes: ['حلّ التمارين'], teacherId: 'T', teacherName: 'Teacher',
  type: 'paid', price: 1500, oldPrice: 2500,
  sections: [{ id: 's1', title: 'القسم', lessons: [{ id: 'l1', title: 'درس', kind: 'video', preview: true }] }],
  lessonCount: 1, totalDuration: 20, status, createdAt: Date.now(), updatedAt: Date.now(), ...extra,
});

// ١ · إنشاء (createCourse: courses ← courseContent ← teacherCourses)
await step('الأستاذ يُنشئ مسوّدة', () => assertSucceeds(set(ref(db('T'), `courses/${CID}`), row('draft'))));
await step('… ثمّ يكتب روابط الدروس', () => assertSucceeds(set(ref(db('T'), `courseContent/${CID}`), { l1: { url: 'https://youtu.be/abcdefg' } })));
await step('… ثمّ يُفهرسها باسمه', () => assertSucceeds(set(ref(db('T'), `teacherCourses/T/${CID}`), Date.now())));
await step('الأستاذ يقرأ فهرس دوراته', () => assertSucceeds(get(ref(db('T'), 'teacherCourses/T'))));

// ٢ · حفظ المسوّدة (saveCourse: update بالحقول + set للمحتوى)
await step('حفظ تعديل على المسوّدة', () => assertSucceeds(update(ref(db('T'), `courses/${CID}`), { title: 'الدوال — نسخة ٢', price: 1800, oldPrice: null, updatedAt: Date.now() })));
await step('حفظ تعديل على المحتوى', () => assertSucceeds(set(ref(db('T'), `courseContent/${CID}`), { l1: { url: 'https://youtu.be/abcdefg', resourceUrl: 'https://x/y.pdf' } })));

// ٣ · إرسال للمراجعة
await step('إرسال للمراجعة', () => assertSucceeds(update(ref(db('T'), `courses/${CID}`), { status: 'submitted', submittedAt: Date.now(), updatedAt: Date.now(), rejectReason: null })));
await step('الأستاذ لا يعدّل بعد الإرسال', () => assertFails(update(ref(db('T'), `courses/${CID}`), { title: 'تسلّل' })));
await step('إشعار الإدارة (استعلام users بالدور)', () => assertSucceeds(get(ref(db('T'), 'users'))));
await step('إشعار يصل حساب الأدمن', () => assertSucceeds(push(ref(db('T'), 'notifications/A'), { type: 'course-submitted', text: 'دورة جديدة', link: '/admin?tab=courses', read: false, createdAt: Date.now() })));

// ٤ · المراجعة والمحادثة
await step('الأدمن يبدأ المراجعة', () => assertSucceeds(update(ref(db('A'), `courses/${CID}`), { status: 'review', updatedAt: Date.now() })));
await step('الأدمن يطلب تعديلات', () => assertSucceeds(update(ref(db('A'), `courses/${CID}`), { status: 'changes', updatedAt: Date.now(), rejectReason: null })));
await step('الأستاذ يعدّل بعد طلب التعديلات', () => assertSucceeds(update(ref(db('T'), `courses/${CID}`), { title: 'الدوال العددية — نهائي', updatedAt: Date.now() })));
await step('الأستاذ يعيد الإرسال', () => assertSucceeds(update(ref(db('T'), `courses/${CID}`), { status: 'submitted', submittedAt: Date.now(), updatedAt: Date.now(), rejectReason: null })));
await step('الأدمن يوافق', () => assertSucceeds(update(ref(db('A'), `courses/${CID}`), { status: 'approved', updatedAt: Date.now(), rejectReason: null })));

// ٥ · النشر
await step('الأدمن ينشر (نسخة عامّة + تحديث الحالة)', async () => {
  await assertSucceeds(set(ref(db('A'), `coursesPublic/${CID}`), { ...row('published'), publishedAt: Date.now() }));
  await assertSucceeds(update(ref(db('A'), `courses/${CID}`), { status: 'published', publishedAt: Date.now(), updatedAt: Date.now(), rejectReason: null }));
});
await step('الزائر يرى الدورة المنشورة', () => assertSucceeds(get(ref(db(null), `coursesPublic/${CID}`))));

// ٦ · الشراء اليدوي والوصول
await step('الأدمن يولّد كود وصول', () => assertSucceeds(set(ref(db('A'), 'accessCodes/code1'), {
  code: 'BZ-AAAA-BBBB', itemType: 'course', itemId: CID, itemTitle: 'الدوال', price: 1800,
  commissionPct: 10, ownerId: 'T', ownerName: 'Teacher', createdBy: 'A', createdAt: Date.now() })));
await step('الطالب يبحث عن الكود', () => assertSucceeds(get(ref(db('S'), 'accessCodes'))));
await step('الطالب يستبدل ويُمنح الوصول', async () => {
  await assertSucceeds(update(ref(db('S'), 'accessCodes/code1'), { redeemedBy: 'S', redeemedName: 'Student', redeemedAt: Date.now() }));
  await assertSucceeds(set(ref(db('S'), `userAccess/S/course/${CID}`), 'code1'));
  await assertSucceeds(set(ref(db('S'), `purchases/S/course/${CID}`), 'code1'));
});
await step('الطالب يقرأ روابط الدروس بعد الشراء', () => assertSucceeds(get(ref(db('S'), `courseContent/${CID}`))));
await step('الطالب يقرأ حالة وصوله', () => assertSucceeds(get(ref(db('S'), `userAccess/S/course/${CID}`))));

// ٧ · التقدّم
await step('الطالب يُنهي درساً (setLessonDone)', () => assertSucceeds(update(ref(db('S'), `courseProgress/S/${CID}`), { completed: { l1: true }, lastLesson: 'l1', percent: 100, lastActivity: Date.now() })));
await step('الطالب يقرأ كل تقدّمه', () => assertSucceeds(get(ref(db('S'), 'courseProgress/S'))));

// ٨ · التقييم
await step('المشتري يكتب تقييمه', () => assertSucceeds(set(ref(db('S'), `courseReviews/${CID}/S`), { stars: 5, name: 'Student', at: Date.now(), comment: 'ممتازة' })));
await step('المشتري يعدّل تقييمه', () => assertSucceeds(set(ref(db('S'), `courseReviews/${CID}/S`), { stars: 4, name: 'Student', at: Date.now() - 1000, updatedAt: Date.now(), comment: 'جيّدة' })));
await step('الجميع يقرأ التقييمات', () => assertSucceeds(get(ref(db(null), 'courseReviews'))));

// ٩ · إيقاف النشر ثمّ الحذف
await step('الأدمن يوقف النشر', async () => {
  await assertSucceeds(remove(ref(db('A'), `coursesPublic/${CID}`)));
  await assertSucceeds(update(ref(db('A'), `courses/${CID}`), { status: 'unpublished', updatedAt: Date.now() }));
});
await step('الأدمن يسترجع الوصول عند الحاجة', async () => {
  await assertSucceeds(remove(ref(db('A'), `purchases/S/course/${CID}`)));
  await assertSucceeds(remove(ref(db('A'), `userAccess/S/course/${CID}`)));
});

// ١٠ · حذف مسوّدة الأستاذ بالترتيب الصحيح
await step('الأستاذ يحذف مسوّدة بالكامل بلا بقايا', async () => {
  const D = 'draft2';
  await assertSucceeds(set(ref(db('T'), `courses/${D}`), row('draft')));
  await assertSucceeds(set(ref(db('T'), `courseContent/${D}`), { l1: { url: 'https://x' } }));
  await assertSucceeds(set(ref(db('T'), `teacherCourses/T/${D}`), Date.now()));
  // الترتيب المستعمل في deleteCourse: المحتوى أوّلاً ثمّ الصفّ
  await assertSucceeds(remove(ref(db('T'), `courseContent/${D}`)));
  await assertSucceeds(remove(ref(db('T'), `teacherCourses/T/${D}`)));
  await assertSucceeds(remove(ref(db('T'), `courses/${D}`)));
});

await env.cleanup();
for (const [s, n] of out) console.log(`${s} ${n}`);
const bad = out.filter((r) => r[0] === '✘');
console.log(`\n${out.length - bad.length}/${out.length} خطوة ناجحة`);
process.exit(bad.length ? 1 : 0);
