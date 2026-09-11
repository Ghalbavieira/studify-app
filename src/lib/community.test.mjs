import test from "node:test";
import assert from "node:assert/strict";
import { initialCommunity, visiblePosts, communitySchema } from "./community.ts";

test("community feed respects local visibility and chronological order", () => {
  const data = initialCommunity();
  const base = data.posts[0];
  data.posts = [
    { ...base, id: "public", visibility: "public", createdAt: "2026-09-01T12:00:00Z" },
    { ...base, id: "private", visibility: "private", authorId: "other" },
    { ...base, id: "group", visibility: "group", createdAt: "2026-09-02T12:00:00Z" },
    { ...base, id: "own", visibility: "private", authorId: "self", createdAt: "2026-09-03T12:00:00Z" },
  ];
  assert.deepEqual(visiblePosts(data, "self").map((post) => post.id), ["own", "public"]);
  data.members.push({ groupId: base.groupId, userId: "self", name: "Self", joinedAt: base.createdAt });
  assert.deepEqual(visiblePosts(data, "self").map((post) => post.id), ["own", "group", "public"]);
  assert.equal(visiblePosts(data, "self", "unknown").length, 0);
  assert.ok(communitySchema.safeParse(data).success);
});
