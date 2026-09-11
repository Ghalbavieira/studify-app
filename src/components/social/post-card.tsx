import Image from "next/image";
import Link from "next/link";
import type { Post, SocialProfile } from "@/lib/social";
import { UserAvatar } from "./user-avatar";
import { PostActions } from "./post-actions";
import { timeLabel } from "../study-ui";

export function PostCard({ post, author, repostedBy }: { post: Post; author: SocialProfile; repostedBy?: string }) {
  return <article className="border-b border-line py-5">
    {repostedBy && <p className="mb-3 text-xs text-success">{repostedBy} repostou</p>}
    <div className="flex gap-3"><Link href={`/comunidade/${author.username}`}><UserAvatar profile={author} /></Link><div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><Link href={`/comunidade/${author.username}`} className="font-semibold hover:text-accent">{author.name}</Link><span className="text-xs text-muted">@{author.username}</span><Link href={`/comunidade/publicacao/${post.id}`} className="text-xs text-muted"><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</time></Link></div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-secondary">{post.text.split(/(#[\p{L}\p{N}_]+)/u).map((part, index) => part.startsWith("#") ? <Link key={index} href={`/comunidade?q=${encodeURIComponent(part)}`} className="text-accent">{part}</Link> : part)}</p>
      {post.media && <Link href={`/comunidade/publicacao/${post.id}`} className="mt-3 block"><Image unoptimized src={post.media.url} alt={post.media.alt} width={720} height={480} className="max-h-[480px] w-full rounded-lg object-contain bg-background-secondary" /></Link>}
      {(post.subject || post.topic || post.objective) && <p className="mt-3 text-xs text-highlight">{[post.subject, post.topic, post.objective].filter(Boolean).join(" · ")}</p>}
      {post.metrics && <p className="mt-3 text-xs text-accent">{timeLabel(post.metrics.seconds)} estudados · {post.metrics.questions} questões{post.metrics.accuracy !== null && ` · ${Math.round(post.metrics.accuracy * 100)}% de acerto`}</p>}
      <PostActions postId={post.id} />
    </div></div>
  </article>;
}
