import { faChalkboard, faFileLines, faMicrophone, faTrophy, faUsers, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import type { FeaturePage } from "./features-data";

export const FEATURE_ICON: Record<FeaturePage["icon"], typeof faUsers> = {
  rooms: faChalkboard,
  voice: faMicrophone,
  community: faUsers,
  files: faFileLines,
  ai: faWandMagicSparkles,
  achievements: faTrophy,
};
