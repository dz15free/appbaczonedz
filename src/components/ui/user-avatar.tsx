"use client";

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-xl",
  xl: "h-20 w-20 text-3xl",
};

export function UserAvatar({ name, avatarUrl, size = "md", className = "" }: Props) {
  const sz = SIZES[size];
  const initial = (name || "ط").charAt(0);

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${sz} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`grid ${sz} shrink-0 place-items-center rounded-full bg-gradient-primary font-bold text-white ${className}`}
    >
      {initial}
    </span>
  );
}
