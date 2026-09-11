/* ════════════════════════════════════════════════════════════
   المنهج — مادة ← نسخة منهج ← شعب ← دروس

   🐛 كان النموذج «شعبة ← مواد ← دروس»، والدرس يحمل حقل `stream`
   واحداً. وهذا يفرض أحد سوءين لا ثالث لهما:

     • إمّا تكرار الدروس: التاريخ والجغرافيا 18 درساً × عشر شعب =
       180 سجلّاً لبرنامج واحد. وأيّ تصحيح في درس يلزم تكراره عشراً،
       وأوّل مرّة يُنسى فيها واحد تفترق الشعب عن بعضها بصمت.
     • وإمّا حبس المادة في شعبة واحدة — وهو ما وقع فعلاً: كانت
       العلوم الإسلامية والتاريخ مسجّلة تحت «علوم تجريبية» وحدها،
       فطالب رياضيات لا يراها إطلاقاً.

   النموذج الآن ثلاث طبقات:

       Track   نسخة منهج: مادة + الشعب التي تدرسها بالبرنامج نفسه
       Lesson  درس ينتمي إلى نسخة واحدة — نسخة واحدة في القاعدة
       Stream  الشعبة تُستنتج من النسخ المرتبطة بها لا العكس

   ⚠️ قاعدة الفصل: اشتراك المادة في الاسم لا يعني اشتراكها في
   البرنامج. كل نسخة أدناه ناتجة عن **مقارنة الدروس فعلياً**:
   الرياضيات في علوم تجريبية والرياضيات في شعبة رياضيات لا يشتركان
   في درس واحد، فهما نسختان. والتاريخ والجغرافيا برنامج واحد
   بالفعل، فنسخة واحدة مرتبطة بالشعب كلّها.
════════════════════════════════════════════════════════════ */

/** نسخة منهج: مادة واحدة + الشعب التي تدرسها بالبرنامج نفسه */
export interface CurriculumTrack {
  id: string;
  subject: string;
  /** الشعب المرتبطة بهذه النسخة — الربط هنا لا في الدرس */
  streams: string[];
  /** لماذا هذه النسخة مستقلّة عن غيرها في المادة نفسها، أو مصدرها */
  note?: string;
  /** المادّة معتمدة ودروسها لم تُدخَل — تُعرض فارغة لا تُخفى */
  pending?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  unit: string;
  /** النسخة التي ينتمي إليها — المادة والشعب تُستنتجان منها */
  track: string;
  order: number;
  trimester: number;
}

