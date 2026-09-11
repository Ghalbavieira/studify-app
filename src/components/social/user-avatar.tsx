import Image from "next/image";
import type { SocialProfile } from "@/lib/social";

export function UserAvatar({ profile, large = false }: { profile: SocialProfile; large?: boolean }) {
  const size = large ? 72 : 40;
  return profile.avatar ? <Image unoptimized src={profile.avatar.url} alt={`Foto de ${profile.name}`} width={size} height={size} className="shrink-0 rounded-lg object-cover" /> : <span aria-label={`Avatar de ${profile.name}`} className={`flex shrink-0 items-center justify-center rounded-lg bg-accent-subtle font-semibold text-accent ${large ? "h-[72px] w-[72px] text-2xl" : "h-10 w-10 text-sm"}`}>{profile.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>;
}
