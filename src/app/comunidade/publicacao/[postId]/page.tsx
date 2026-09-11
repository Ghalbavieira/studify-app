import { CommentThread } from "@/components/social/comment-thread";

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return <CommentThread postId={postId} />;
}
