/* ════════════════════════════════════════════════════════════
   «منذ متى» — صيغة واحدة للمنصّة كلّها

   كانت ثلاث دوالّ متطابقة المنطق مختلفة الصياغة: الرئيسية تقول
   «منذ ٥ دقيقة»، والمجتمع «٥ د»، والمكتبة «منذ ٣ يوم». المستخدم
   نفسه يقرأ الوقت نفسه بثلاث لغات في ثلاث صفحات.

   وفيها خطأ لغويّ مشترك: «منذ ٣ يوم» و«منذ ١١ ساعة» — العربية
   تُجمع بعد الثلاثة وتُفرد بعد العشرة. هنا تصريف صحيح.
   ════════════════════════════════════════════════════════════ */

function arabicPlural(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** «الآن» · «منذ ٣ دقائق» · «منذ ساعتين» · «منذ ١٢ يوماً» */
export function timeAgo(ts?: number | null): string {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 45) return "الآن";

  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${arabicPlural(min, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${arabicPlural(hr, "ساعة", "ساعتين", "ساعات", "ساعة")}`;

  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${arabicPlural(day, "يوم", "يومين", "أيّام", "يوماً")}`;

  const mo = Math.floor(day / 30);
  if (mo < 12) return `منذ ${arabicPlural(mo, "شهر", "شهرين", "أشهر", "شهراً")}`;

  const yr = Math.floor(mo / 12);
  return `منذ ${arabicPlural(yr, "سنة", "سنتين", "سنوات", "سنة")}`;
}

/** صيغة مضغوطة للأماكن الضيّقة: «٥د» · «٣س» · «٢ي» */
export function timeAgoShort(ts?: number | null): string {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 45) return "الآن";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}س`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}ي`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}ش`;
  return `${Math.floor(mo / 12)}سنة`;
}
