import Image from "next/image";
import type { SocialProfile } from "@/lib/social";

export function UserAvatar({ profile, large = false, size }: { profile: SocialProfile; large?: boolean; size?: "sm" | "md" }) {
  const compact = size === "sm";
  const pixels = large ? 72 : compact ? 34 : 40;
  const classes = large ? "h-[72px] w-[72px] text-2xl" : compact ? "h-[34px] w-[34px] text-xs" : "h-10 w-10 text-sm";
  return profile.avatar ? <Image unoptimized src={profile.avatar.url} alt={`Foto de ${profile.name}`} width={pixels} height={pixels} className="shrink-0 rounded-lg object-cover" /> : <span aria-label={`Avatar de ${profile.name}`} className={`flex shrink-0 items-center justify-center rounded-lg bg-accent-subtle font-semibold text-accent ${classes}`}>{profile.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>;
}
