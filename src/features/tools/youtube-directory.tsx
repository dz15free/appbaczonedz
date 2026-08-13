"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faMagnifyingGlass, faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import type { ChannelCategory } from "@/features/tools/channels-data";
import { searchUrl } from "@/features/tools/channels-data";

const ALL = "الكل";

export function YouTubeDirectory({ categories }: { categories: ChannelCategory[] }) {
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");

  const visibleCategories = useMemo(() => {
    return categories
      .filter((category) => activeCategory === ALL || category.category === activeCategory)
      .map((category) => ({
        ...category,
        channels: category.channels.filter((name) => !normalizedQuery || `${name} ${category.category}`.toLocaleLowerCase("ar").includes(normalizedQuery)),
      }))
      .filter((category) => category.channels.length > 0);
  }, [activeCategory, categories, normalizedQuery]);

  const visibleCount = visibleCategories.reduce((total, category) => total + category.channels.length, 0);

  return (
    <section className="bz-youtube-directory" id="channel-directory" aria-label="دليل قنوات يوتيوب">
      <div className="bz-youtube-discovery">
        <div className="bz-youtube-search-wrap">
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الأستاذ أو المادة" aria-label="ابحث في القنوات" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث">مسح</button>}
        </div>
        <div className="bz-youtube-results-note"><strong>{visibleCount}</strong> نتيجة ظاهرة <span>من الأسماء المتاحة في الدليل</span></div>
      </div>

      <div className="bz-youtube-tabs" role="tablist" aria-label="تصفية حسب المادة">
        <button type="button" role="tab" aria-selected={activeCategory === ALL} className={activeCategory === ALL ? "is-active" : ""} onClick={() => setActiveCategory(ALL)}>كل التصنيفات</button>
        {categories.map((category) => <button key={category.category} type="button" role="tab" aria-selected={activeCategory === category.category} className={activeCategory === category.category ? "is-active" : ""} onClick={() => setActiveCategory(category.category)}>{category.category}<small>{category.channels.length}</small></button>)}
      </div>

      {visibleCategories.length === 0 ? (
        <div className="bz-youtube-empty"><FontAwesomeIcon icon={faMagnifyingGlass} /><h2>لا توجد نتيجة بهذا البحث</h2><p>جرّب اسماً أقصر أو اختر «كل التصنيفات» للعودة إلى الدليل الكامل.</p><button type="button" onClick={() => { setQuery(""); setActiveCategory(ALL); }}>عرض كل القنوات</button></div>
      ) : (
        <div className="bz-youtube-category-list">
          {visibleCategories.map((category) => (
            <section key={category.category} className="bz-youtube-category">
              <div className="bz-youtube-category-head"><div><span className="bz-youtube-category-kicker">مصادر {category.category}</span><h2>{category.category}</h2></div><span className="bz-youtube-category-count">{category.channels.length} اسم</span></div>
              <div className="bz-youtube-card-grid">
                {category.channels.map((name) => (
                  <a key={name} href={searchUrl(name)} target="_blank" rel="noreferrer nofollow" className="bz-youtube-card">
                    <span className="bz-youtube-card-icon" aria-hidden="true"><FontAwesomeIcon icon={faPlayCircle} /></span>
                    <span className="bz-youtube-card-body"><span className="bz-youtube-card-subject">{category.category}</span><strong>{name}</strong><small>نتيجة بحث بالاسم في يوتيوب</small></span>
                    <span className="bz-youtube-card-action">افتح البحث <FontAwesomeIcon icon={faArrowUpRightFromSquare} /></span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
