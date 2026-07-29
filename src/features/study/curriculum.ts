/* ════════════════════════════════════════════════════════════
   برنامج السنة الثالثة ثانوي — الدروس الرسمية

   مصدره ملفّ المناهج الذي أرسلتَه، منقولاً حرفياً بلا أي تأليف:
   لم أُضف درساً واحداً من عندي، لأنّ خطأً في المنهج يجعل الطالب يبني
   تقدّمه على برنامج غير صحيح — وهو أسوأ من غياب الميزة.

   استُبعدت التربية البدنية والتشكيلية كما طلبت.

   ⚠️ التغطية ناقصة عمداً: ما ليس في الملفّ ليس هنا. راجع
   `STREAM_COVERAGE` أدناه قبل الاعتماد على شعبة.
════════════════════════════════════════════════════════════ */

export interface Lesson {
  id: string;
  title: string;
  unit: string;
  subject: string;
  stream: string;
  order: number;
  trimester: number;
}

export const LESSONS: Lesson[] = [
  { id: "LIT_PHI_U1_L1", title: "الإحساس والإدراك", unit: "إدراك العالم الخارجي", subject: "الفلسفة", stream: "آداب وفلسفة", order: 1, trimester: 1 },
  { id: "LIT_PHI_U1_L2", title: "اللغة والفكر", unit: "إدراك العالم الخارجي", subject: "الفلسفة", stream: "آداب وفلسفة", order: 2, trimester: 1 },
  { id: "LIT_PHI_U1_L3", title: "الشعور واللاشعور", unit: "إدراك العالم الخارجي", subject: "الفلسفة", stream: "آداب وفلسفة", order: 3, trimester: 1 },
  { id: "LIT_PHI_U1_L4", title: "الذاكرة والخيال", unit: "إدراك العالم الخارجي", subject: "الفلسفة", stream: "آداب وفلسفة", order: 4, trimester: 1 },
  { id: "LIT_PHI_U1_L5", title: "العادة والإرادة", unit: "إدراك العالم الخارجي", subject: "الفلسفة", stream: "آداب وفلسفة", order: 5, trimester: 1 },
  { id: "LIT_PHI_U2_L6", title: "الأخلاق بين الثوابت والمتغيرات", unit: "الأخلاق الموضوعية والأخلاق النسبية", subject: "الفلسفة", stream: "آداب وفلسفة", order: 6, trimester: 2 },
  { id: "LIT_PHI_U2_L7", title: "الحقوق والواجبات والعدل", unit: "الأخلاق الموضوعية والأخلاق النسبية", subject: "الفلسفة", stream: "آداب وفلسفة", order: 7, trimester: 2 },
  { id: "LIT_PHI_U2_L8", title: "العلاقات الأسرية والنظم الاقتصادية (الشغل)", unit: "الأخلاق الموضوعية والأخلاق النسبية", subject: "الفلسفة", stream: "آداب وفلسفة", order: 8, trimester: 2 },
  { id: "LIT_PHI_U2_L9", title: "الأنظمة السياسية (الدولة)", unit: "الأخلاق الموضوعية والأخلاق النسبية", subject: "الفلسفة", stream: "آداب وفلسفة", order: 9, trimester: 2 },
  { id: "LIT_PHI_U3_L10", title: "الحقيقة العلمية والحقيقة الفلسفية", unit: "فلسفة العلوم", subject: "الفلسفة", stream: "آداب وفلسفة", order: 10, trimester: 3 },
  { id: "LIT_PHI_U3_L11", title: "الرياضيات والمطلقية", unit: "فلسفة العلوم", subject: "الفلسفة", stream: "آداب وفلسفة", order: 11, trimester: 3 },
  { id: "LIT_PHI_U3_L12", title: "العلوم التجريبية والبيولوجية", unit: "فلسفة العلوم", subject: "الفلسفة", stream: "آداب وفلسفة", order: 12, trimester: 3 },
  { id: "LIT_PHI_U3_L13", title: "العلوم الإنسانية (التاريخ، علم الاجتماع، علم النفس)", unit: "فلسفة العلوم", subject: "الفلسفة", stream: "آداب وفلسفة", order: 13, trimester: 3 },
  { id: "LIT_ARA_U1_L1", title: "الشعر التعليمي وتيار الزهد", unit: "عصر الضعف والانحطاط", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 1, trimester: 1 },
  { id: "LIT_ARA_U1_L2", title: "المدائح النبوية", unit: "عصر الضعف والانحطاط", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 2, trimester: 1 },
  { id: "LIT_ARA_U1_L3", title: "النثر العلمي المتأدب", unit: "عصر الضعف والانحطاط", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 3, trimester: 1 },
  { id: "LIT_ARA_U2_L4", title: "مدرسة الإحياء والبعث الكلاسيكية", unit: "عصر النهضة الحديثة", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 4, trimester: 1 },
  { id: "LIT_ARA_U2_L5", title: "الشعر المهجري والمذهب الرومانسي", unit: "عصر النهضة الحديثة", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 5, trimester: 1 },
  { id: "LIT_ARA_U3_L6", title: "الشعر السياسي والقومي الملتزم", unit: "الأدب الملتزم", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 6, trimester: 2 },
  { id: "LIT_ARA_U3_L7", title: "الثورة الجزائرية في الشعر العربي", unit: "الأدب الملتزم", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 7, trimester: 2 },
  { id: "LIT_ARA_U3_L8", title: "القضية الفلسطينية", unit: "الأدب الملتزم", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 8, trimester: 2 },
  { id: "LIT_ARA_U4_L9", title: "شعر التفعيلة (الشعر الحر)", unit: "التجديد في الشعر", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 9, trimester: 2 },
  { id: "LIT_ARA_U4_L10", title: "ظاهرة الحزن والألم في الشعر المعاصر", unit: "التجديد في الشعر", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 10, trimester: 2 },
  { id: "LIT_ARA_U5_L11", title: "فن المقال (أنواعه، خصائصه، رواده)", unit: "الفنون النثرية الحديثة", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 11, trimester: 3 },
  { id: "LIT_ARA_U5_L12", title: "فن القصة القصيرة والرواية", unit: "الفنون النثرية الحديثة", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 12, trimester: 3 },
  { id: "LIT_ARA_U5_L13", title: "فن المسرحية", unit: "الفنون النثرية الحديثة", subject: "اللغة العربية وآدابها", stream: "آداب وفلسفة", order: 13, trimester: 3 },
  { id: "ECO_MAN_U1_L1", title: "المبادلات الدولية", unit: "العلاقات الاقتصادية الدولية", subject: "الاقتصاد والمناجمنت", stream: "تسيير واقتصاد", order: 1, trimester: 1 },
  { id: "ECO_MAN_U2_L2", title: "النظام المصرفي", unit: "النقود والتمويل", subject: "الاقتصاد والمناجمنت", stream: "تسيير واقتصاد", order: 2, trimester: 1 },
  { id: "ECO_MAN_U3_L3", title: "البطالة", unit: "الظواهر الاقتصادية", subject: "الاقتصاد والمناجمنت", stream: "تسيير واقتصاد", order: 3, trimester: 2 },
  { id: "ECO_MAN_U4_L4", title: "التضخم", unit: "الظواهر الاقتصادية", subject: "الاقتصاد والمناجمنت", stream: "تسيير واقتصاد", order: 4, trimester: 2 },
  { id: "ECO_MAN_U5_L5", title: "القيادة", unit: "وظائف المناجمنت", subject: "الاقتصاد والمناجمنت", stream: "تسيير واقتصاد", order: 5, trimester: 3 },
  { id: "ECO_MAN_U6_L6", title: "الاتصال", unit: "وظائف المناجمنت", subject: "الاقتصاد والمناجمنت", stream: "تسيير واقتصاد", order: 6, trimester: 3 },
  { id: "ECO_ACC_U1_L1", title: "تقديم أعمال نهاية السنة", unit: "أعمال نهاية السنة", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 1, trimester: 1 },
  { id: "ECO_ACC_U2_L2", title: "الاهتلاكات ونقص قيمة التثبيتات", unit: "أعمال نهاية السنة", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 2, trimester: 1 },
  { id: "ECO_ACC_U3_L3", title: "تسوية المخزونات", unit: "أعمال نهاية السنة", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 3, trimester: 1 },
  { id: "ECO_ACC_U4_L4", title: "تسوية عناصر الأصول الأخرى (الزبائن والقيم المنقولة للتوظيف)", unit: "أعمال نهاية السنة", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 4, trimester: 1 },
  { id: "ECO_ACC_U5_L5", title: "مؤونات الأخطار والأعباء وتسوية الأعباء والمنتوجات", unit: "أعمال نهاية السنة", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 5, trimester: 1 },
  { id: "ECO_ACC_U6_L6", title: "إعداد الكشوف المالية وتحليلها (الميزانية الوظيفية)", unit: "تحليل الكشوف المالية", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 6, trimester: 2 },
  { id: "ECO_ACC_U7_L7", title: "تحليل حساب النتائج (حسب الطبيعة وحسب الوظيفة)", unit: "تحليل الكشوف المالية", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 7, trimester: 2 },
  { id: "ECO_ACC_U8_L8", title: "المحاسبة التحليلية (حساب التكاليف الكلية والنتيجة التحليلية)", unit: "المحاسبة التحليلية للاستغلال", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 8, trimester: 3 },
  { id: "ECO_ACC_U9_L9", title: "حساب التكاليف الجزئية (التكاليف المتغيرة والهامش على التكلفة)", unit: "المحاسبة التحليلية للاستغلال", subject: "التسيير المحاسبي والمالي", stream: "تسيير واقتصاد", order: 9, trimester: 3 },
  { id: "ECO_LAW_U1_L1", title: "عقد البيع", unit: "العقود والشركات التجارية", subject: "القانون", stream: "تسيير واقتصاد", order: 1, trimester: 1 },
  { id: "ECO_LAW_U2_L2", title: "الشركة التجارية", unit: "العقود والشركات التجارية", subject: "القانون", stream: "تسيير واقتصاد", order: 2, trimester: 1 },
  { id: "ECO_LAW_U3_L3", title: "شركات الأشخاص وشركات الأموال", unit: "العقود والشركات التجارية", subject: "القانون", stream: "تسيير واقتصاد", order: 3, trimester: 1 },
  { id: "ECO_LAW_U4_L4", title: "علاقات العمل الفردية", unit: "علاقات العمل الفردية والجماعية", subject: "القانون", stream: "تسيير واقتصاد", order: 4, trimester: 2 },
  { id: "ECO_LAW_U5_L5", title: "علاقات العمل الجماعية", unit: "علاقات العمل الفردية والجماعية", subject: "القانون", stream: "تسيير واقتصاد", order: 5, trimester: 2 },
  { id: "ECO_LAW_U6_L6", title: "ميزانية الدولة", unit: "المالية العامة", subject: "القانون", stream: "تسيير واقتصاد", order: 6, trimester: 3 },
  { id: "ECO_LAW_U7_L7", title: "الضرائب والرسوم (الضريبة على الدخل الإجمالي والرسم على القيمة المضافة)", unit: "المالية العامة", subject: "القانون", stream: "تسيير واقتصاد", order: 7, trimester: 3 },
  { id: "MATH_MATH_U1_L1", title: "القسمة في Z", unit: "الحساب في مجموعة الأعداد الصحيحة", subject: "الرياضيات", stream: "رياضيات", order: 1, trimester: 1 },
  { id: "MATH_MATH_U1_L2", title: "الموافقات في Z", unit: "الحساب في مجموعة الأعداد الصحيحة", subject: "الرياضيات", stream: "رياضيات", order: 2, trimester: 1 },
  { id: "MATH_MATH_U1_L3", title: "الأعداد الأولية ومبرهنتا بيزو وغوص", unit: "الحساب في مجموعة الأعداد الصحيحة", subject: "الرياضيات", stream: "رياضيات", order: 3, trimester: 1 },
  { id: "MATH_PHY_U7_L19", title: "الاهتزازات الميكانيكية", unit: "الاهتزازات", subject: "العلوم الفيزيائية", stream: "رياضيات", order: 19, trimester: 3 },
  { id: "MATH_PHY_U7_L20", title: "الاهتزازات الكهربائية", unit: "الاهتزازات", subject: "العلوم الفيزيائية", stream: "رياضيات", order: 20, trimester: 3 },
  { id: "SCI_HIS_U1_L1", title: "بروز الصراع وتشكل العالم", unit: "تطور العالم في ظل الثنائية القطبية (1945-1989)", subject: "التاريخ", stream: "علوم تجريبية", order: 1, trimester: 1 },
  { id: "SCI_HIS_U1_L2", title: "مساعي الانفراج الدولي", unit: "تطور العالم في ظل الثنائية القطبية (1945-1989)", subject: "التاريخ", stream: "علوم تجريبية", order: 2, trimester: 1 },
  { id: "SCI_HIS_U1_L3", title: "من الثنائية إلى الأحادية القطبية", unit: "تطور العالم في ظل الثنائية القطبية (1945-1989)", subject: "التاريخ", stream: "علوم تجريبية", order: 3, trimester: 1 },
  { id: "SCI_HIS_U2_L4", title: "من تبلور الوعي الوطني إلى الثورة التحريرية", unit: "الجزائر بين 1945 و 1989", subject: "التاريخ", stream: "علوم تجريبية", order: 4, trimester: 2 },
  { id: "SCI_HIS_U2_L5", title: "العمل المسلح ورد فعل الاستعمار", unit: "الجزائر بين 1945 و 1989", subject: "التاريخ", stream: "علوم تجريبية", order: 5, trimester: 2 },
  { id: "SCI_HIS_U2_L6", title: "استعادة السيادة الوطنية وبناء الدولة الجزائرية", unit: "الجزائر بين 1945 و 1989", subject: "التاريخ", stream: "علوم تجريبية", order: 6, trimester: 2 },
  { id: "SCI_HIS_U2_L7", title: "تأثير الجزائر وإسهامها في حركات التحرر", unit: "الجزائر بين 1945 و 1989", subject: "التاريخ", stream: "علوم تجريبية", order: 7, trimester: 3 },
  { id: "SCI_HIS_U3_L8", title: "العالم الثالث بين تراجع الاستعمار التقليدي واستمرارية حركات التحرر", unit: "التطورات في العالم الثالث (1945-1989)", subject: "التاريخ", stream: "علوم تجريبية", order: 8, trimester: 3 },
  { id: "SCI_HIS_U3_L9", title: "فلسطين من تصفية الاستعمار التقليدي إلى الهيمنة الأحادية", unit: "التطورات في العالم الثالث (1945-1989)", subject: "التاريخ", stream: "علوم تجريبية", order: 9, trimester: 3 },
  { id: "SCI_GEO_U1_L1", title: "إشكالية التقدم والتخلف", unit: "واقع الاقتصاد العالمي", subject: "الجغرافيا", stream: "علوم تجريبية", order: 1, trimester: 1 },
  { id: "SCI_GEO_U1_L2", title: "المبادلات والتنقلات في العالم", unit: "واقع الاقتصاد العالمي", subject: "الجغرافيا", stream: "علوم تجريبية", order: 2, trimester: 1 },
  { id: "SCI_GEO_U2_L3", title: "مصادر القوة الاقتصادية للولايات المتحدة الأمريكية", unit: "القوى الاقتصادية الكبرى في العالم", subject: "الجغرافيا", stream: "علوم تجريبية", order: 3, trimester: 2 },
  { id: "SCI_GEO_U2_L4", title: "ظاهرة التكتل وأثرها في قوة الاتحاد الأوروبي", unit: "القوى الاقتصادية الكبرى في العالم", subject: "الجغرافيا", stream: "علوم تجريبية", order: 4, trimester: 2 },
  { id: "SCI_GEO_U2_L5", title: "العلاقة بين السكان والتنمية في شرق وجنوب شرق آسيا", unit: "القوى الاقتصادية الكبرى في العالم", subject: "الجغرافيا", stream: "علوم تجريبية", order: 5, trimester: 2 },
  { id: "SCI_GEO_U3_L6", title: "الاقتصاد الجزائري في العالم", unit: "الاقتصاد والتنمية في دول الجنوب", subject: "الجغرافيا", stream: "علوم تجريبية", order: 6, trimester: 3 },
  { id: "SCI_GEO_U3_L7", title: "الجزائر في حوض البحر الأبيض المتوسط", unit: "الاقتصاد والتنمية في دول الجنوب", subject: "الجغرافيا", stream: "علوم تجريبية", order: 7, trimester: 3 },
  { id: "SCI_MATH_U1_L1", title: "النهايات", unit: "الدوال العددية", subject: "الرياضيات", stream: "علوم تجريبية", order: 1, trimester: 1 },
  { id: "SCI_MATH_U1_L2", title: "الاستمرارية ومبرهنة القيم المتوسطة", unit: "الدوال العددية", subject: "الرياضيات", stream: "علوم تجريبية", order: 2, trimester: 1 },
  { id: "SCI_MATH_U1_L3", title: "الاشتقاقية وتطبيقاتها", unit: "الدوال العددية", subject: "الرياضيات", stream: "علوم تجريبية", order: 3, trimester: 1 },
  { id: "SCI_MATH_U2_L4", title: "دراسة الدالة الأسية", unit: "الدوال الأسية", subject: "الرياضيات", stream: "علوم تجريبية", order: 4, trimester: 1 },
  { id: "SCI_MATH_U2_L5", title: "حل المعادلات والمتراجحات الأسية", unit: "الدوال الأسية", subject: "الرياضيات", stream: "علوم تجريبية", order: 5, trimester: 1 },
  { id: "SCI_MATH_U3_L6", title: "دراسة الدالة اللوغاريتمية النيبيرية", unit: "الدوال اللوغاريتمية", subject: "الرياضيات", stream: "علوم تجريبية", order: 6, trimester: 2 },
  { id: "SCI_MATH_U3_L7", title: "التزايد المقارن", unit: "الدوال اللوغاريتمية", subject: "الرياضيات", stream: "علوم تجريبية", order: 7, trimester: 2 },
  { id: "SCI_MATH_U4_L8", title: "الاستدلال بالتراجع", unit: "المتتاليات العددية", subject: "الرياضيات", stream: "علوم تجريبية", order: 8, trimester: 2 },
  { id: "SCI_MATH_U4_L9", title: "المتتاليات المحدودة والمتقاربة", unit: "المتتاليات العددية", subject: "الرياضيات", stream: "علوم تجريبية", order: 9, trimester: 2 },
  { id: "SCI_MATH_U4_L10", title: "نهايات المتتاليات", unit: "المتتاليات العددية", subject: "الرياضيات", stream: "علوم تجريبية", order: 10, trimester: 2 },
  { id: "SCI_MATH_U5_L11", title: "الدوال الأصلية", unit: "الدوال الأصلية وحساب التكامل", subject: "الرياضيات", stream: "علوم تجريبية", order: 11, trimester: 3 },
  { id: "SCI_MATH_U5_L12", title: "حساب التكامل", unit: "الدوال الأصلية وحساب التكامل", subject: "الرياضيات", stream: "علوم تجريبية", order: 12, trimester: 3 },
  { id: "SCI_MATH_U6_L13", title: "الاحتمالات الشرطية", unit: "الاحتمالات", subject: "الرياضيات", stream: "علوم تجريبية", order: 13, trimester: 3 },
  { id: "SCI_MATH_U6_L14", title: "المتغير العشوائي وقانون الاحتمال", unit: "الاحتمالات", subject: "الرياضيات", stream: "علوم تجريبية", order: 14, trimester: 3 },
  { id: "SCI_MATH_U7_L15", title: "الجداء السلمي في الفضاء وتطبيقاته", unit: "الهندسة في الفضاء", subject: "الرياضيات", stream: "علوم تجريبية", order: 15, trimester: 3 },
  { id: "SCI_MATH_U7_L16", title: "المستقيمات والمستويات في الفضاء", unit: "الهندسة في الفضاء", subject: "الرياضيات", stream: "علوم تجريبية", order: 16, trimester: 3 },
  { id: "SCI_ISL_U1_L1", title: "العقيدة الإسلامية وأثرها على الفرد والمجتمع", unit: "العقيدة الإسلامية", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 1, trimester: 1 },
  { id: "SCI_ISL_U1_L2", title: "وسائل القرآن الكريم في تثبيت العقيدة الإسلامية", unit: "العقيدة الإسلامية", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 2, trimester: 1 },
  { id: "SCI_ISL_U2_L3", title: "الإسلام والرسالات السماوية", unit: "القرآن ومصادر التشريع", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 3, trimester: 1 },
  { id: "SCI_ISL_U2_L4", title: "العقل في القرآن الكريم", unit: "القرآن ومصادر التشريع", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 4, trimester: 1 },
  { id: "SCI_ISL_U3_L5", title: "مقاصد الشريعة الإسلامية", unit: "مقاصد الشريعة", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 5, trimester: 1 },
  { id: "SCI_ISL_U3_L6", title: "منهج الإسلام في محاربة الانحراف والجريمة", unit: "مقاصد الشريعة", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 6, trimester: 1 },
  { id: "SCI_ISL_U3_L7", title: "المساواة أمام أحكام الشريعة الإسلامية في العقوبات", unit: "مقاصد الشريعة", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 7, trimester: 2 },
  { id: "SCI_ISL_U4_L8", title: "الصحة النفسية والجسمية في القرآن الكريم", unit: "القيم والأخلاق", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 8, trimester: 2 },
  { id: "SCI_ISL_U2_L9", title: "من مصادر التشريع الإسلامي (الإجماع، القياس، المصلحة المرسلة)", unit: "القرآن ومصادر التشريع", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 9, trimester: 2 },
  { id: "SCI_ISL_U4_L10", title: "القيم في القرآن الكريم", unit: "القيم والأخلاق", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 10, trimester: 2 },
  { id: "SCI_ISL_U5_L11", title: "الوقف في الإسلام", unit: "الاقتصاد والمعاملات", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 11, trimester: 2 },
  { id: "SCI_ISL_U6_L12", title: "من أحكام الأسرة في الإسلام: مدخل إلى علم الميراث", unit: "أحكام الأسرة", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 12, trimester: 2 },
  { id: "SCI_ISL_U5_L13", title: "الربا وأحكامه", unit: "الاقتصاد والمعاملات", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 13, trimester: 3 },
  { id: "SCI_ISL_U5_L14", title: "من المعاملات المالية الجائزة", unit: "الاقتصاد والمعاملات", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 14, trimester: 3 },
  { id: "SCI_ISL_U4_L15", title: "الحرية الشخصية ومدى ارتباطها بحقوق الآخرين", unit: "القيم والأخلاق", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 15, trimester: 3 },
  { id: "SCI_ISL_U6_L16", title: "من أحكام الأسرة في الإسلام: النسب، التبني، والكفالة", unit: "أحكام الأسرة", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 16, trimester: 3 },
  { id: "SCI_ISL_U7_L17", title: "العلاقات الاجتماعية بين المسلمين وغيرهم", unit: "السيرة النبوية", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 17, trimester: 3 },
  { id: "SCI_ISL_U7_L18", title: "خطبة الرسول صلى الله عليه وسلم في حجة الوداع", unit: "السيرة النبوية", subject: "العلوم الإسلامية", stream: "علوم تجريبية", order: 18, trimester: 3 },
  { id: "SCI_PHY_U1_L1", title: "طرق المتابعة الزمنية (المعايرة، الناقلية، الضغط، الحجم)", unit: "المتابعة الزمنية لتحول كيميائي", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 1, trimester: 1 },
  { id: "SCI_PHY_U1_L2", title: "سرعة التفاعل وزمن نصف التفاعل", unit: "المتابعة الزمنية لتحول كيميائي", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 2, trimester: 1 },
  { id: "SCI_PHY_U1_L3", title: "العوامل الحركية", unit: "المتابعة الزمنية لتحول كيميائي", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 3, trimester: 1 },
  { id: "SCI_PHY_U2_L4", title: "النشاط الإشعاعي", unit: "التحولات النووية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 4, trimester: 1 },
  { id: "SCI_PHY_U2_L5", title: "التناقص الإشعاعي", unit: "التحولات النووية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 5, trimester: 1 },
  { id: "SCI_PHY_U2_L6", title: "التفاعلات النووية (الانشطار والاندماج) والطاقة المحررة", unit: "التحولات النووية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 6, trimester: 1 },
  { id: "SCI_PHY_U3_L7", title: "ثنائي القطب RC", unit: "دراسة ظواهر كهربائية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 7, trimester: 2 },
  { id: "SCI_PHY_U3_L8", title: "ثنائي القطب RL", unit: "دراسة ظواهر كهربائية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 8, trimester: 2 },
  { id: "SCI_PHY_U4_L9", title: "حالة التوازن لجملة كيميائية", unit: "تطور جملة كيميائية نحو حالة التوازن", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 9, trimester: 2 },
  { id: "SCI_PHY_U4_L10", title: "التحولات حمض-أساس", unit: "تطور جملة كيميائية نحو حالة التوازن", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 10, trimester: 2 },
  { id: "SCI_PHY_U4_L11", title: "المعايرة الـ pH-مترية", unit: "تطور جملة كيميائية نحو حالة التوازن", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 11, trimester: 2 },
  { id: "SCI_PHY_U5_L12", title: "مقاربة تاريخية لميكانيك نيوتن", unit: "تطور جملة ميكانيكية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 12, trimester: 3 },
  { id: "SCI_PHY_U5_L13", title: "قوانين نيوتن وتطبيقاتها", unit: "تطور جملة ميكانيكية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 13, trimester: 3 },
  { id: "SCI_PHY_U5_L14", title: "حركة الكواكب والأقمار الاصطناعية", unit: "تطور جملة ميكانيكية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 14, trimester: 3 },
  { id: "SCI_PHY_U5_L15", title: "السقوط الشاقولي لجسم صلب", unit: "تطور جملة ميكانيكية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 15, trimester: 3 },
  { id: "SCI_PHY_U5_L16", title: "حركة قذيفة في حقل الجاذبية", unit: "تطور جملة ميكانيكية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 16, trimester: 3 },
  { id: "SCI_PHY_U5_L17", title: "المستوي المائل والمستوي الأفقي", unit: "تطور جملة ميكانيكية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 17, trimester: 3 },
  { id: "SCI_PHY_U6_L18", title: "تفاعلات الأسترة والإماهة", unit: "مراقبة تطور جملة كيميائية", subject: "العلوم الفيزيائية", stream: "علوم تجريبية", order: 18, trimester: 3 },
  { id: "SCI_NAT_U1_L1", title: "مقر تركيب البروتين", unit: "آليات تركيب البروتين", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 1, trimester: 1 },
  { id: "SCI_NAT_U1_L2", title: "الاستنساخ", unit: "آليات تركيب البروتين", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 2, trimester: 1 },
  { id: "SCI_NAT_U1_L3", title: "الترجمة", unit: "آليات تركيب البروتين", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 3, trimester: 1 },
  { id: "SCI_NAT_U2_L4", title: "مستويات البنية الفراغية للبروتين", unit: "العلاقة بين بنية ووظيفة البروتين", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 4, trimester: 1 },
  { id: "SCI_NAT_U2_L5", title: "العلاقة بين البنية والوظيفة", unit: "العلاقة بين بنية ووظيفة البروتين", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 5, trimester: 1 },
  { id: "SCI_NAT_U3_L6", title: "مفهوم الإنزيم", unit: "النشاط الإنزيمي للبروتينات", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 6, trimester: 1 },
  { id: "SCI_NAT_U3_L7", title: "تأثير العوامل الخارجية (درجة الحرارة، الـ pH) على النشاط الإنزيمي", unit: "النشاط الإنزيمي للبروتينات", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 7, trimester: 1 },
  { id: "SCI_NAT_U4_L8", title: "الذات واللاذات (مؤشرات الزمر الدموية و CMH)", unit: "دور البروتينات في الدفاع عن الذات", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 8, trimester: 2 },
  { id: "SCI_NAT_U4_L9", title: "الاستجابة المناعية الخلطية", unit: "دور البروتينات في الدفاع عن الذات", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 9, trimester: 2 },
  { id: "SCI_NAT_U4_L10", title: "الاستجابة المناعية الخلوية", unit: "دور البروتينات في الدفاع عن الذات", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 10, trimester: 2 },
  { id: "SCI_NAT_U4_L11", title: "فقدان المناعة المكتسبة (السيدا VIH)", unit: "دور البروتينات في الدفاع عن الذات", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 11, trimester: 2 },
  { id: "SCI_NAT_U5_L12", title: "كمون الراحة", unit: "دور البروتينات في الاتصال العصبي", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 12, trimester: 2 },
  { id: "SCI_NAT_U5_L13", title: "كمون العمل", unit: "دور البروتينات في الاتصال العصبي", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 13, trimester: 2 },
  { id: "SCI_NAT_U5_L14", title: "النقل المشبكي", unit: "دور البروتينات في الاتصال العصبي", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 14, trimester: 2 },
  { id: "SCI_NAT_U5_L15", title: "الإدماج العصبي وتأثير المخدرات", unit: "دور البروتينات في الاتصال العصبي", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 15, trimester: 2 },
  { id: "SCI_NAT_U6_L16", title: "مقر التركيب الضوئي", unit: "آليات تحويل الطاقة الضوئية إلى طاقة كيميائية كامنة", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 16, trimester: 3 },
  { id: "SCI_NAT_U6_L17", title: "المرحلة الكيموضوئية", unit: "آليات تحويل الطاقة الضوئية إلى طاقة كيميائية كامنة", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 17, trimester: 3 },
  { id: "SCI_NAT_U6_L18", title: "المرحلة الكيموحيوية", unit: "آليات تحويل الطاقة الضوئية إلى طاقة كيميائية كامنة", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 18, trimester: 3 },
  { id: "SCI_NAT_U7_L19", title: "التنفس الخلوي", unit: "آليات تحويل الطاقة الكيميائية الكامنة إلى ATP", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 19, trimester: 3 },
  { id: "SCI_NAT_U7_L20", title: "التخمر", unit: "آليات تحويل الطاقة الكيميائية الكامنة إلى ATP", subject: "علوم الطبيعة والحياة", stream: "علوم تجريبية", order: 20, trimester: 3 },
  { id: "LANG_GER_U1_L1", title: "Jugend und Gesellschaft (الشباب والمجتمع)", unit: "Einheit 1: Jugend", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 1, trimester: 1 },
  { id: "LANG_GER_U1_L2", title: "Grammatik: Nebensätze (weil, da, dass, ob)", unit: "Einheit 1: Jugend", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 2, trimester: 1 },
  { id: "LANG_GER_U2_L3", title: "Massenmedien (Kommunikation und Medien)", unit: "Einheit 2: Massenmedien", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 3, trimester: 1 },
  { id: "LANG_GER_U2_L4", title: "Grammatik: Passiv (Präsens und Präteritum)", unit: "Einheit 2: Massenmedien", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 4, trimester: 1 },
  { id: "LANG_GER_U3_L5", title: "Umweltschutz (حماية البيئة)", unit: "Einheit 3: Umwelt", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 5, trimester: 2 },
  { id: "LANG_GER_U3_L6", title: "Grammatik: Relativsätze / Finalsätze (um...zu / damit)", unit: "Einheit 3: Umwelt", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 6, trimester: 2 },
  { id: "LANG_GER_U4_L7", title: "Freizeit und Reisen", unit: "Einheit 4: Tourismus", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 7, trimester: 3 },
  { id: "LANG_GER_U5_L8", title: "Technischer Fortschritt (التقدم التكنولوجي)", unit: "Einheit 5: Technik", subject: "اللغة الألمانية", stream: "لغات أجنبية", order: 8, trimester: 3 },
  { id: "LANG_ESP_U1_L1", title: "Los medios de comunicación (Los mass-media)", unit: "Unidad 1: Los mass-media", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 1, trimester: 1 },
  { id: "LANG_ESP_U1_L2", title: "Gramática: El presente de subjuntivo / La expresión de la opinión", unit: "Unidad 1: Los mass-media", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 2, trimester: 1 },
  { id: "LANG_ESP_U2_L3", title: "El mundo laboral (El trabajo y la juventud)", unit: "Unidad 2: El mundo laboral", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 3, trimester: 1 },
  { id: "LANG_ESP_U2_L4", title: "Gramática: El futuro / La condición (Si + presente)", unit: "Unidad 2: El mundo laboral", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 4, trimester: 1 },
  { id: "LANG_ESP_U3_L5", title: "El medio ambiente y la contaminación", unit: "Unidad 3: Medio ambiente", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 5, trimester: 2 },
  { id: "LANG_ESP_U3_L6", title: "Gramática: El imperativo (afirmativo y negativo) / La obligación", unit: "Unidad 3: Medio ambiente", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 6, trimester: 2 },
  { id: "LANG_ESP_U4_L7", title: "La solidaridad y la convivencia", unit: "Unidad 4: Solidaridad", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 7, trimester: 2 },
  { id: "LANG_ESP_U5_L8", title: "La guerra y la paz (Derechos humanos)", unit: "Unidad 5: Paz y guerra", subject: "اللغة الإسبانية", stream: "لغات أجنبية", order: 8, trimester: 3 },
  { id: "LANG_ENG_U1_L1", title: "Exploring the Past (Ancient Civilizations)", unit: "Unit 1: Exploring the Past", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 1, trimester: 1 },
  { id: "LANG_ENG_U1_L2", title: "The rise and fall of civilizations (Sumerians, Egyptians, Greeks...)", unit: "Unit 1: Exploring the Past", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 2, trimester: 1 },
  { id: "LANG_ENG_U1_L3", title: "Grammar: Used to / Had to / Past Perfect / Past Simple", unit: "Unit 1: Exploring the Past", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 3, trimester: 1 },
  { id: "LANG_ENG_U2_L4", title: "Ethics in Business", unit: "Unit 2: Ill-Gotten Gains Never Prosper", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 4, trimester: 1 },
  { id: "LANG_ENG_U2_L5", title: "Fraud, corruption, money laundering and counterfeiting", unit: "Unit 2: Ill-Gotten Gains Never Prosper", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 5, trimester: 1 },
  { id: "LANG_ENG_U2_L6", title: "Grammar: Conditionals (Provided that, as long as) / Expressing wish / It's high time", unit: "Unit 2: Ill-Gotten Gains Never Prosper", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 6, trimester: 1 },
  { id: "LANG_ENG_U3_L7", title: "Education in the World (Comparing educational systems)", unit: "Unit 3: Schools: Different and Alike", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 7, trimester: 2 },
  { id: "LANG_ENG_U3_L8", title: "Grammar: Expressing similarities and differences (like, whereas, unlike)", unit: "Unit 3: Schools: Different and Alike", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 8, trimester: 2 },
  { id: "LANG_ENG_U4_L9", title: "Emotions and feelings (Humour, Anger, Love)", unit: "Unit 4: Feelings and Emotions", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 9, trimester: 3 },
  { id: "LANG_ENG_U4_L10", title: "Grammar: Articles / Quantifiers / Modals", unit: "Unit 4: Feelings and Emotions", subject: "اللغة الإنجليزية", stream: "لغات أجنبية", order: 10, trimester: 3 },
  { id: "LANG_ITA_U1_L1", title: "La famiglia italiana oggi e ieri", unit: "Unità 1: La società", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 1, trimester: 1 },
  { id: "LANG_ITA_U1_L2", title: "Grammatica: Il passato prossimo e l'imperfetto", unit: "Unità 1: La società", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 2, trimester: 1 },
  { id: "LANG_ITA_U2_L3", title: "Il mondo del lavoro in Italia", unit: "Unità 2: Il lavoro", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 3, trimester: 1 },
  { id: "LANG_ITA_U2_L4", title: "Grammatica: Il futuro semplice e composto", unit: "Unità 2: Il lavoro", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 4, trimester: 1 },
  { id: "LANG_ITA_U3_L5", title: "L'inquinamento e l'ambiente", unit: "Unità 3: L'ambiente", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 5, trimester: 2 },
  { id: "LANG_ITA_U3_L6", title: "Grammatica: Il condizionale semplice e composto", unit: "Unità 3: L'ambiente", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 6, trimester: 2 },
  { id: "LANG_ITA_U4_L7", title: "I mass-media e la comunicazione", unit: "Unità 4: I mass-media", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 7, trimester: 3 },
  { id: "LANG_ITA_U4_L8", title: "Grammatica: Il congiuntivo (Presente e passato)", unit: "Unità 4: I mass-media", subject: "اللغة الإيطالية", stream: "لغات أجنبية", order: 8, trimester: 3 },
  { id: "LANG_FRE_U1_L1", title: "Le texte historique (Rapporter un fait d'histoire)", unit: "Projet 1: Le texte d'histoire", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 1, trimester: 1 },
  { id: "LANG_FRE_U1_L2", title: "L'objectivité et la subjectivité de l'auteur (Les modalisateurs)", unit: "Projet 1: Le texte d'histoire", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 2, trimester: 1 },
  { id: "LANG_FRE_U1_L3", title: "Le témoignage dans le récit historique", unit: "Projet 1: Le texte d'histoire", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 3, trimester: 1 },
  { id: "LANG_FRE_U2_L4", title: "Le débat d'idées (L'argumentation)", unit: "Projet 2: Le débat d'idées", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 4, trimester: 2 },
  { id: "LANG_FRE_U2_L5", title: "Concéder et réfuter une thèse", unit: "Projet 2: Le débat d'idées", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 5, trimester: 2 },
  { id: "LANG_FRE_U2_L6", title: "L'articulation du discours (Les articulateurs logiques)", unit: "Projet 2: Le débat d'idées", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 6, trimester: 2 },
  { id: "LANG_FRE_U3_L7", title: "L'appel (L'exhortation)", unit: "Projet 3: L'appel", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 7, trimester: 3 },
  { id: "LANG_FRE_U3_L8", title: "Les verbes performatifs et la syntaxe de l'appel", unit: "Projet 3: L'appel", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 8, trimester: 3 },
  { id: "LANG_FRE_U4_L9", title: "La nouvelle fantastique (Optionnel/Fin d'année)", unit: "Projet 4: La nouvelle", subject: "اللغة الفرنسية", stream: "لغات أجنبية", order: 9, trimester: 3 }
];

export const STREAMS: string[] = ["آداب وفلسفة", "تسيير واقتصاد", "رياضيات", "علوم تجريبية", "لغات أجنبية"];

/** مواد شعبة معيّنة، بالترتيب الذي تظهر به في المنهج */
export function subjectsOf(stream: string): string[] {
  const seen = new Set<string>();
  for (const l of LESSONS) if (l.stream === stream) seen.add(l.subject);
  return [...seen];
}

/** دروس مادّة داخل شعبة، مرتّبة بالفصل ثم الترتيب */
export function lessonsOf(stream: string, subject: string): Lesson[] {
  return LESSONS.filter((l) => l.stream === stream && l.subject === subject)
    .sort((a, b) => a.trimester - b.trimester || a.order - b.order);
}

/** الوحدات داخل مادّة — المنهج مبنيّ على وحدات لا دروس مسطّحة */
export function unitsOf(stream: string, subject: string): { unit: string; lessons: Lesson[] }[] {
  const map = new Map<string, Lesson[]>();
  for (const l of lessonsOf(stream, subject)) {
    const arr = map.get(l.unit) ?? [];
    arr.push(l);
    map.set(l.unit, arr);
  }
  return [...map.entries()].map(([unit, lessons]) => ({ unit, lessons }));
}

/* ⚠️ اكتمال التغطية — يُقرأ قبل عرض شعبة للطالب.
   عرض شعبة ناقصة كأنّها كاملة يجعل الطالب يظنّ أنّه أنهى برنامجه. */
export const STREAM_COVERAGE: Record<string, "full" | "partial"> = {
  "آداب وفلسفة": "partial",
  "تسيير واقتصاد": "partial",
  "رياضيات": "partial",
  "علوم تجريبية": "full",
  "لغات أجنبية": "partial"
};

export function isStreamReady(stream: string): boolean {
  return STREAM_COVERAGE[stream] === "full";
}
