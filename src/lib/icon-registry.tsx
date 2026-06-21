"use client";

import {
  faChalkboardUser, faMicrophoneLines, faRobot, faTrophy, faUsers,
  faGift, faBan, faSignal, faFlag, faLayerGroup, faFolder, faBell,
  faClock, faComments, faBookOpen, faGraduationCap, faStar, faBolt,
  faFlask, faListCheck, faCrown, faHeart, faRocket, faLightbulb,
  faPenToSquare, faChartLine, faShield, faMedal, faFire, faBrain,
  faCalendarCheck, faVideo, faCheckCircle, faGlobe, faMobileScreen,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/**
 * سجلّ الأيقونات: يربط معرّف نصّي بأيقونة FontAwesome.
 * يُستخدم في لوحة التحكّم لاختيار أيقونة البطاقات، وفي العرض.
 */
export const ICON_REGISTRY: Record<string, IconDefinition> = {
  chalkboard: faChalkboardUser,
  microphone: faMicrophoneLines,
  robot: faRobot,
  trophy: faTrophy,
  users: faUsers,
  gift: faGift,
  ban: faBan,
  signal: faSignal,
  flag: faFlag,
  layers: faLayerGroup,
  folder: faFolder,
  bell: faBell,
  clock: faClock,
  comments: faComments,
  book: faBookOpen,
  graduation: faGraduationCap,
  star: faStar,
  bolt: faBolt,
  flask: faFlask,
  checklist: faListCheck,
  crown: faCrown,
  heart: faHeart,
  rocket: faRocket,
  lightbulb: faLightbulb,
  edit: faPenToSquare,
  chart: faChartLine,
  shield: faShield,
  medal: faMedal,
  fire: faFire,
  brain: faBrain,
  calendar: faCalendarCheck,
  video: faVideo,
  check: faCheckCircle,
  globe: faGlobe,
  mobile: faMobileScreen,
};

/** قائمة المعرّفات لعرضها في منتقي الأيقونات */
export const ICON_KEYS = Object.keys(ICON_REGISTRY);

/** هل النص إيموجي؟ (يبدأ بحرف خارج النطاق اللاتيني/العربي الأساسي) */
export function isEmoji(s?: string): boolean {
  if (!s) return false;
  // إيموجي عادةً يقع في نطاقات معيّنة من Unicode
  return /\p{Extended_Pictographic}/u.test(s);
}

/** احصل على أيقونة FontAwesome من المعرّف، أو null إن لم تكن مسجّلة */
export function getIcon(key?: string): IconDefinition | null {
  if (!key) return null;
  return ICON_REGISTRY[key] ?? null;
}