export const TRACKS: CurriculumTrack[] = [
  {"id": "isl-common", "subject": "العلوم الإسلامية", "streams": ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد", "آداب وفلسفة", "لغات أجنبية"], "note": "برنامج واحد لكل الشعب — قُورنت الدروس فلم يظهر فرق."},
  {"id": "hisgeo-common", "subject": "التاريخ والجغرافيا", "streams": ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد", "آداب وفلسفة", "لغات أجنبية"], "note": "مادة امتحان واحدة ببرنامج موحّد لكل الشعب."},
  {"id": "fr-common", "subject": "اللغة الفرنسية", "streams": ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد", "آداب وفلسفة", "لغات أجنبية"], "note": "تصدر وثيقتا تدرّج لـاللغة الفرنسية: واحدة للشعب العلمية وأخرى للشعب الأدبية. الوحدات المسجّلة هنا مشتركة بينهما."},
  {"id": "en-common", "subject": "اللغة الإنجليزية", "streams": ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد", "آداب وفلسفة", "لغات أجنبية"], "note": "تصدر وثيقتا تدرّج لـاللغة الإنجليزية: واحدة للشعب العلمية وأخرى للشعب الأدبية. الوحدات المسجّلة هنا مشتركة بينهما."},
  {"id": "math-sci", "subject": "الرياضيات", "streams": ["علوم تجريبية"], "note": "برنامج مستقلّ: دوال وأسّية ولوغاريتم ومتتاليات وتكامل واحتمالات وهندسة فضاء."},
  {"id": "math-math", "subject": "الرياضيات", "streams": ["رياضيات"], "note": "وثيقة «برنامج دروس الرياضيات — شعبة رياضيات» مستقلّة عن وثيقة تقني رياضي."},
  {"id": "phy-sci", "subject": "العلوم الفيزيائية", "streams": ["علوم تجريبية"], "note": "برنامج مستقلّ: متابعة زمنية وتحوّلات نووية وظواهر كهربائية وميكانيك."},
  {"id": "phy-math", "subject": "العلوم الفيزيائية", "streams": ["رياضيات", "تقني رياضي"], "note": "برنامج واحد تشترك فيه شعبتا رياضيات وتقني رياضي — التوزيع السنوي يصدر باسمهما معاً. ويفترق عن برنامج علوم تجريبية بوحدتَي «تطور جملة مهتزة» و«ظواهر الانتشار»."},
  {"id": "svt-sci", "subject": "علوم الطبيعة والحياة", "streams": ["علوم تجريبية"]},
  {"id": "phi-lit", "subject": "الفلسفة", "streams": ["آداب وفلسفة"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "ara-lit", "subject": "اللغة العربية وآدابها", "streams": ["آداب وفلسفة", "لغات أجنبية"], "note": "وثيقة الشعب الأدبية — تشمل آداب وفلسفة ولغات أجنبية."},
  {"id": "acc-eco", "subject": "التسيير المحاسبي والمالي", "streams": ["تسيير واقتصاد"]},
  {"id": "mgt-eco", "subject": "الاقتصاد والمناجمنت", "streams": ["تسيير واقتصاد"]},
  {"id": "law-eco", "subject": "القانون", "streams": ["تسيير واقتصاد"]},
  {"id": "esp-lang", "subject": "اللغة الإسبانية", "streams": ["لغات أجنبية"]},
  {"id": "ger-lang", "subject": "اللغة الألمانية", "streams": ["لغات أجنبية"]},
  {"id": "ita-lang", "subject": "اللغة الإيطالية", "streams": ["لغات أجنبية"]},
  {"id": "svt-math", "subject": "علوم الطبيعة والحياة", "streams": ["رياضيات"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "tech-elec", "subject": "التكنولوجيا — هندسة كهربائية", "streams": ["تقني رياضي"], "note": "مجمَّعة من مصادر تعليمية جزائرية متقاطعة ومؤكَّدة من صاحب المشروع."},
  {"id": "tech-meca", "subject": "التكنولوجيا — هندسة ميكانيكية", "streams": ["تقني رياضي"], "note": "مجمَّعة من مصادر تعليمية جزائرية متقاطعة ومؤكَّدة من صاحب المشروع."},
  {"id": "tech-civil", "subject": "التكنولوجيا — هندسة مدنية", "streams": ["تقني رياضي"], "note": "مجمَّعة من مصادر تعليمية جزائرية متقاطعة ومؤكَّدة من صاحب المشروع."},
  {"id": "tech-proc", "subject": "التكنولوجيا — هندسة الطرائق", "streams": ["تقني رياضي"], "note": "مجمَّعة من مصادر تعليمية جزائرية متقاطعة ومؤكَّدة من صاحب المشروع."},
  {"id": "phi-sci", "subject": "الفلسفة", "streams": ["علوم تجريبية", "رياضيات"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "phi-tech-eco", "subject": "الفلسفة", "streams": ["تقني رياضي", "تسيير واقتصاد"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "phi-lang", "subject": "الفلسفة", "streams": ["لغات أجنبية"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "ara-sci", "subject": "اللغة العربية وآدابها", "streams": ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "math-eco", "subject": "الرياضيات", "streams": ["تسيير واقتصاد"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "math-lit", "subject": "الرياضيات", "streams": ["آداب وفلسفة", "لغات أجنبية"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
  {"id": "math-tech", "subject": "الرياضيات", "streams": ["تقني رياضي"], "note": "مستخرَج من التدرّجات السنوية الرسمية — سبتمبر 2022، المفتشية العامة للتربية الوطنية ومديرية التعليم الثانوي العام والتكنولوجي."},
];

export const LESSONS: Lesson[] = [
  {"id": "LIT_PHI_U1_L1", "title": "الإحساس والإدراك", "unit": "الإشكالية الأولى: في إدراك العالم الخارجي", "track": "phi-lit", "order": 1, "trimester": 1},
  {"id": "LIT_PHI_U1_L2", "title": "اللغة والفكر", "unit": "الإشكالية الأولى: في إدراك العالم الخارجي", "track": "phi-lit", "order": 2, "trimester": 1},
  {"id": "LIT_PHI_U1_L3", "title": "الشعور واللاشعور", "unit": "الإشكالية الأولى: في إدراك العالم الخارجي", "track": "phi-lit", "order": 3, "trimester": 1},
  {"id": "LIT_PHI_U1_L4", "title": "الذاكرة والخيال", "unit": "الإشكالية الأولى: في إدراك العالم الخارجي", "track": "phi-lit", "order": 4, "trimester": 1},
  {"id": "LIT_PHI_U1_L5", "title": "العادة والإرادة", "unit": "الإشكالية الأولى: في إدراك العالم الخارجي", "track": "phi-lit", "order": 5, "trimester": 1},
  {"id": "LIT_PHI_U2_L6", "title": "الأخلاق بين الثوابت والمتغيرات", "unit": "الإشكالية الثانية: في الأخلاق الموضوعية والأخلاق النسبية", "track": "phi-lit", "order": 6, "trimester": 2},
  {"id": "LIT_PHI_U2_L7", "title": "الحقوق والواجبات والعدل", "unit": "الإشكالية الثانية: في الأخلاق الموضوعية والأخلاق النسبية", "track": "phi-lit", "order": 7, "trimester": 2},
  {"id": "LIT_PHI_U2_L8", "title": "العلاقات الأسرية والنظم الاقتصادية (الشغل)", "unit": "الإشكالية الثانية: في الأخلاق الموضوعية والأخلاق النسبية", "track": "phi-lit", "order": 8, "trimester": 2},
  {"id": "LIT_PHI_U2_L9", "title": "الأنظمة السياسية (الدولة)", "unit": "الإشكالية الثانية: في الأخلاق الموضوعية والأخلاق النسبية", "track": "phi-lit", "order": 9, "trimester": 2},
  {"id": "LIT_PHI_U3_L10", "title": "الحقيقة العلمية والحقيقة الفلسفية", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lit", "order": 10, "trimester": 3},
  {"id": "LIT_PHI_U3_L11", "title": "الرياضيات والمطلقية", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lit", "order": 11, "trimester": 3},
  {"id": "LIT_PHI_U3_L12", "title": "العلوم التجريبية والبيولوجية", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lit", "order": 12, "trimester": 3},
  {"id": "LIT_PHI_U3_L13", "title": "العلوم الإنسانية (التاريخ، علم الاجتماع، علم النفس)", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lit", "order": 13, "trimester": 3},
  {"id": "LIT_ARA_U1_L1", "title": "الشعر التعليمي وتيار الزهد", "unit": "عصر الضعف والانحطاط", "track": "ara-lit", "order": 1, "trimester": 1},
  {"id": "LIT_ARA_U1_L2", "title": "المدائح النبوية", "unit": "عصر الضعف والانحطاط", "track": "ara-lit", "order": 2, "trimester": 1},
  {"id": "LIT_ARA_U1_L3", "title": "النثر العلمي المتأدب", "unit": "عصر الضعف والانحطاط", "track": "ara-lit", "order": 3, "trimester": 1},
  {"id": "LIT_ARA_U2_L4", "title": "مدرسة الإحياء والبعث الكلاسيكية", "unit": "عصر النهضة الحديثة", "track": "ara-lit", "order": 4, "trimester": 1},
  {"id": "LIT_ARA_U2_L5", "title": "الشعر المهجري والمذهب الرومانسي", "unit": "عصر النهضة الحديثة", "track": "ara-lit", "order": 5, "trimester": 1},
  {"id": "LIT_ARA_U3_L6", "title": "الشعر السياسي والقومي الملتزم", "unit": "الأدب الملتزم", "track": "ara-lit", "order": 6, "trimester": 2},
  {"id": "LIT_ARA_U3_L7", "title": "الثورة الجزائرية في الشعر العربي", "unit": "الأدب الملتزم", "track": "ara-lit", "order": 7, "trimester": 2},
  {"id": "LIT_ARA_U3_L8", "title": "القضية الفلسطينية", "unit": "الأدب الملتزم", "track": "ara-lit", "order": 8, "trimester": 2},
  {"id": "LIT_ARA_U4_L9", "title": "شعر التفعيلة (الشعر الحر)", "unit": "التجديد في الشعر", "track": "ara-lit", "order": 9, "trimester": 2},
  {"id": "LIT_ARA_U4_L10", "title": "ظاهرة الحزن والألم في الشعر المعاصر", "unit": "التجديد في الشعر", "track": "ara-lit", "order": 10, "trimester": 2},
  {"id": "LIT_ARA_U5_L11", "title": "فن المقال (أنواعه، خصائصه، رواده)", "unit": "الفنون النثرية الحديثة", "track": "ara-lit", "order": 11, "trimester": 3},
  {"id": "LIT_ARA_U5_L12", "title": "فن القصة القصيرة والرواية", "unit": "الفنون النثرية الحديثة", "track": "ara-lit", "order": 12, "trimester": 3},
  {"id": "LIT_ARA_U5_L13", "title": "فن المسرحية", "unit": "الفنون النثرية الحديثة", "track": "ara-lit", "order": 13, "trimester": 3},
  {"id": "ECO_MAN_U1_L1", "title": "المبادلات الدولية", "unit": "العلاقات الاقتصادية الدولية", "track": "mgt-eco", "order": 1, "trimester": 1},
  {"id": "ECO_MAN_U2_L2", "title": "النظام المصرفي", "unit": "النقود والتمويل", "track": "mgt-eco", "order": 2, "trimester": 1},
  {"id": "ECO_MAN_U3_L3", "title": "البطالة", "unit": "الظواهر الاقتصادية", "track": "mgt-eco", "order": 3, "trimester": 2},
  {"id": "ECO_MAN_U4_L4", "title": "التضخم", "unit": "الظواهر الاقتصادية", "track": "mgt-eco", "order": 4, "trimester": 2},
  {"id": "ECO_MAN_U5_L5", "title": "القيادة", "unit": "وظائف المناجمنت", "track": "mgt-eco", "order": 5, "trimester": 3},
  {"id": "ECO_MAN_U6_L6", "title": "الاتصال", "unit": "وظائف المناجمنت", "track": "mgt-eco", "order": 6, "trimester": 3},
  {"id": "ECO_ACC_U1_L1", "title": "تقديم أعمال نهاية السنة", "unit": "أعمال نهاية السنة", "track": "acc-eco", "order": 1, "trimester": 1},
  {"id": "ECO_ACC_U2_L2", "title": "الاهتلاكات ونقص قيمة التثبيتات", "unit": "أعمال نهاية السنة", "track": "acc-eco", "order": 2, "trimester": 1},
  {"id": "ECO_ACC_U3_L3", "title": "تسوية المخزونات", "unit": "أعمال نهاية السنة", "track": "acc-eco", "order": 3, "trimester": 1},
  {"id": "ECO_ACC_U4_L4", "title": "تسوية عناصر الأصول الأخرى (الزبائن والقيم المنقولة للتوظيف)", "unit": "أعمال نهاية السنة", "track": "acc-eco", "order": 4, "trimester": 1},
  {"id": "ECO_ACC_U5_L5", "title": "مؤونات الأخطار والأعباء وتسوية الأعباء والمنتوجات", "unit": "أعمال نهاية السنة", "track": "acc-eco", "order": 5, "trimester": 1},
  {"id": "ECO_ACC_U6_L6", "title": "إعداد الكشوف المالية وتحليلها (الميزانية الوظيفية)", "unit": "تحليل الكشوف المالية", "track": "acc-eco", "order": 6, "trimester": 2},
  {"id": "ECO_ACC_U7_L7", "title": "تحليل حساب النتائج (حسب الطبيعة وحسب الوظيفة)", "unit": "تحليل الكشوف المالية", "track": "acc-eco", "order": 7, "trimester": 2},
  {"id": "ECO_ACC_U8_L8", "title": "المحاسبة التحليلية (حساب التكاليف الكلية والنتيجة التحليلية)", "unit": "المحاسبة التحليلية للاستغلال", "track": "acc-eco", "order": 8, "trimester": 3},
  {"id": "ECO_ACC_U9_L9", "title": "حساب التكاليف الجزئية (التكاليف المتغيرة والهامش على التكلفة)", "unit": "المحاسبة التحليلية للاستغلال", "track": "acc-eco", "order": 9, "trimester": 3},
  {"id": "ECO_LAW_U1_L1", "title": "عقد البيع", "unit": "العقود والشركات التجارية", "track": "law-eco", "order": 1, "trimester": 1},
  {"id": "ECO_LAW_U2_L2", "title": "الشركة التجارية", "unit": "العقود والشركات التجارية", "track": "law-eco", "order": 2, "trimester": 1},
  {"id": "ECO_LAW_U3_L3", "title": "شركات الأشخاص وشركات الأموال", "unit": "العقود والشركات التجارية", "track": "law-eco", "order": 3, "trimester": 1},
  {"id": "ECO_LAW_U4_L4", "title": "علاقات العمل الفردية", "unit": "علاقات العمل الفردية والجماعية", "track": "law-eco", "order": 4, "trimester": 2},
  {"id": "ECO_LAW_U5_L5", "title": "علاقات العمل الجماعية", "unit": "علاقات العمل الفردية والجماعية", "track": "law-eco", "order": 5, "trimester": 2},
  {"id": "ECO_LAW_U6_L6", "title": "ميزانية الدولة", "unit": "المالية العامة", "track": "law-eco", "order": 6, "trimester": 3},
  {"id": "ECO_LAW_U7_L7", "title": "الضرائب والرسوم (الضريبة على الدخل الإجمالي والرسم على القيمة المضافة)", "unit": "المالية العامة", "track": "law-eco", "order": 7, "trimester": 3},
  {"id": "SCI_HIS_U1_L1", "title": "بروز الصراع وتشكل العالم", "unit": "تطور العالم في ظل الثنائية القطبية (1945-1989)", "track": "hisgeo-common", "order": 1, "trimester": 1},
  {"id": "SCI_HIS_U1_L2", "title": "مساعي الانفراج الدولي", "unit": "تطور العالم في ظل الثنائية القطبية (1945-1989)", "track": "hisgeo-common", "order": 2, "trimester": 1},
  {"id": "SCI_HIS_U1_L3", "title": "من الثنائية إلى الأحادية القطبية", "unit": "تطور العالم في ظل الثنائية القطبية (1945-1989)", "track": "hisgeo-common", "order": 3, "trimester": 1},
  {"id": "SCI_HIS_U2_L4", "title": "من تبلور الوعي الوطني إلى الثورة التحريرية", "unit": "الجزائر بين 1945 و 1989", "track": "hisgeo-common", "order": 4, "trimester": 2},
  {"id": "SCI_HIS_U2_L5", "title": "العمل المسلح ورد فعل الاستعمار", "unit": "الجزائر بين 1945 و 1989", "track": "hisgeo-common", "order": 5, "trimester": 2},
  {"id": "SCI_HIS_U2_L6", "title": "استعادة السيادة الوطنية وبناء الدولة الجزائرية", "unit": "الجزائر بين 1945 و 1989", "track": "hisgeo-common", "order": 6, "trimester": 2},
  {"id": "SCI_HIS_U2_L7", "title": "تأثير الجزائر وإسهامها في حركات التحرر", "unit": "الجزائر بين 1945 و 1989", "track": "hisgeo-common", "order": 7, "trimester": 3},
  {"id": "SCI_HIS_U3_L8", "title": "العالم الثالث بين تراجع الاستعمار التقليدي واستمرارية حركات التحرر", "unit": "التطورات في العالم الثالث (1945-1989)", "track": "hisgeo-common", "order": 8, "trimester": 3},
  {"id": "SCI_HIS_U3_L9", "title": "فلسطين من تصفية الاستعمار التقليدي إلى الهيمنة الأحادية", "unit": "التطورات في العالم الثالث (1945-1989)", "track": "hisgeo-common", "order": 9, "trimester": 3},
  {"id": "SCI_GEO_U1_L1", "title": "إشكالية التقدم والتخلف", "unit": "واقع الاقتصاد العالمي", "track": "hisgeo-common", "order": 1, "trimester": 1},
  {"id": "SCI_GEO_U1_L2", "title": "المبادلات والتنقلات في العالم", "unit": "واقع الاقتصاد العالمي", "track": "hisgeo-common", "order": 2, "trimester": 1},
  {"id": "SCI_GEO_U2_L3", "title": "مصادر القوة الاقتصادية للولايات المتحدة الأمريكية", "unit": "القوى الاقتصادية الكبرى في العالم", "track": "hisgeo-common", "order": 3, "trimester": 2},
  {"id": "SCI_GEO_U2_L4", "title": "ظاهرة التكتل وأثرها في قوة الاتحاد الأوروبي", "unit": "القوى الاقتصادية الكبرى في العالم", "track": "hisgeo-common", "order": 4, "trimester": 2},
  {"id": "SCI_GEO_U2_L5", "title": "العلاقة بين السكان والتنمية في شرق وجنوب شرق آسيا", "unit": "القوى الاقتصادية الكبرى في العالم", "track": "hisgeo-common", "order": 5, "trimester": 2},
  {"id": "SCI_GEO_U3_L6", "title": "الاقتصاد الجزائري في العالم", "unit": "الاقتصاد والتنمية في دول الجنوب", "track": "hisgeo-common", "order": 6, "trimester": 3},
  {"id": "SCI_GEO_U3_L7", "title": "الجزائر في حوض البحر الأبيض المتوسط", "unit": "الاقتصاد والتنمية في دول الجنوب", "track": "hisgeo-common", "order": 7, "trimester": 3},
  {"id": "SCI_GEO_U3_L8", "title": "السكان والتنمية في الهند", "unit": "الاقتصاد والتنمية في دول الجنوب", "track": "hisgeo-common", "order": 8, "trimester": 3},
  {"id": "SCI_GEO_U3_L9", "title": "السكان والتنمية في البرازيل", "unit": "الاقتصاد والتنمية في دول الجنوب", "track": "hisgeo-common", "order": 9, "trimester": 3},
  {"id": "SCI_MATH_U1_L1", "title": "النهايات", "unit": "الدوال العددية", "track": "math-sci", "order": 1, "trimester": 1},
  {"id": "SCI_MATH_U1_L2", "title": "الاستمرارية ومبرهنة القيم المتوسطة", "unit": "الدوال العددية", "track": "math-sci", "order": 2, "trimester": 1},
  {"id": "SCI_MATH_U1_L3", "title": "الاشتقاقية وتطبيقاتها", "unit": "الدوال العددية", "track": "math-sci", "order": 3, "trimester": 1},
  {"id": "SCI_MATH_U2_L4", "title": "دراسة الدالة الأسية", "unit": "الدوال الأسية", "track": "math-sci", "order": 4, "trimester": 1},
  {"id": "SCI_MATH_U2_L5", "title": "حل المعادلات والمتراجحات الأسية", "unit": "الدوال الأسية", "track": "math-sci", "order": 5, "trimester": 1},
  {"id": "SCI_MATH_U3_L6", "title": "دراسة الدالة اللوغاريتمية النيبيرية", "unit": "الدوال اللوغاريتمية", "track": "math-sci", "order": 6, "trimester": 2},
  {"id": "SCI_MATH_U3_L7", "title": "التزايد المقارن", "unit": "الدوال اللوغاريتمية", "track": "math-sci", "order": 7, "trimester": 2},
  {"id": "SCI_MATH_U4_L8", "title": "الاستدلال بالتراجع", "unit": "المتتاليات العددية", "track": "math-sci", "order": 8, "trimester": 2},
  {"id": "SCI_MATH_U4_L9", "title": "المتتاليات المحدودة والمتقاربة", "unit": "المتتاليات العددية", "track": "math-sci", "order": 9, "trimester": 2},
  {"id": "SCI_MATH_U4_L10", "title": "نهايات المتتاليات", "unit": "المتتاليات العددية", "track": "math-sci", "order": 10, "trimester": 2},
  {"id": "SCI_MATH_U5_L11", "title": "الدوال الأصلية", "unit": "الدوال الأصلية وحساب التكامل", "track": "math-sci", "order": 11, "trimester": 3},
  {"id": "SCI_MATH_U5_L12", "title": "حساب التكامل", "unit": "الدوال الأصلية وحساب التكامل", "track": "math-sci", "order": 12, "trimester": 3},
  {"id": "SCI_MATH_U6_L13", "title": "الاحتمالات الشرطية", "unit": "الاحتمالات", "track": "math-sci", "order": 13, "trimester": 3},
  {"id": "SCI_MATH_U6_L14", "title": "المتغير العشوائي وقانون الاحتمال", "unit": "الاحتمالات", "track": "math-sci", "order": 14, "trimester": 3},
  {"id": "SCI_MATH_U7_L15", "title": "الجداء السلمي في الفضاء وتطبيقاته", "unit": "الهندسة في الفضاء", "track": "math-sci", "order": 15, "trimester": 3},
  {"id": "SCI_MATH_U7_L16", "title": "المستقيمات والمستويات في الفضاء", "unit": "الهندسة في الفضاء", "track": "math-sci", "order": 16, "trimester": 3},
  {"id": "SCI_ISL_U1_L1", "title": "العقيدة الإسلامية وأثرها على الفرد والمجتمع", "unit": "العقيدة الإسلامية", "track": "isl-common", "order": 1, "trimester": 1},
  {"id": "SCI_ISL_U1_L2", "title": "وسائل القرآن الكريم في تثبيت العقيدة الإسلامية", "unit": "العقيدة الإسلامية", "track": "isl-common", "order": 2, "trimester": 1},
  {"id": "SCI_ISL_U2_L3", "title": "الإسلام والرسالات السماوية", "unit": "القرآن ومصادر التشريع", "track": "isl-common", "order": 3, "trimester": 1},
  {"id": "SCI_ISL_U2_L4", "title": "العقل في القرآن الكريم", "unit": "القرآن ومصادر التشريع", "track": "isl-common", "order": 4, "trimester": 1},
  {"id": "SCI_ISL_U3_L5", "title": "مقاصد الشريعة الإسلامية", "unit": "مقاصد الشريعة", "track": "isl-common", "order": 5, "trimester": 1},
  {"id": "SCI_ISL_U3_L6", "title": "منهج الإسلام في محاربة الانحراف والجريمة", "unit": "مقاصد الشريعة", "track": "isl-common", "order": 6, "trimester": 1},
  {"id": "SCI_ISL_U3_L7", "title": "المساواة أمام أحكام الشريعة الإسلامية في العقوبات", "unit": "مقاصد الشريعة", "track": "isl-common", "order": 7, "trimester": 2},
  {"id": "SCI_ISL_U4_L8", "title": "الصحة النفسية والجسمية في القرآن الكريم", "unit": "القيم والأخلاق", "track": "isl-common", "order": 8, "trimester": 2},
  {"id": "SCI_ISL_U2_L9", "title": "من مصادر التشريع الإسلامي (الإجماع، القياس، المصلحة المرسلة)", "unit": "القرآن ومصادر التشريع", "track": "isl-common", "order": 9, "trimester": 2},
  {"id": "SCI_ISL_U4_L10", "title": "القيم في القرآن الكريم", "unit": "القيم والأخلاق", "track": "isl-common", "order": 10, "trimester": 2},
  {"id": "SCI_ISL_U5_L11", "title": "الوقف في الإسلام", "unit": "الاقتصاد والمعاملات", "track": "isl-common", "order": 11, "trimester": 2},
  {"id": "SCI_ISL_U6_L12", "title": "من أحكام الأسرة في الإسلام: مدخل إلى علم الميراث", "unit": "أحكام الأسرة", "track": "isl-common", "order": 12, "trimester": 2},
  {"id": "SCI_ISL_U5_L13", "title": "الربا وأحكامه", "unit": "الاقتصاد والمعاملات", "track": "isl-common", "order": 13, "trimester": 3},
  {"id": "SCI_ISL_U5_L14", "title": "من المعاملات المالية الجائزة", "unit": "الاقتصاد والمعاملات", "track": "isl-common", "order": 14, "trimester": 3},
  {"id": "SCI_ISL_U4_L15", "title": "الحرية الشخصية ومدى ارتباطها بحقوق الآخرين", "unit": "القيم والأخلاق", "track": "isl-common", "order": 15, "trimester": 3},
  {"id": "SCI_ISL_U6_L16", "title": "من أحكام الأسرة في الإسلام: النسب، التبني، والكفالة", "unit": "أحكام الأسرة", "track": "isl-common", "order": 16, "trimester": 3},
  {"id": "SCI_ISL_U7_L17", "title": "العلاقات الاجتماعية بين المسلمين وغيرهم", "unit": "السيرة النبوية", "track": "isl-common", "order": 17, "trimester": 3},
  {"id": "SCI_ISL_U7_L18", "title": "خطبة الرسول صلى الله عليه وسلم في حجة الوداع", "unit": "السيرة النبوية", "track": "isl-common", "order": 18, "trimester": 3},
  {"id": "SCI_PHY_U1_L1", "title": "طرق المتابعة الزمنية (المعايرة، الناقلية، الضغط، الحجم)", "unit": "المتابعة الزمنية لتحول كيميائي", "track": "phy-sci", "order": 1, "trimester": 1},
  {"id": "SCI_PHY_U1_L2", "title": "سرعة التفاعل وزمن نصف التفاعل", "unit": "المتابعة الزمنية لتحول كيميائي", "track": "phy-sci", "order": 2, "trimester": 1},
  {"id": "SCI_PHY_U1_L3", "title": "العوامل الحركية", "unit": "المتابعة الزمنية لتحول كيميائي", "track": "phy-sci", "order": 3, "trimester": 1},
  {"id": "SCI_PHY_U2_L4", "title": "النشاط الإشعاعي", "unit": "التحولات النووية", "track": "phy-sci", "order": 4, "trimester": 1},
  {"id": "SCI_PHY_U2_L5", "title": "التناقص الإشعاعي", "unit": "التحولات النووية", "track": "phy-sci", "order": 5, "trimester": 1},
  {"id": "SCI_PHY_U2_L6", "title": "التفاعلات النووية (الانشطار والاندماج) والطاقة المحررة", "unit": "التحولات النووية", "track": "phy-sci", "order": 6, "trimester": 1},
  {"id": "SCI_PHY_U3_L7", "title": "ثنائي القطب RC", "unit": "دراسة ظواهر كهربائية", "track": "phy-sci", "order": 7, "trimester": 2},
  {"id": "SCI_PHY_U3_L8", "title": "ثنائي القطب RL", "unit": "دراسة ظواهر كهربائية", "track": "phy-sci", "order": 8, "trimester": 2},
  {"id": "SCI_PHY_U4_L9", "title": "حالة التوازن لجملة كيميائية", "unit": "تطور جملة كيميائية نحو حالة التوازن", "track": "phy-sci", "order": 9, "trimester": 2},
  {"id": "SCI_PHY_U4_L10", "title": "التحولات حمض-أساس", "unit": "تطور جملة كيميائية نحو حالة التوازن", "track": "phy-sci", "order": 10, "trimester": 2},
  {"id": "SCI_PHY_U4_L11", "title": "المعايرة الـ pH-مترية", "unit": "تطور جملة كيميائية نحو حالة التوازن", "track": "phy-sci", "order": 11, "trimester": 2},
  {"id": "SCI_PHY_U5_L12", "title": "مقاربة تاريخية لميكانيك نيوتن", "unit": "تطور جملة ميكانيكية", "track": "phy-sci", "order": 12, "trimester": 3},
  {"id": "SCI_PHY_U5_L13", "title": "قوانين نيوتن وتطبيقاتها", "unit": "تطور جملة ميكانيكية", "track": "phy-sci", "order": 13, "trimester": 3},
  {"id": "SCI_PHY_U5_L14", "title": "حركة الكواكب والأقمار الاصطناعية", "unit": "تطور جملة ميكانيكية", "track": "phy-sci", "order": 14, "trimester": 3},
  {"id": "SCI_PHY_U5_L15", "title": "السقوط الشاقولي لجسم صلب", "unit": "تطور جملة ميكانيكية", "track": "phy-sci", "order": 15, "trimester": 3},
  {"id": "SCI_PHY_U5_L16", "title": "حركة قذيفة في حقل الجاذبية", "unit": "تطور جملة ميكانيكية", "track": "phy-sci", "order": 16, "trimester": 3},
  {"id": "SCI_PHY_U5_L17", "title": "المستوي المائل والمستوي الأفقي", "unit": "تطور جملة ميكانيكية", "track": "phy-sci", "order": 17, "trimester": 3},
  {"id": "SCI_PHY_U6_L18", "title": "تفاعلات الأسترة والإماهة", "unit": "مراقبة تطور جملة كيميائية", "track": "phy-sci", "order": 18, "trimester": 3},
  {"id": "SCI_NAT_U1_L1", "title": "مقر تركيب البروتين", "unit": "آليات تركيب البروتين", "track": "svt-sci", "order": 1, "trimester": 1},
  {"id": "SCI_NAT_U1_L2", "title": "الاستنساخ", "unit": "آليات تركيب البروتين", "track": "svt-sci", "order": 2, "trimester": 1},
  {"id": "SCI_NAT_U1_L3", "title": "الترجمة", "unit": "آليات تركيب البروتين", "track": "svt-sci", "order": 3, "trimester": 1},
  {"id": "SCI_NAT_U2_L4", "title": "مستويات البنية الفراغية للبروتين", "unit": "العلاقة بين بنية ووظيفة البروتين", "track": "svt-sci", "order": 4, "trimester": 1},
  {"id": "SCI_NAT_U2_L5", "title": "العلاقة بين البنية والوظيفة", "unit": "العلاقة بين بنية ووظيفة البروتين", "track": "svt-sci", "order": 5, "trimester": 1},
  {"id": "SCI_NAT_U3_L6", "title": "مفهوم الإنزيم", "unit": "النشاط الإنزيمي للبروتينات", "track": "svt-sci", "order": 6, "trimester": 1},
  {"id": "SCI_NAT_U3_L7", "title": "تأثير العوامل الخارجية (درجة الحرارة، الـ pH) على النشاط الإنزيمي", "unit": "النشاط الإنزيمي للبروتينات", "track": "svt-sci", "order": 7, "trimester": 1},
  {"id": "SCI_NAT_U4_L8", "title": "الذات واللاذات (مؤشرات الزمر الدموية و CMH)", "unit": "دور البروتينات في الدفاع عن الذات", "track": "svt-sci", "order": 8, "trimester": 2},
  {"id": "SCI_NAT_U4_L9", "title": "الاستجابة المناعية الخلطية", "unit": "دور البروتينات في الدفاع عن الذات", "track": "svt-sci", "order": 9, "trimester": 2},
  {"id": "SCI_NAT_U4_L10", "title": "الاستجابة المناعية الخلوية", "unit": "دور البروتينات في الدفاع عن الذات", "track": "svt-sci", "order": 10, "trimester": 2},
  {"id": "SCI_NAT_U4_L11", "title": "فقدان المناعة المكتسبة (السيدا VIH)", "unit": "دور البروتينات في الدفاع عن الذات", "track": "svt-sci", "order": 11, "trimester": 2},
  {"id": "SCI_NAT_U5_L12", "title": "كمون الراحة", "unit": "دور البروتينات في الاتصال العصبي", "track": "svt-sci", "order": 12, "trimester": 2},
  {"id": "SCI_NAT_U5_L13", "title": "كمون العمل", "unit": "دور البروتينات في الاتصال العصبي", "track": "svt-sci", "order": 13, "trimester": 2},
  {"id": "SCI_NAT_U5_L14", "title": "النقل المشبكي", "unit": "دور البروتينات في الاتصال العصبي", "track": "svt-sci", "order": 14, "trimester": 2},
  {"id": "SCI_NAT_U5_L15", "title": "الإدماج العصبي وتأثير المخدرات", "unit": "دور البروتينات في الاتصال العصبي", "track": "svt-sci", "order": 15, "trimester": 2},
  {"id": "SCI_NAT_U6_L16", "title": "مقر التركيب الضوئي", "unit": "آليات تحويل الطاقة الضوئية إلى طاقة كيميائية كامنة", "track": "svt-sci", "order": 16, "trimester": 3},
  {"id": "SCI_NAT_U6_L17", "title": "المرحلة الكيموضوئية", "unit": "آليات تحويل الطاقة الضوئية إلى طاقة كيميائية كامنة", "track": "svt-sci", "order": 17, "trimester": 3},
  {"id": "SCI_NAT_U6_L18", "title": "المرحلة الكيموحيوية", "unit": "آليات تحويل الطاقة الضوئية إلى طاقة كيميائية كامنة", "track": "svt-sci", "order": 18, "trimester": 3},
  {"id": "SCI_NAT_U7_L19", "title": "التنفس الخلوي", "unit": "آليات تحويل الطاقة الكيميائية الكامنة إلى ATP", "track": "svt-sci", "order": 19, "trimester": 3},
  {"id": "SCI_NAT_U7_L20", "title": "التخمر", "unit": "آليات تحويل الطاقة الكيميائية الكامنة إلى ATP", "track": "svt-sci", "order": 20, "trimester": 3},
  {"id": "LANG_GER_U1_L1", "title": "Jugend und Gesellschaft (الشباب والمجتمع)", "unit": "Einheit 1: Jugend", "track": "ger-lang", "order": 1, "trimester": 1},
  {"id": "LANG_GER_U1_L2", "title": "Grammatik: Nebensätze (weil, da, dass, ob)", "unit": "Einheit 1: Jugend", "track": "ger-lang", "order": 2, "trimester": 1},
  {"id": "LANG_GER_U2_L3", "title": "Massenmedien (Kommunikation und Medien)", "unit": "Einheit 2: Massenmedien", "track": "ger-lang", "order": 3, "trimester": 1},
  {"id": "LANG_GER_U2_L4", "title": "Grammatik: Passiv (Präsens und Präteritum)", "unit": "Einheit 2: Massenmedien", "track": "ger-lang", "order": 4, "trimester": 1},
  {"id": "LANG_GER_U3_L5", "title": "Umweltschutz (حماية البيئة)", "unit": "Einheit 3: Umwelt", "track": "ger-lang", "order": 5, "trimester": 2},
  {"id": "LANG_GER_U3_L6", "title": "Grammatik: Relativsätze / Finalsätze (um...zu / damit)", "unit": "Einheit 3: Umwelt", "track": "ger-lang", "order": 6, "trimester": 2},
  {"id": "LANG_GER_U4_L7", "title": "Freizeit und Reisen", "unit": "Einheit 4: Tourismus", "track": "ger-lang", "order": 7, "trimester": 3},
  {"id": "LANG_GER_U5_L8", "title": "Technischer Fortschritt (التقدم التكنولوجي)", "unit": "Einheit 5: Technik", "track": "ger-lang", "order": 8, "trimester": 3},
  {"id": "LANG_ESP_U1_L1", "title": "Los medios de comunicación (Los mass-media)", "unit": "Unidad 1: Los mass-media", "track": "esp-lang", "order": 1, "trimester": 1},
  {"id": "LANG_ESP_U1_L2", "title": "Gramática: El presente de subjuntivo / La expresión de la opinión", "unit": "Unidad 1: Los mass-media", "track": "esp-lang", "order": 2, "trimester": 1},
  {"id": "LANG_ESP_U2_L3", "title": "El mundo laboral (El trabajo y la juventud)", "unit": "Unidad 2: El mundo laboral", "track": "esp-lang", "order": 3, "trimester": 1},
  {"id": "LANG_ESP_U2_L4", "title": "Gramática: El futuro / La condición (Si + presente)", "unit": "Unidad 2: El mundo laboral", "track": "esp-lang", "order": 4, "trimester": 1},
  {"id": "LANG_ESP_U3_L5", "title": "El medio ambiente y la contaminación", "unit": "Unidad 3: Medio ambiente", "track": "esp-lang", "order": 5, "trimester": 2},
  {"id": "LANG_ESP_U3_L6", "title": "Gramática: El imperativo (afirmativo y negativo) / La obligación", "unit": "Unidad 3: Medio ambiente", "track": "esp-lang", "order": 6, "trimester": 2},
  {"id": "LANG_ESP_U4_L7", "title": "La solidaridad y la convivencia", "unit": "Unidad 4: Solidaridad", "track": "esp-lang", "order": 7, "trimester": 2},
  {"id": "LANG_ESP_U5_L8", "title": "La guerra y la paz (Derechos humanos)", "unit": "Unidad 5: Paz y guerra", "track": "esp-lang", "order": 8, "trimester": 3},
  {"id": "LANG_ENG_U1_L1", "title": "Exploring the Past (Ancient Civilizations)", "unit": "Unit 1: Exploring the Past", "track": "en-common", "order": 1, "trimester": 1},
  {"id": "LANG_ENG_U1_L2", "title": "The rise and fall of civilizations (Sumerians, Egyptians, Greeks...)", "unit": "Unit 1: Exploring the Past", "track": "en-common", "order": 2, "trimester": 1},
  {"id": "LANG_ENG_U1_L3", "title": "Grammar: Used to / Had to / Past Perfect / Past Simple", "unit": "Unit 1: Exploring the Past", "track": "en-common", "order": 3, "trimester": 1},
  {"id": "LANG_ENG_U2_L4", "title": "Ethics in Business", "unit": "Unit 2: Ill-Gotten Gains Never Prosper", "track": "en-common", "order": 4, "trimester": 1},
  {"id": "LANG_ENG_U2_L5", "title": "Fraud, corruption, money laundering and counterfeiting", "unit": "Unit 2: Ill-Gotten Gains Never Prosper", "track": "en-common", "order": 5, "trimester": 1},
  {"id": "LANG_ENG_U2_L6", "title": "Grammar: Conditionals (Provided that, as long as) / Expressing wish / It's high time", "unit": "Unit 2: Ill-Gotten Gains Never Prosper", "track": "en-common", "order": 6, "trimester": 1},
  {"id": "LANG_ENG_U3_L7", "title": "Education in the World (Comparing educational systems)", "unit": "Unit 3: Schools: Different and Alike", "track": "en-common", "order": 7, "trimester": 2},
  {"id": "LANG_ENG_U3_L8", "title": "Grammar: Expressing similarities and differences (like, whereas, unlike)", "unit": "Unit 3: Schools: Different and Alike", "track": "en-common", "order": 8, "trimester": 2},
  {"id": "LANG_ENG_U4_L9", "title": "Emotions and feelings (Humour, Anger, Love)", "unit": "Unit 4: Feelings and Emotions", "track": "en-common", "order": 9, "trimester": 3},
  {"id": "LANG_ENG_U4_L10", "title": "Grammar: Articles / Quantifiers / Modals", "unit": "Unit 4: Feelings and Emotions", "track": "en-common", "order": 10, "trimester": 3},
  {"id": "LANG_ITA_U1_L1", "title": "La famiglia italiana oggi e ieri", "unit": "Unità 1: La società", "track": "ita-lang", "order": 1, "trimester": 1},
  {"id": "LANG_ITA_U1_L2", "title": "Grammatica: Il passato prossimo e l'imperfetto", "unit": "Unità 1: La società", "track": "ita-lang", "order": 2, "trimester": 1},
  {"id": "LANG_ITA_U2_L3", "title": "Il mondo del lavoro in Italia", "unit": "Unità 2: Il lavoro", "track": "ita-lang", "order": 3, "trimester": 1},
  {"id": "LANG_ITA_U2_L4", "title": "Grammatica: Il futuro semplice e composto", "unit": "Unità 2: Il lavoro", "track": "ita-lang", "order": 4, "trimester": 1},
  {"id": "LANG_ITA_U3_L5", "title": "L'inquinamento e l'ambiente", "unit": "Unità 3: L'ambiente", "track": "ita-lang", "order": 5, "trimester": 2},
  {"id": "LANG_ITA_U3_L6", "title": "Grammatica: Il condizionale semplice e composto", "unit": "Unità 3: L'ambiente", "track": "ita-lang", "order": 6, "trimester": 2},
  {"id": "LANG_ITA_U4_L7", "title": "I mass-media e la comunicazione", "unit": "Unità 4: I mass-media", "track": "ita-lang", "order": 7, "trimester": 3},
  {"id": "LANG_ITA_U4_L8", "title": "Grammatica: Il congiuntivo (Presente e passato)", "unit": "Unità 4: I mass-media", "track": "ita-lang", "order": 8, "trimester": 3},
  {"id": "LANG_FRE_U1_L1", "title": "Le texte historique (Rapporter un fait d'histoire)", "unit": "Projet 1: Le texte d'histoire", "track": "fr-common", "order": 1, "trimester": 1},
  {"id": "LANG_FRE_U1_L2", "title": "L'objectivité et la subjectivité de l'auteur (Les modalisateurs)", "unit": "Projet 1: Le texte d'histoire", "track": "fr-common", "order": 2, "trimester": 1},
  {"id": "LANG_FRE_U1_L3", "title": "Le témoignage dans le récit historique", "unit": "Projet 1: Le texte d'histoire", "track": "fr-common", "order": 3, "trimester": 1},
  {"id": "LANG_FRE_U2_L4", "title": "Le débat d'idées (L'argumentation)", "unit": "Projet 2: Le débat d'idées", "track": "fr-common", "order": 4, "trimester": 2},
  {"id": "LANG_FRE_U2_L5", "title": "Concéder et réfuter une thèse", "unit": "Projet 2: Le débat d'idées", "track": "fr-common", "order": 5, "trimester": 2},
  {"id": "LANG_FRE_U2_L6", "title": "L'articulation du discours (Les articulateurs logiques)", "unit": "Projet 2: Le débat d'idées", "track": "fr-common", "order": 6, "trimester": 2},
  {"id": "LANG_FRE_U3_L7", "title": "L'appel (L'exhortation)", "unit": "Projet 3: L'appel", "track": "fr-common", "order": 7, "trimester": 3},
  {"id": "LANG_FRE_U3_L8", "title": "Les verbes performatifs et la syntaxe de l'appel", "unit": "Projet 3: L'appel", "track": "fr-common", "order": 8, "trimester": 3},
  {"id": "LANG_FRE_U4_L9", "title": "La nouvelle fantastique (Optionnel/Fin d'année)", "unit": "Projet 4: La nouvelle", "track": "fr-common", "order": 9, "trimester": 3},
  {"id": "MATH_MATH_L01", "title": "النهايات والاستمرارية", "unit": "الدوال العددية", "track": "math-math", "order": 1, "trimester": 1},
  {"id": "MATH_MATH_L02", "title": "الاشتقاقية وتطبيقاتها", "unit": "الدوال العددية", "track": "math-math", "order": 2, "trimester": 1},
  {"id": "MATH_MATH_L03", "title": "التزايد المقارن ودراسة الدوال", "unit": "الدوال العددية", "track": "math-math", "order": 3, "trimester": 1},
  {"id": "MATH_MATH_L04", "title": "الدالة الأسية", "unit": "الدوال الأسية واللوغاريتمية", "track": "math-math", "order": 4, "trimester": 1},
  {"id": "MATH_MATH_L05", "title": "الدالة اللوغاريتمية النيبيرية", "unit": "الدوال الأسية واللوغاريتمية", "track": "math-math", "order": 5, "trimester": 2},
  {"id": "MATH_MATH_L06", "title": "الاستدلال بالتراجع", "unit": "المتتاليات العددية", "track": "math-math", "order": 6, "trimester": 2},
  {"id": "MATH_MATH_L07", "title": "المتتاليات العددية ونهاياتها", "unit": "المتتاليات العددية", "track": "math-math", "order": 7, "trimester": 2},
  {"id": "MATH_MATH_L08", "title": "الدوال الأصلية", "unit": "الدوال الأصلية والحساب التكاملي", "track": "math-math", "order": 8, "trimester": 2},
  {"id": "MATH_MATH_L09", "title": "الحساب التكاملي وحساب المساحات", "unit": "الدوال الأصلية والحساب التكاملي", "track": "math-math", "order": 9, "trimester": 2},
  {"id": "MATH_MATH_L10", "title": "الأعداد المركبة", "unit": "الأعداد المركبة والتحويلات النقطية", "track": "math-math", "order": 10, "trimester": 2},
  {"id": "MATH_MATH_L11", "title": "التحويلات النقطية والتشابه المباشر", "unit": "الأعداد المركبة والتحويلات النقطية", "track": "math-math", "order": 11, "trimester": 3},
  {"id": "MATH_MATH_U1_L1", "title": "القسمة في Z", "unit": "الحساب في مجموعة الأعداد الصحيحة", "track": "math-math", "order": 12, "trimester": 1},
  {"id": "MATH_MATH_U1_L2", "title": "الموافقات في Z", "unit": "الحساب في مجموعة الأعداد الصحيحة", "track": "math-math", "order": 13, "trimester": 1},
  {"id": "MATH_MATH_U1_L3", "title": "الأعداد الأولية ومبرهنتا بيزو وغوص", "unit": "الحساب في مجموعة الأعداد الصحيحة", "track": "math-math", "order": 14, "trimester": 1},
  {"id": "MATH_MATH_L15", "title": "الجداء السلمي في الفضاء وتطبيقاته", "unit": "الهندسة في الفضاء", "track": "math-math", "order": 15, "trimester": 3},
  {"id": "MATH_MATH_L16", "title": "المستقيمات والمستويات في الفضاء", "unit": "الهندسة في الفضاء", "track": "math-math", "order": 16, "trimester": 3},
  {"id": "MATH_MATH_L17", "title": "الاحتمالات الشرطية", "unit": "الاحتمالات", "track": "math-math", "order": 17, "trimester": 3},
  {"id": "MATH_MATH_L18", "title": "المتغير العشوائي وقانون الاحتمال", "unit": "الاحتمالات", "track": "math-math", "order": 18, "trimester": 3},
  {"id": "TECH_ELEC_L01", "title": "التيار المتناوب ثلاثي الطور", "unit": "وظيفة التغذية", "track": "tech-elec", "order": 1, "trimester": 1},
  {"id": "TECH_ELEC_L02", "title": "المحوّل أحادي الطور", "unit": "وظيفة التغذية", "track": "tech-elec", "order": 2, "trimester": 1},
  {"id": "TECH_ELEC_L03", "title": "التغذية ثلاثية الطور", "unit": "وظيفة التغذية", "track": "tech-elec", "order": 3, "trimester": 1},
  {"id": "TECH_ELEC_L04", "title": "التقويم المراقب", "unit": "وظيفة التغذية", "track": "tech-elec", "order": 4, "trimester": 2},
  {"id": "TECH_ELEC_L05", "title": "المحرّك اللامتزامن ثلاثي الطور", "unit": "وظيفة الاستطاعة", "track": "tech-elec", "order": 5, "trimester": 2},
  {"id": "TECH_ELEC_L06", "title": "مضخّمات الاستطاعة", "unit": "وظيفة الاستطاعة", "track": "tech-elec", "order": 6, "trimester": 2},
  {"id": "TECH_ELEC_L07", "title": "القلّابات التزامنية", "unit": "وظيفة المعالجة — المنطق التعاقبي", "track": "tech-elec", "order": 7, "trimester": 2},
  {"id": "TECH_ELEC_L08", "title": "العدّادات اللاتزامنية", "unit": "وظيفة المعالجة — المنطق التعاقبي", "track": "tech-elec", "order": 8, "trimester": 3},
  {"id": "TECH_ELEC_L09", "title": "السجلّات", "unit": "وظيفة المعالجة — المنطق التعاقبي", "track": "tech-elec", "order": 9, "trimester": 3},
  {"id": "TECH_ELEC_L10", "title": "المؤجّلات", "unit": "وظيفة المعالجة — المنطق التعاقبي", "track": "tech-elec", "order": 10, "trimester": 3},
  {"id": "TECH_ELEC_L11", "title": "الميكرومراقب PIC16F84", "unit": "وظيفة التحكّم المبرمج", "track": "tech-elec", "order": 11, "trimester": 3},
  {"id": "TECH_ELEC_L12", "title": "دليل دراسة أنماط العمل والتوقّف GEMMA", "unit": "وظيفة التحكّم المبرمج", "track": "tech-elec", "order": 12, "trimester": 3},
  {"id": "TECH_MECA_L01", "title": "مفاهيم عامة حول الإنتاج", "unit": "مجال الإنشاء — التحليل والترميز", "track": "tech-meca", "order": 1, "trimester": 1},
  {"id": "TECH_MECA_L02", "title": "التحليل الوظيفي", "unit": "مجال الإنشاء — التحليل والترميز", "track": "tech-meca", "order": 2, "trimester": 1},
  {"id": "TECH_MECA_L03", "title": "الترميز الهندسي", "unit": "مجال الإنشاء — التحليل والترميز", "track": "tech-meca", "order": 3, "trimester": 1},
  {"id": "TECH_MECA_L04", "title": "إجبارات التشغيل", "unit": "مجال الإنشاء — التحليل والترميز", "track": "tech-meca", "order": 4, "trimester": 1},
  {"id": "TECH_MECA_L05", "title": "عناصر نقل الحركة", "unit": "نقل الحركة", "track": "tech-meca", "order": 5, "trimester": 1},
  {"id": "TECH_MECA_L06", "title": "نقل الحركة بالتماس وبالمرونة", "unit": "نقل الحركة", "track": "tech-meca", "order": 6, "trimester": 2},
  {"id": "TECH_MECA_L07", "title": "المدحرجات", "unit": "نقل الحركة", "track": "tech-meca", "order": 7, "trimester": 2},
  {"id": "TECH_MECA_L08", "title": "الدافعات (المُشغِّلات)", "unit": "الطاقة الهوائية والزيتية", "track": "tech-meca", "order": 8, "trimester": 2},
  {"id": "TECH_MECA_L09", "title": "الموزّعات", "unit": "الطاقة الهوائية والزيتية", "track": "tech-meca", "order": 9, "trimester": 2},
  {"id": "TECH_MECA_L10", "title": "المخطّط الوظيفي للتحكّم في المراحل والانتقالات (GRAFCET)", "unit": "التحكّم الآلي", "track": "tech-meca", "order": 10, "trimester": 2},
  {"id": "TECH_MECA_L11", "title": "المد والقص", "unit": "مقاومة المواد", "track": "tech-meca", "order": 11, "trimester": 3},
  {"id": "TECH_MECA_L12", "title": "الإجهادات وحساب المقاطع", "unit": "مقاومة المواد", "track": "tech-meca", "order": 12, "trimester": 3},
  {"id": "TECH_MECA_L13", "title": "التحديد الوظيفي للأبعاد", "unit": "التحديد الوظيفي", "track": "tech-meca", "order": 13, "trimester": 3},
  {"id": "TECH_MECA_L14", "title": "التحديد الوظيفي للمواد", "unit": "التحديد الوظيفي", "track": "tech-meca", "order": 14, "trimester": 3},
  {"id": "TECH_MECA_L15", "title": "وحدة التثقيب والتجويف", "unit": "مجال الإنتاج", "track": "tech-meca", "order": 15, "trimester": 3},
  {"id": "TECH_MECA_L16", "title": "دراسة مشروع تطبيقي", "unit": "مجال الإنتاج", "track": "tech-meca", "order": 16, "trimester": 3},
  {"id": "TECH_CIVIL_L01", "title": "مفاهيم عامة حول البناء", "unit": "مجال البناء", "track": "tech-civil", "order": 1, "trimester": 1},
  {"id": "TECH_CIVIL_L02", "title": "تحويل الوحدات: القوى والأطوال والمساحات والإجهادات", "unit": "مجال البناء", "track": "tech-civil", "order": 2, "trimester": 1},
  {"id": "TECH_CIVIL_L03", "title": "المنشآت السفلية — الأساسات", "unit": "مجال البناء", "track": "tech-civil", "order": 3, "trimester": 1},
  {"id": "TECH_CIVIL_L04", "title": "المنشآت العلوية", "unit": "مجال البناء", "track": "tech-civil", "order": 4, "trimester": 2},
  {"id": "TECH_CIVIL_L05", "title": "المدارج المستقيمة", "unit": "مجال البناء", "track": "tech-civil", "order": 5, "trimester": 2},
  {"id": "TECH_CIVIL_L06", "title": "الطرق", "unit": "مجال البناء", "track": "tech-civil", "order": 6, "trimester": 3},
  {"id": "TECH_CIVIL_L07", "title": "ردود الأفعال في المساند وتمثيلها", "unit": "مجال الميكانيك — السكون", "track": "tech-civil", "order": 7, "trimester": 1},
  {"id": "TECH_CIVIL_L08", "title": "الأنظمة المثلثية وطرق استخراج المجنّب", "unit": "مجال الميكانيك — السكون", "track": "tech-civil", "order": 8, "trimester": 2},
  {"id": "TECH_CIVIL_L09", "title": "التحريضات البسيطة", "unit": "مقاومة المواد", "track": "tech-civil", "order": 9, "trimester": 2},
  {"id": "TECH_CIVIL_L10", "title": "الشد البسيط", "unit": "مقاومة المواد", "track": "tech-civil", "order": 10, "trimester": 2},
  {"id": "TECH_CIVIL_L11", "title": "القص البسيط", "unit": "مقاومة المواد", "track": "tech-civil", "order": 11, "trimester": 2},
  {"id": "TECH_CIVIL_L12", "title": "الانحناء البسيط في المستوي", "unit": "مقاومة المواد", "track": "tech-civil", "order": 12, "trimester": 3},
  {"id": "TECH_CIVIL_L13", "title": "الخرسانة المسلّحة — الشد البسيط", "unit": "الخرسانة المسلّحة", "track": "tech-civil", "order": 13, "trimester": 3},
  {"id": "TECH_CIVIL_L14", "title": "حساب المساحات والكمّيات", "unit": "الخرسانة المسلّحة", "track": "tech-civil", "order": 14, "trimester": 3},
  {"id": "TECH_CIVIL_L15", "title": "مراقبة المنشآت", "unit": "الخرسانة المسلّحة", "track": "tech-civil", "order": 15, "trimester": 3},
  {"id": "TECH_PROC_L01", "title": "الفحوم الهيدروجينية وتصنيفها", "unit": "الكيمياء العضوية — الفحوم الهيدروجينية", "track": "tech-proc", "order": 1, "trimester": 1},
  {"id": "TECH_PROC_L02", "title": "إيجاد الصيغة المجملة", "unit": "الكيمياء العضوية — الفحوم الهيدروجينية", "track": "tech-proc", "order": 2, "trimester": 1},
  {"id": "TECH_PROC_L03", "title": "الوظائف الأكسجينية", "unit": "الوظائف الأكسجينية", "track": "tech-proc", "order": 3, "trimester": 1},
  {"id": "TECH_PROC_L04", "title": "الأمينات", "unit": "الوظائف الأكسجينية", "track": "tech-proc", "order": 4, "trimester": 2},
  {"id": "TECH_PROC_L05", "title": "الليبيدات", "unit": "الجزيئات الحيوية", "track": "tech-proc", "order": 5, "trimester": 2},
  {"id": "TECH_PROC_L06", "title": "الأحماض الأمينية", "unit": "الجزيئات الحيوية", "track": "tech-proc", "order": 6, "trimester": 2},
  {"id": "TECH_PROC_L07", "title": "البروتينات", "unit": "الجزيئات الحيوية", "track": "tech-proc", "order": 7, "trimester": 2},
  {"id": "TECH_PROC_L08", "title": "الأنزيمات", "unit": "الجزيئات الحيوية", "track": "tech-proc", "order": 8, "trimester": 3},
  {"id": "TECH_PROC_L09", "title": "البوليميرات وطرق البلمرة", "unit": "البوليميرات", "track": "tech-proc", "order": 9, "trimester": 3},
  {"id": "TECH_PROC_L10", "title": "المبدأ الأول للديناميكا الحرارية", "unit": "الديناميكا الحرارية", "track": "tech-proc", "order": 10, "trimester": 1},
  {"id": "TECH_PROC_L11", "title": "الديناميكا الحرارية الكيميائية", "unit": "الديناميكا الحرارية", "track": "tech-proc", "order": 11, "trimester": 2},
  {"id": "TECH_PROC_L12", "title": "الكيمياء الحركية", "unit": "الكيمياء الحركية", "track": "tech-proc", "order": 12, "trimester": 3},
  {"id": "PHY_MT_L01", "title": "طرق المتابعة الزمنية: المعايرة والناقلية والضغط والحجم", "unit": "المتابعة الزمنية لتحول كيميائي", "track": "phy-math", "order": 1, "trimester": 1},
  {"id": "PHY_MT_L02", "title": "سرعة التفاعل وزمن نصف التفاعل", "unit": "المتابعة الزمنية لتحول كيميائي", "track": "phy-math", "order": 2, "trimester": 1},
  {"id": "PHY_MT_L03", "title": "العوامل الحركية", "unit": "المتابعة الزمنية لتحول كيميائي", "track": "phy-math", "order": 3, "trimester": 1},
  {"id": "PHY_MT_L04", "title": "النشاط الإشعاعي", "unit": "دراسة تحولات نووية", "track": "phy-math", "order": 4, "trimester": 1},
  {"id": "PHY_MT_L05", "title": "التناقص الإشعاعي والتأريخ", "unit": "دراسة تحولات نووية", "track": "phy-math", "order": 5, "trimester": 1},
  {"id": "PHY_MT_L06", "title": "الانشطار والاندماج والطاقة المحرَّرة", "unit": "دراسة تحولات نووية", "track": "phy-math", "order": 6, "trimester": 1},
  {"id": "PHY_MT_L07", "title": "ثنائي القطب RC", "unit": "دراسة ظواهر كهربائية", "track": "phy-math", "order": 7, "trimester": 2},
  {"id": "PHY_MT_L08", "title": "ثنائي القطب RL", "unit": "دراسة ظواهر كهربائية", "track": "phy-math", "order": 8, "trimester": 2},
  {"id": "PHY_MT_L09", "title": "حالة التوازن لجملة كيميائية", "unit": "تطور جملة كيميائية نحو حالة التوازن", "track": "phy-math", "order": 9, "trimester": 2},
  {"id": "PHY_MT_L10", "title": "التحولات حمض–أساس", "unit": "تطور جملة كيميائية نحو حالة التوازن", "track": "phy-math", "order": 10, "trimester": 2},
  {"id": "PHY_MT_L11", "title": "المعايرة pH-مترية", "unit": "تطور جملة كيميائية نحو حالة التوازن", "track": "phy-math", "order": 11, "trimester": 2},
  {"id": "PHY_MT_L12", "title": "قوانين نيوتن وتطبيقاتها", "unit": "تطور جملة ميكانيكية", "track": "phy-math", "order": 12, "trimester": 2},
  {"id": "PHY_MT_L13", "title": "السقوط الشاقولي لجسم صلب", "unit": "تطور جملة ميكانيكية", "track": "phy-math", "order": 13, "trimester": 2},
  {"id": "PHY_MT_L14", "title": "حركة قذيفة في حقل الجاذبية", "unit": "تطور جملة ميكانيكية", "track": "phy-math", "order": 14, "trimester": 3},
  {"id": "PHY_MT_L15", "title": "حركة الكواكب والأقمار الاصطناعية", "unit": "تطور جملة ميكانيكية", "track": "phy-math", "order": 15, "trimester": 3},
  {"id": "PHY_MT_L16", "title": "تفاعلات الأسترة والإماهة", "unit": "مراقبة تطور جملة كيميائية", "track": "phy-math", "order": 16, "trimester": 3},
  {"id": "MATH_PHY_U7_L19", "title": "الاهتزازات الميكانيكية", "unit": "تطور جملة مهتزة", "track": "phy-math", "order": 17, "trimester": 3},
  {"id": "MATH_PHY_U7_L20", "title": "الاهتزازات الكهربائية", "unit": "تطور جملة مهتزة", "track": "phy-math", "order": 18, "trimester": 3},
  {"id": "PHY_MT_L19", "title": "ظواهر الانتشار", "unit": "ظواهر الانتشار", "track": "phy-math", "order": 19, "trimester": 3},
  {"id": "PHI_SCI_L01", "title": "المشكلة والإشكالية", "unit": "الإشكالية الأولى: السؤال بين المشكلة والإشكالية", "track": "phi-sci", "order": 1, "trimester": 1},
  {"id": "PHI_SCI_L02", "title": "الفلسفة والعلم", "unit": "الإشكالية الأولى: السؤال بين المشكلة والإشكالية", "track": "phi-sci", "order": 2, "trimester": 1},
  {"id": "PHI_SCI_L03", "title": "أصل المفاهيم الرياضية: العقل والتجربة", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-sci", "order": 3, "trimester": 1},
  {"id": "PHI_SCI_L04", "title": "الاستدلال الرياضي: التحليل والتركيب", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-sci", "order": 4, "trimester": 2},
  {"id": "PHI_SCI_L05", "title": "اليقين الرياضي: الهندسة الإقليدية واللاإقليدية", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-sci", "order": 5, "trimester": 2},
  {"id": "PHI_SCI_L06", "title": "خطوات المنهج التجريبي وقيمة الفرضية", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-sci", "order": 6, "trimester": 2},
  {"id": "PHI_SCI_L07", "title": "الحتمية واللاحتمية", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-sci", "order": 7, "trimester": 2},
  {"id": "PHI_SCI_L08", "title": "الحرية والمسؤولية", "unit": "الإشكالية الثالثة: في العلاقات بين الناس", "track": "phi-sci", "order": 8, "trimester": 2},
  {"id": "PHI_SCI_L09", "title": "العنف والتسامح", "unit": "الإشكالية الثالثة: في العلاقات بين الناس", "track": "phi-sci", "order": 9, "trimester": 3},
  {"id": "PHI_SCI_L10", "title": "مبادئ العقل والمنطق", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-sci", "order": 10, "trimester": 3},
  {"id": "PHI_SCI_L11", "title": "الحدود والتصورات وشروط التعريف المنطقي", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-sci", "order": 11, "trimester": 3},
  {"id": "PHI_SCI_L12", "title": "الأحكام والقضايا والاستغراق", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-sci", "order": 12, "trimester": 3},
  {"id": "PHI_SCI_L13", "title": "الاستدلال المباشر: التقابل والعكس المنطقي", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-sci", "order": 13, "trimester": 3},
  {"id": "PHI_SCI_L14", "title": "الاستدلال غير المباشر: القياس الحملي والشرطي", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-sci", "order": 14, "trimester": 3},
  {"id": "PHI_TE_L01", "title": "المشكلة والإشكالية", "unit": "الإشكالية الأولى: في المشكلة والإشكالية", "track": "phi-tech-eco", "order": 1, "trimester": 1},
  {"id": "PHI_TE_L02", "title": "الفلسفة والعلم", "unit": "الإشكالية الأولى: في المشكلة والإشكالية", "track": "phi-tech-eco", "order": 2, "trimester": 1},
  {"id": "PHI_TE_L03", "title": "أصل المفاهيم الرياضية", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-tech-eco", "order": 3, "trimester": 1},
  {"id": "PHI_TE_L04", "title": "الاستدلال الرياضي واليقين الرياضي", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-tech-eco", "order": 4, "trimester": 2},
  {"id": "PHI_TE_L05", "title": "خطوات المنهج التجريبي", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-tech-eco", "order": 5, "trimester": 2},
  {"id": "PHI_TE_L06", "title": "الحتمية واللاحتمية", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-tech-eco", "order": 6, "trimester": 2},
  {"id": "PHI_TE_L07", "title": "العلوم الإنسانية وإمكان تطبيق المنهج التجريبي", "unit": "الإشكالية الثانية: في فلسفة العلوم", "track": "phi-tech-eco", "order": 7, "trimester": 2},
  {"id": "PHI_TE_L08", "title": "المذهب العقلي والمذهب التجريبي", "unit": "الإشكالية الثالثة: في المذاهب الفلسفية", "track": "phi-tech-eco", "order": 8, "trimester": 3},
  {"id": "PHI_TE_L09", "title": "المذهب المثالي والمذهب الواقعي", "unit": "الإشكالية الثالثة: في المذاهب الفلسفية", "track": "phi-tech-eco", "order": 9, "trimester": 3},
  {"id": "PHI_TE_L10", "title": "المذهب البراغماتي", "unit": "الإشكالية الثالثة: في المذاهب الفلسفية", "track": "phi-tech-eco", "order": 10, "trimester": 3},
  {"id": "PHI_LNG_L01", "title": "المشكلة والإشكالية", "unit": "الإشكالية الأولى: السؤال بين المشكلة والإشكالية", "track": "phi-lang", "order": 1, "trimester": 1},
  {"id": "PHI_LNG_L02", "title": "الفلسفة والعلم", "unit": "الإشكالية الأولى: السؤال بين المشكلة والإشكالية", "track": "phi-lang", "order": 2, "trimester": 1},
  {"id": "PHI_LNG_L03", "title": "الحرية والمسؤولية", "unit": "الإشكالية الثانية: في العلاقات بين الناس", "track": "phi-lang", "order": 3, "trimester": 1},
  {"id": "PHI_LNG_L04", "title": "العنف والتسامح", "unit": "الإشكالية الثانية: في العلاقات بين الناس", "track": "phi-lang", "order": 4, "trimester": 2},
  {"id": "PHI_LNG_L05", "title": "أصل المفاهيم الرياضية", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lang", "order": 5, "trimester": 2},
  {"id": "PHI_LNG_L06", "title": "الاستدلال الرياضي واليقين الرياضي", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lang", "order": 6, "trimester": 2},
  {"id": "PHI_LNG_L07", "title": "خطوات المنهج التجريبي", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lang", "order": 7, "trimester": 2},
  {"id": "PHI_LNG_L08", "title": "الحتمية واللاحتمية", "unit": "الإشكالية الثالثة: في فلسفة العلوم", "track": "phi-lang", "order": 8, "trimester": 3},
  {"id": "PHI_LNG_L09", "title": "مبادئ العقل والمنطق", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-lang", "order": 9, "trimester": 3},
  {"id": "PHI_LNG_L10", "title": "الحدود والتصورات والتعريف المنطقي", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-lang", "order": 10, "trimester": 3},
  {"id": "PHI_LNG_L11", "title": "الأحكام والقضايا", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-lang", "order": 11, "trimester": 3},
  {"id": "PHI_LNG_L12", "title": "الاستدلال المباشر وغير المباشر", "unit": "الإشكالية الرابعة: انطباق الفكر مع نفسه", "track": "phi-lang", "order": 12, "trimester": 3},
  {"id": "MATH_TCH_L01", "title": "النهايات وحالات عدم التعيين", "unit": "الدوال العددية (النهايات)", "track": "math-tech", "order": 1, "trimester": 1},
  {"id": "MATH_TCH_L02", "title": "المستقيمات المقاربة", "unit": "الدوال العددية (النهايات)", "track": "math-tech", "order": 2, "trimester": 1},
  {"id": "MATH_TCH_L03", "title": "الاستمرارية ومبرهنة القيم المتوسطة", "unit": "الدوال العددية (الاشتقاقية والاستمرارية)", "track": "math-tech", "order": 3, "trimester": 1},
  {"id": "MATH_TCH_L04", "title": "المشتقات المتتابعة ومشتق دالة مركّبة", "unit": "الدوال العددية (الاشتقاقية والاستمرارية)", "track": "math-tech", "order": 4, "trimester": 1},
  {"id": "MATH_TCH_L05", "title": "استعمال المشتقات لدراسة خواص دالة: التقريب الخطّي ونقطة الانعطاف", "unit": "الدوال العددية (الاشتقاقية والاستمرارية)", "track": "math-tech", "order": 5, "trimester": 1},
  {"id": "MATH_TCH_L06", "title": "الدوال الأسّية", "unit": "التزايد المقارن ودراسة الدوال", "track": "math-tech", "order": 6, "trimester": 2},
  {"id": "MATH_TCH_L07", "title": "الدوال اللوغاريتمية", "unit": "التزايد المقارن ودراسة الدوال", "track": "math-tech", "order": 7, "trimester": 2},
  {"id": "MATH_TCH_L08", "title": "التزايد المقارن", "unit": "التزايد المقارن ودراسة الدوال", "track": "math-tech", "order": 8, "trimester": 2},
  {"id": "MATH_TCH_L09", "title": "الدوال المثلثية والدوال الصمّاء", "unit": "التزايد المقارن ودراسة الدوال", "track": "math-tech", "order": 9, "trimester": 2},
  {"id": "MATH_TCH_L10", "title": "التذكير بالمتتالية الحسابية والمتتالية الهندسية", "unit": "المتتاليات العددية", "track": "math-tech", "order": 10, "trimester": 2},
  {"id": "MATH_TCH_L11", "title": "المتتاليات المحدودة والمتقاربة", "unit": "المتتاليات العددية", "track": "math-tech", "order": 11, "trimester": 2},
  {"id": "MATH_TCH_L12", "title": "الاستدلال بالتراجع", "unit": "المتتاليات العددية", "track": "math-tech", "order": 12, "trimester": 2},
  {"id": "MATH_TCH_L13", "title": "الدوال الأصلية", "unit": "الدوال الأصلية والتكاملات", "track": "math-tech", "order": 13, "trimester": 3},
  {"id": "MATH_TCH_L14", "title": "الحساب التكاملي وحساب المساحات", "unit": "الدوال الأصلية والتكاملات", "track": "math-tech", "order": 14, "trimester": 3},
  {"id": "MATH_TCH_L15", "title": "الأعداد المركّبة وأشكالها", "unit": "الأعداد المركّبة والتحويلات النقطية", "track": "math-tech", "order": 15, "trimester": 3},
  {"id": "MATH_TCH_L16", "title": "التعبير عن تشابه مباشر بالأعداد المركّبة", "unit": "الأعداد المركّبة والتحويلات النقطية", "track": "math-tech", "order": 16, "trimester": 3},
  {"id": "MATH_TCH_L17", "title": "القسمة والموافقات في Z", "unit": "الحساب في مجموعة الأعداد الصحيحة", "track": "math-tech", "order": 17, "trimester": 1},
  {"id": "MATH_TCH_L18", "title": "الأعداد الأوّلية: التعرّف على أوّلية عدد طبيعي", "unit": "الحساب في مجموعة الأعداد الصحيحة", "track": "math-tech", "order": 18, "trimester": 1},
  {"id": "MATH_TCH_L19", "title": "الإحصاء", "unit": "الإحصاء والاحتمالات", "track": "math-tech", "order": 19, "trimester": 3},
  {"id": "MATH_TCH_L20", "title": "الاحتمالات", "unit": "الإحصاء والاحتمالات", "track": "math-tech", "order": 20, "trimester": 3},
  {"id": "MATH_ECO_L01", "title": "النهايات والاستمرارية", "unit": "الدوال العددية", "track": "math-eco", "order": 1, "trimester": 1},
  {"id": "MATH_ECO_L02", "title": "الدوال المشتقة للدوال المرجعية", "unit": "الدوال العددية", "track": "math-eco", "order": 2, "trimester": 1},
  {"id": "MATH_ECO_L03", "title": "دراسة الدوال والمنحنى الممثّل", "unit": "الدوال العددية", "track": "math-eco", "order": 3, "trimester": 1},
  {"id": "MATH_ECO_L04", "title": "الدالة الأسّية ذات الأساس a ودوال القوى", "unit": "الدوال الأسّية واللوغاريتمية", "track": "math-eco", "order": 4, "trimester": 2},
  {"id": "MATH_ECO_L05", "title": "الدوال اللوغاريتمية", "unit": "الدوال الأسّية واللوغاريتمية", "track": "math-eco", "order": 5, "trimester": 2},
  {"id": "MATH_ECO_L06", "title": "المتتاليات الحسابية والهندسية", "unit": "المتتاليات العددية", "track": "math-eco", "order": 6, "trimester": 2},
  {"id": "MATH_ECO_L07", "title": "المتتاليات المحدودة والمتقاربة", "unit": "المتتاليات العددية", "track": "math-eco", "order": 7, "trimester": 2},
  {"id": "MATH_ECO_L08", "title": "الدوال الأصلية", "unit": "الدوال الأصلية والتكاملات", "track": "math-eco", "order": 8, "trimester": 3},
  {"id": "MATH_ECO_L09", "title": "الحساب التكاملي", "unit": "الدوال الأصلية والتكاملات", "track": "math-eco", "order": 9, "trimester": 3},
  {"id": "MATH_ECO_L10", "title": "الإحصاء", "unit": "الإحصاء والاحتمالات", "track": "math-eco", "order": 10, "trimester": 3},
  {"id": "MATH_ECO_L11", "title": "الاحتمالات الشرطية", "unit": "الإحصاء والاحتمالات", "track": "math-eco", "order": 11, "trimester": 3},
  {"id": "MATH_ECO_L12", "title": "دستور الاحتمالات الكلّية", "unit": "الإحصاء والاحتمالات", "track": "math-eco", "order": 12, "trimester": 3},
  {"id": "MATH_LIT_L01", "title": "النهايات والاستمرارية", "unit": "الدوال العددية", "track": "math-lit", "order": 1, "trimester": 1},
  {"id": "MATH_LIT_L02", "title": "الاشتقاقية وتعيين نقطة الانعطاف", "unit": "الدوال العددية", "track": "math-lit", "order": 2, "trimester": 1},
  {"id": "MATH_LIT_L03", "title": "الدوال التناظرية", "unit": "الدوال العددية", "track": "math-lit", "order": 3, "trimester": 2},
  {"id": "MATH_LIT_L04", "title": "المتتاليات الحسابية والهندسية والوسط الحسابي", "unit": "المتتاليات العددية", "track": "math-lit", "order": 4, "trimester": 2},
  {"id": "MATH_LIT_L05", "title": "المتتاليات من الشكل u(n+1)=a·u(n)+b", "unit": "المتتاليات العددية", "track": "math-lit", "order": 5, "trimester": 2},
  {"id": "MATH_LIT_L06", "title": "استعمال المتتاليات الهندسية في حلّ المسائل", "unit": "المتتاليات العددية", "track": "math-lit", "order": 6, "trimester": 2},
  {"id": "MATH_LIT_L07", "title": "الحساب في مجموعة الأعداد الصحيحة", "unit": "الحساب", "track": "math-lit", "order": 7, "trimester": 1},
  {"id": "MATH_LIT_L08", "title": "تابع الحساب: القسمة والموافقات", "unit": "الحساب", "track": "math-lit", "order": 8, "trimester": 3},
  {"id": "MATH_LIT_L09", "title": "الإحصاء", "unit": "الإحصاء والاحتمالات", "track": "math-lit", "order": 9, "trimester": 3},
  {"id": "MATH_LIT_L10", "title": "الاحتمالات: السحب المتزامن والسحب المتتابع", "unit": "الإحصاء والاحتمالات", "track": "math-lit", "order": 10, "trimester": 3},
  {"id": "ARA_SCI_L01", "title": "خصائص الشعر التعليمي", "unit": "الوحدة الأولى: الشعر التعليمي في عصر الضعف", "track": "ara-sci", "order": 1, "trimester": 1},
  {"id": "ARA_SCI_L02", "title": "شعر الزهد والمدائح النبوية", "unit": "الوحدة الأولى: الشعر التعليمي في عصر الضعف", "track": "ara-sci", "order": 2, "trimester": 1},
  {"id": "ARA_SCI_L03", "title": "البلاغة: المجاز العقلي والمجاز المرسل", "unit": "الوحدة الأولى: الشعر التعليمي في عصر الضعف", "track": "ara-sci", "order": 3, "trimester": 1},
  {"id": "ARA_SCI_L04", "title": "النثر العلمي المتأدّب في العصر المملوكي والعثماني", "unit": "الوحدة الثانية: من نثر الحركة العلمية", "track": "ara-sci", "order": 4, "trimester": 1},
  {"id": "ARA_SCI_L05", "title": "مؤلّفات ابن خلدون والكتابة التاريخية", "unit": "الوحدة الثانية: من نثر الحركة العلمية", "track": "ara-sci", "order": 5, "trimester": 1},
  {"id": "ARA_SCI_L06", "title": "مظاهر التجديد في الشعر العربي الحديث", "unit": "الوحدة الثالثة: النزعة الإنسانية في الشعر", "track": "ara-sci", "order": 6, "trimester": 2},
  {"id": "ARA_SCI_L07", "title": "النزعة الإنسانية في شعر المهجر", "unit": "الوحدة الثالثة: النزعة الإنسانية في الشعر", "track": "ara-sci", "order": 7, "trimester": 2},
  {"id": "ARA_SCI_L08", "title": "شعر النهضة وحضارة الغرب", "unit": "الوحدة الرابعة: شعر النهضة وموقفه من حضارة الغرب", "track": "ara-sci", "order": 8, "trimester": 2},
  {"id": "ARA_SCI_L09", "title": "مدرسة الإحياء والبعث", "unit": "الوحدة الرابعة: شعر النهضة وموقفه من حضارة الغرب", "track": "ara-sci", "order": 9, "trimester": 2},
  {"id": "ARA_SCI_L10", "title": "ظاهرة الالتزام في الأدب", "unit": "الوحدة الخامسة: الشعر الملتزم وقضايا العصر", "track": "ara-sci", "order": 10, "trimester": 2},
  {"id": "ARA_SCI_L11", "title": "الثورة الجزائرية في الشعر العربي", "unit": "الوحدة الخامسة: الشعر الملتزم وقضايا العصر", "track": "ara-sci", "order": 11, "trimester": 3},
  {"id": "ARA_SCI_L12", "title": "القضية الفلسطينية في الشعر", "unit": "الوحدة الخامسة: الشعر الملتزم وقضايا العصر", "track": "ara-sci", "order": 12, "trimester": 3},
  {"id": "ARA_SCI_L13", "title": "الشعر الاجتماعي", "unit": "الوحدة السادسة: الشعر الاجتماعي وقضايا العصر", "track": "ara-sci", "order": 13, "trimester": 3},
  {"id": "ARA_SCI_L14", "title": "النحو: محلّ الجمل من الإعراب", "unit": "الوحدة السادسة: الشعر الاجتماعي وقضايا العصر", "track": "ara-sci", "order": 14, "trimester": 3},
  {"id": "ARA_SCI_L15", "title": "الكتابة المقالية", "unit": "الوحدة السادسة: الشعر الاجتماعي وقضايا العصر", "track": "ara-sci", "order": 15, "trimester": 3},
  {"id": "SVT_MATH_L01", "title": "مقرّ تركيب البروتين في الخلية حقيقية النواة", "unit": "المجال الأول: التخصّص الوظيفي للبروتينات", "track": "svt-math", "order": 1, "trimester": 1},
  {"id": "SVT_MATH_L02", "title": "آلية الاستنساخ", "unit": "المجال الأول: التخصّص الوظيفي للبروتينات", "track": "svt-math", "order": 2, "trimester": 1},
  {"id": "SVT_MATH_L03", "title": "آلية الترجمة والشفرة الوراثية", "unit": "المجال الأول: التخصّص الوظيفي للبروتينات", "track": "svt-math", "order": 3, "trimester": 1},
  {"id": "SVT_MATH_L04", "title": "مستويات البنية الفراغية للبروتين", "unit": "المجال الأول: التخصّص الوظيفي للبروتينات", "track": "svt-math", "order": 4, "trimester": 1},
  {"id": "SVT_MATH_L05", "title": "العلاقة بين البنية والوظيفة", "unit": "المجال الأول: التخصّص الوظيفي للبروتينات", "track": "svt-math", "order": 5, "trimester": 2},
  {"id": "SVT_MATH_L06", "title": "النشاط الأنزيمي للبروتينات", "unit": "المجال الأول: التخصّص الوظيفي للبروتينات", "track": "svt-math", "order": 6, "trimester": 2},
  {"id": "SVT_MATH_L07", "title": "الذات واللاذات: المؤشّرات الغشائية والزمر الدموية", "unit": "المجال الثاني: دور البروتينات في الدفاع عن الذات", "track": "svt-math", "order": 7, "trimester": 2},
  {"id": "SVT_MATH_L08", "title": "تشكّل المعقّد المناعي والتخلّص منه", "unit": "المجال الثاني: دور البروتينات في الدفاع عن الذات", "track": "svt-math", "order": 8, "trimester": 2},
  {"id": "SVT_MATH_L09", "title": "الردّ المناعي الخلطي والعناصر الفاعلة فيه", "unit": "المجال الثاني: دور البروتينات في الدفاع عن الذات", "track": "svt-math", "order": 9, "trimester": 2},
  {"id": "SVT_MATH_L10", "title": "منشأ الخلايا LB ومقرّ اكتسابها كفاءتها المناعية", "unit": "المجال الثاني: دور البروتينات في الدفاع عن الذات", "track": "svt-math", "order": 10, "trimester": 3},
  {"id": "SVT_MATH_L11", "title": "تحفيز الخلايا المناعية المحسَّسة والردّ المناعي الخلوي", "unit": "المجال الثاني: دور البروتينات في الدفاع عن الذات", "track": "svt-math", "order": 11, "trimester": 3},
  {"id": "SVT_MATH_L12", "title": "العجز المناعي إثر الإصابة بفيروس HIV", "unit": "المجال الثاني: دور البروتينات في الدفاع عن الذات", "track": "svt-math", "order": 12, "trimester": 3},
];

const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]));

/** الشعب الرسمية — كلّها معروضة ولو لم تكتمل دروسها */
/* الشعب الستّ المعتمدة. وفروع تقني رياضي الأربعة (مدنية · ميكانيكية ·
   كهربائية · هندسة الطرائق) ليست شعباً مستقلّة بل تخصّصات داخلها،
   تشترك في كل المواد ولا تفترق إلّا في مادّة التكنولوجيا. */
export const OFFICIAL_STREAMS: string[] = ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد", "آداب وفلسفة", "لغات أجنبية"];

export const STREAMS: string[] = OFFICIAL_STREAMS;

/** نسخ المنهج التي تدرسها شعبة معيّنة */
export function tracksOf(stream: string): CurriculumTrack[] {
  return TRACKS.filter((t) => t.streams.includes(stream));
}

/** مواد شعبة معيّنة — بلا تكرار ولو تعدّدت نسخها */
export function subjectsOf(stream: string): string[] {
  return [...new Set(tracksOf(stream).map((t) => t.subject))];
}

/**
 * نسخة المنهج التي تخصّ هذه الشعبة في هذه المادة.
 *
 * وهي المفتاح كلّه: المادة الواحدة قد يكون لها أكثر من نسخة،
 * والشعبة تحدّد أيّها يُعرض. من غيرها يرى طالب شعبة رياضيات دروس
 * رياضيات علوم تجريبية.
 */
export function trackFor(stream: string, subject: string): CurriculumTrack | undefined {
  return TRACKS.find((t) => t.subject === subject && t.streams.includes(stream));
}

/** دروس مادّة داخل شعبة، مرتّبة بالفصل ثمّ الترتيب */
export function lessonsOf(stream: string, subject: string): Lesson[] {
  const track = trackFor(stream, subject);
  if (!track) return [];
  return LESSONS.filter((l) => l.track === track.id)
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

/** مادّة الدرس — تُقرأ من نسخته لا من حقل مكرّر فيه */
export function subjectOfLesson(lesson: Lesson): string {
  return TRACK_BY_ID.get(lesson.track)?.subject ?? "";
}

/** هل يخصّ هذا الدرس هذه الشعبة؟ */
export function inStream(lesson: Lesson, stream: string): boolean {
  return TRACK_BY_ID.get(lesson.track)?.streams.includes(stream) ?? false;
}

/* ⚠️ اكتمال التغطية — يُقرأ قبل عرض شعبة للطالب.
   عرض شعبة ناقصة كأنّها كاملة يجعل الطالب يظنّ أنّه أنهى برنامجه. */
/* اكتملت التغطية: كل مادّة معتمدة في كل شعبة صار لها برنامجها.
   يبقى «partial» لما لم يُستكمل بعدُ من تفاصيل داخل الوحدات. */
export const STREAM_COVERAGE: Record<string, "full" | "partial"> = {
  "علوم تجريبية": "full",
  "رياضيات": "full",
  "تقني رياضي": "full",
  "تسيير واقتصاد": "full",
  "آداب وفلسفة": "full",
  "لغات أجنبية": "full",
};

export function isStreamComplete(stream: string): boolean {
  return STREAM_COVERAGE[stream] === "full";
}
