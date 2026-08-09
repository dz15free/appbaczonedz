/* اختبار قواعد الأمان على محاكي Firebase — يُشغَّل يدوياً عند الحاجة:
   npx firebase emulators:exec --only database "node rules-test.mjs"        */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, update, remove } from 'firebase/database';
import fs from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'baczone-rules-test',
  database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync('firebase-rtdb-rules.json', 'utf8') },
});

const results = [];
const t = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name + ' → ' + String(e).slice(0, 180)]); }
};

const db = (uid) => (uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database());

// ── بيانات أساسية (بصلاحيات إدارية، تجاوز القواعد) ──
await env.withSecurityRulesDisabled(async (ctx) => {
  const d = ctx.database();
  await set(ref(d, 'users'), {
    admin1:   { name: 'Admin',   role: 'admin' },
    teach1:   { name: 'Teacher', role: 'teacher' },
    teach2:   { name: 'Other',   role: 'teacher' },
    stud1:    { name: 'Student', role: 'student', track: 'sciences' },
    stud2:    { name: 'Student2', role: 'student' },
  });
  await set(ref(d, 'courses/cPaid'), {
    title: 'دورة مدفوعة', teacherId: 'teach1', teacherName: 'Teacher',
    status: 'published', type: 'paid', price: 2000, subject: 'math', createdAt: 1,
  });
  await set(ref(d, 'courses/cFree'), {
    title: 'دورة مجانية', teacherId: 'teach1', teacherName: 'Teacher',
    status: 'published', type: 'free', subject: 'math', createdAt: 1,
  });
  await set(ref(d, 'courses/cDraft'), {
    title: 'مسودة', teacherId: 'teach1', teacherName: 'Teacher',
    status: 'draft', type: 'free', subject: 'math', createdAt: 1,
  });
  await set(ref(d, 'coursesPublic/cPaid'), { title: 'دورة مدفوعة', teacherId: 'teach1', status: 'published', type: 'paid', price: 2000 });
  await set(ref(d, 'coursesPublic/cFree'), { title: 'دورة مجانية', teacherId: 'teach1', status: 'published', type: 'free' });
  await set(ref(d, 'courseContent/cPaid'), { l1: { url: 'https://secret.example/video' } });
  await set(ref(d, 'courseContent/cFree'), { l1: { url: 'https://free.example/video' } });
  await set(ref(d, 'library/lib1'), { title: 'ملخص', fileUrl: 'https://x', uploaderId: 'teach2', isPaid: true, price: 500 });
});

/* ═════ ١ · النشر الذاتي ═════ */
await t('الأستاذ لا يكتب في coursesPublic (لا نشر ذاتي)', () =>
  assertFails(set(ref(db('teach1'), 'coursesPublic/cDraft'), { title: 'x', teacherId: 'teach1', status: 'published' })));
await t('الأستاذ لا يضع حالة published على دورته', () =>
  assertFails(update(ref(db('teach1'), 'courses/cDraft'), { status: 'published' })));
await t('الأستاذ يرسل للمراجعة (draft → submitted)', () =>
  assertSucceeds(update(ref(db('teach1'), 'courses/cDraft'), { status: 'submitted' })));
await t('الأدمن ينشر في coursesPublic', () =>
  assertSucceeds(set(ref(db('admin1'), 'coursesPublic/cDraft'), { title: 'x', teacherId: 'teach1', status: 'published' })));

/* ═════ ٢ · سرّية المسوّدات ═════ */
await t('الطالب لا يقرأ سجلّ دورة ليست له', () =>
  assertFails(get(ref(db('stud1'), 'courses/cDraft'))));
await t('الطالب لا يسرد كل الدورات', () =>
  assertFails(get(ref(db('stud1'), 'courses'))));
await t('صاحب الدورة يقرأ مسوّدته', () =>
  assertSucceeds(get(ref(db('teach1'), 'courses/cDraft'))));
await t('الأدمن يسرد كل الدورات', () =>
  assertSucceeds(get(ref(db('admin1'), 'courses'))));
await t('الجميع يقرأ الكتالوج العامّ بلا حساب', () =>
  assertSucceeds(get(ref(db(null), 'coursesPublic'))));

/* ═════ ٣ · روابط الدروس ═════ */
await t('غير المشترك لا يقرأ روابط دورة مدفوعة', () =>
  assertFails(get(ref(db('stud1'), 'courseContent/cPaid'))));
await t('زائر بلا حساب لا يقرأ روابط الدروس', () =>
  assertFails(get(ref(db(null), 'courseContent/cFree'))));
