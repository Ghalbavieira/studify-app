"use client";

import { useState } from "react";
import { useSocial } from "@/lib/social-store";
import type { SocialProfile } from "@/lib/social";
import { UserAvatar } from "./user-avatar";
import { secondaryButtonClass, timeLabel } from "../study-ui";

export function FollowButton({ profileId }: { profileId: string }) {
  const { data, me, update } = useSocial();
  const [error, setError] = useState("");
  const following = data.follows.some((follow) => follow.followerId === me.id && follow.followingId === profileId);
  if (profileId === me.id) return null;
  return <div><button aria-pressed={following} className={`${secondaryButtonClass} ${following ? "text-accent" : ""}`} onClick={() => {
    try { update((current) => ({ ...current, follows: following ? current.follows.filter((follow) => !(follow.followerId === me.id && follow.followingId === profileId)) : [...current.follows, { followerId: me.id, followingId: profileId, createdAt: new Date().toISOString() }] })); setError(""); } catch { setError("Não foi possível salvar."); }
  }}>{following ? "Seguindo" : "Seguir"}</button>{error && <p role="alert" className="text-xs text-error">{error}</p>}</div>;
}

export function SocialProfileHeader({ profile }: { profile: SocialProfile }) {
  const { data } = useSocial();
  return <header className="py-6"><div className="flex items-start justify-between gap-4"><UserAvatar profile={profile} large /><FollowButton profileId={profile.id} /></div><h1 className="mt-4 text-2xl font-semibold">{profile.name}</h1><p className="text-sm text-muted">@{profile.username}</p><p className="mt-4 max-w-xl text-sm leading-7 text-secondary">{profile.bio}</p>{profile.objective && <p className="mt-3 text-sm text-highlight">Objetivo · {profile.objective}</p>}<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><span><strong className="text-foreground">{data.follows.filter((follow) => follow.followerId === profile.id).length}</strong> seguindo</span><span><strong className="text-foreground">{data.follows.filter((follow) => follow.followingId === profile.id).length}</strong> seguidores</span>{profile.studiedSeconds !== null && <span>{timeLabel(profile.studiedSeconds)} estudados</span>}</div>{profile.subjects.length > 0 && <p className="mt-3 text-xs text-accent">{profile.subjects.join(" · ")}</p>}</header>;
}
