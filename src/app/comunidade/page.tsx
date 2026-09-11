import { SocialFeed } from "@/components/social/social-feed";

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <SocialFeed key={q ?? ""} initialQuery={q ?? ""} />;
}