await t('صاحب الدورة يقرأ روابط دروسه', () =>
  assertSucceeds(get(ref(db('teach1'), 'courseContent/cPaid'))));
await t('أستاذ آخر لا يعدّل محتوى دورة غيره', () =>
  assertFails(set(ref(db('teach2'), 'courseContent/cDraft'), { l1: { url: 'https://evil' } })));

/* ═════ ٤ · التسجيل المجّاني ═════ */
await t('الطالب يسجّل في دورة مجّانية منشورة', () =>
  assertSucceeds(set(ref(db('stud1'), 'courseEnrollments/cFree/stud1'), { at: Date.now(), name: 'Student' })));
await t('التسجيل يفتح روابط الدورة المجّانية', () =>
  assertSucceeds(get(ref(db('stud1'), 'courseContent/cFree'))));
await t('التسجيل في دورة مدفوعة مرفوض', () =>
  assertFails(set(ref(db('stud1'), 'courseEnrollments/cPaid/stud1'), { at: Date.now() })));
await t('الطالب لا يسجّل غيره', () =>
  assertFails(set(ref(db('stud1'), 'courseEnrollments/cFree/stud2'), { at: Date.now() })));

/* ═════ ٥ · منح الوصول لنفسه ═════ */
await t('الطالب لا يكتب userAccess بلا كود', () =>
  assertFails(set(ref(db('stud1'), 'userAccess/stud1/course/cPaid'), 'fake')));
await t('الطالب لا يكتب purchases بلا كود', () =>
  assertFails(set(ref(db('stud1'), 'purchases/stud1/course/cPaid'), 'fake')));
await t('«أستاذ» لا يولّد كود وصول لدورة غيره', () =>
  assertFails(set(ref(db('teach2'), 'accessCodes/evil'), {
    code: 'BZ-EVIL', itemType: 'course', itemId: 'cPaid', itemTitle: 'x',
    price: 0, commissionPct: 0, ownerId: 'teach2', ownerName: 'Other', createdBy: 'teach2', createdAt: Date.now() })));
await t('«أستاذ» لا ينتحل createdBy لغيره', () =>
  assertFails(set(ref(db('teach2'), 'accessCodes/evil2'), {
    code: 'BZ-EVIL2', itemType: 'library', itemId: 'lib1', itemTitle: 'x',
    price: 0, commissionPct: 0, ownerId: 'teach2', ownerName: 'Other', createdBy: 'teach1', createdAt: Date.now() })));
await t('صاحب المحتوى يولّد كوداً لمحتواه', () =>
  assertSucceeds(set(ref(db('teach2'), 'accessCodes/ok1'), {
    code: 'BZ-OK1', itemType: 'library', itemId: 'lib1', itemTitle: 'ملخص',
    price: 500, commissionPct: 10, ownerId: 'teach2', ownerName: 'Other', createdBy: 'teach2', createdAt: Date.now() })));
await t('الأدمن يولّد كوداً لدورة أستاذ', () =>
  assertSucceeds(set(ref(db('admin1'), 'accessCodes/ok2'), {
    code: 'BZ-OK2', itemType: 'course', itemId: 'cPaid', itemTitle: 'دورة مدفوعة',
    price: 2000, commissionPct: 10, ownerId: 'teach1', ownerName: 'Teacher', createdBy: 'admin1', createdAt: Date.now() })));
await t('الطالب يستبدل الكود ثمّ يُمنح الوصول', async () => {
  await assertSucceeds(update(ref(db('stud1'), 'accessCodes/ok2'), { redeemedBy: 'stud1', redeemedName: 'S', redeemedAt: Date.now() }));
  await assertSucceeds(set(ref(db('stud1'), 'userAccess/stud1/course/cPaid'), 'ok2'));
  await assertSucceeds(set(ref(db('stud1'), 'purchases/stud1/course/cPaid'), 'ok2'));
  await assertSucceeds(get(ref(db('stud1'), 'courseContent/cPaid')));
});
await t('الطالب لا يعيد توجيه كود إلى عنصر آخر', () =>
  assertFails(update(ref(db('stud2'), 'accessCodes/ok1'), { redeemedBy: 'stud2', itemId: 'cPaid', itemType: 'course' })));
await t('كود مستهلَك لا يُقفل على حساب ثانٍ', () =>
  assertFails(update(ref(db('stud2'), 'accessCodes/ok2'), { redeemedBy: 'stud2' })));

/* ═════ ٦ · التقييمات ═════ */
await t('غير المؤهَّل لا يكتب تقييماً', () =>
  assertFails(set(ref(db('stud2'), 'courseReviews/cFree/stud2'), { stars: 5, name: 'S2', at: Date.now() })));
