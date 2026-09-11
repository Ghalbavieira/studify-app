import { SocialProfilePage } from "@/components/social/social-profile";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: username } = await params;
  return <SocialProfilePage username={username} />;
}
