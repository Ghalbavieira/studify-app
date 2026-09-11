import { SocialGroupPage } from "@/components/social/social-groups";

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SocialGroupPage slug={slug} />;
}