await t('المسجَّل يكتب تقييمه', () =>
  assertSucceeds(set(ref(db('stud1'), 'courseReviews/cFree/stud1'), { stars: 5, name: 'S', at: Date.now(), comment: 'ممتازة' })));
await t('لا يكتب تقييماً باسم غيره', () =>
  assertFails(set(ref(db('stud1'), 'courseReviews/cFree/stud2'), { stars: 1, name: 'x', at: Date.now() })));
await t('نجوم خارج ١..٥ مرفوضة', () =>
  assertFails(set(ref(db('stud1'), 'courseReviews/cFree/stud1'), { stars: 99, name: 'S', at: Date.now() })));
await t('تاريخ مستقبلي مرفوض (لا تثبيت في الرأس)', () =>
  assertFails(set(ref(db('stud1'), 'courseReviews/cFree/stud1'), { stars: 5, name: 'S', at: Date.now() + 9e11 })));
await t('الأدمن يحذف تقييماً غير لائق', () =>
  assertSucceeds(remove(ref(db('admin1'), 'courseReviews/cFree/stud1'))));

/* ═════ ٧ · التقدّم ═════ */
await t('الطالب يحدّث تقدّمه', () =>
  assertSucceeds(update(ref(db('stud1'), 'courseProgress/stud1/cFree'), { percent: 40, lastLesson: 'l1', lastActivity: Date.now() })));
await t('الطالب لا يعدّل تقدّم غيره', () =>
  assertFails(update(ref(db('stud2'), 'courseProgress/stud1/cFree'), { percent: 100 })));
await t('الطالب لا يقرأ تقدّم غيره', () =>
  assertFails(get(ref(db('stud2'), 'courseProgress/stud1'))));
await t('نسبة > ١٠٠ مرفوضة', () =>
  assertFails(update(ref(db('stud1'), 'courseProgress/stud1/cFree'), { percent: 500 })));

/* ═════ ٨ · ملكية الدورة والسعر ═════ */
await t('أستاذ لا يعدّل دورة غيره', () =>
  assertFails(update(ref(db('teach2'), 'courses/cDraft'), { title: 'اختطاف' })));
await t('أستاذ لا يعدّل سعر دورة منشورة', () =>
  assertFails(update(ref(db('teach1'), 'courses/cPaid'), { price: 1 })));
await t('أستاذ لا يحذف دورة منشورة', () =>
  assertFails(remove(ref(db('teach1'), 'courses/cPaid'))));
await t('أستاذ لا ينقل ملكية دورته لغيره', () =>
  assertFails(update(ref(db('teach1'), 'courses/cDraft'), { teacherId: 'teach2' })));

/* ═════ ٩ · محادثة المراجعة ═════ */
await t('الأدمن يكتب ملاحظة مراجعة', () =>
  assertSucceeds(set(ref(db('admin1'), 'courseReviewThreads/cDraft/m1'), { byUid: 'admin1', byName: 'Admin', byRole: 'admin', text: 'عدّل الفيديو الثالث', at: Date.now() })));
await t('صاحب الدورة يردّ', () =>
  assertSucceeds(set(ref(db('teach1'), 'courseReviewThreads/cDraft/m2'), { byUid: 'teach1', byName: 'T', byRole: 'teacher', text: 'تمّ', at: Date.now() })));
await t('الأستاذ لا يمحو ملاحظة الإدارة', () =>
  assertFails(remove(ref(db('teach1'), 'courseReviewThreads/cDraft/m1'))));
await t('طالب لا يقرأ محادثة المراجعة', () =>
  assertFails(get(ref(db('stud1'), 'courseReviewThreads/cDraft'))));
await t('أستاذ آخر لا يقرأ محادثة مراجعة غيره', () =>
  assertFails(get(ref(db('teach2'), 'courseReviewThreads/cDraft'))));

/* ═════ ١٠ · لا انحدار في الأنظمة القائمة ═════ */
await t('المكتبة تبقى مقروءة للمسجّلين', () =>
  assertSucceeds(get(ref(db('stud1'), 'library'))));
await t('الطالب لا يرقّي نفسه إلى أدمن', () =>
  assertFails(update(ref(db('stud1'), 'users/stud1'), { role: 'admin' })));

await env.cleanup();

const fail = results.filter((r) => r[0] === 'FAIL');
for (const [s, n] of results) console.log(`${s === 'PASS' ? '✔' : '✘'} ${n}`);
console.log(`\n${results.length - fail.length}/${results.length} اختباراً ناجحاً`);
process.exit(fail.length ? 1 : 0);
