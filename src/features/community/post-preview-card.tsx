"use client";

import { memo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faComment, faPaperclip } from "@fortawesome/free-solid-svg-icons";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { Card } from "@/components/ui/kit";
import { timeAgo } from "@/lib/time-ago";
import { votePost, type Post } from "@/features/community/social";

/* ════════════════════════════════════════════════════════════
   بطاقة معاينة منشور — تُستعمل خارج صفحة المجتمع

   هذه **معاينة** لا نسخة ثانية من بطاقة المجتمع: نصّ مقصوص، بلا
   قائمة تحرير ولا شبكة وسائط ولا مشاركة. لكنّها تتكلّم اللغة
   البصرية نفسها — الصورة والحجم والحدّ وشريط الإجراءات — فلا
   يشعر المستخدم أنّه انتقل بين منتجين حين ينتقل بين صفحتين.
   ════════════════════════════════════════════════════════════ */

export const PostPreviewCard = memo(function PostPreviewCard({
  p, uid,
}: { p: Post; uid: string }) {
  return (
    <Card as="article" flush className="p-3.5 sm:p-4" interactive>
      <Link href={`/community/${p.id}`} className="flex items-center gap-2.5">
        <LiveAvatar uid={p.authorId} name={p.authorName} size="md" />
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate text-[13.5px] font-extrabold text-text-primary">{p.authorName}</span>
            <RoleBadge uid={p.authorId} role={p.authorRole} />
          </span>
          <span className="text-[11.5px] font-semibold text-text-muted">{timeAgo(p.createdAt)}</span>
        </div>
      </Link>

      {p.text && (
        <Link href={`/community/${p.id}`}
          className="mt-2.5 block line-clamp-3 text-[14px] leading-relaxed text-text-primary">
          {p.text}
        </Link>
      )}

      {p.attachmentKind === "file" && (
        <div className="mt-2.5 flex min-h-11 items-center gap-2 rounded-item border border-border bg-background px-3 text-[12.5px] font-bold text-text-muted">
          <FontAwesomeIcon icon={faPaperclip} className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{p.fileName || "ملفّ مرفق"}</span>
        </div>
      )}

      {/* شريط الإجراءات — ٤٤px مضمونة، كانت أزراره ٣٢px */}
      <div className="mt-3 flex items-center gap-3 border-t border-border pt-2.5">
        <div className="flex items-center rounded-chip bg-background">
          <button onClick={() => votePost(p.id, uid, 1, p.myVote)} aria-label="تصويت مفيد"
            className={`grid h-11 w-11 place-items-center rounded-chip transition ${
              p.myVote === 1 ? "text-secondary" : "text-text-muted hover:text-secondary"}`}>
            <FontAwesomeIcon icon={faArrowUp} className="h-4 w-4" />
          </button>
          <span className={`min-w-5 text-center text-[13px] font-extrabold ${
            p.score > 0 ? "text-secondary" : p.score < 0 ? "text-danger" : "text-text-muted"}`}>
            {p.score}
          </span>
          <button onClick={() => votePost(p.id, uid, -1, p.myVote)} aria-label="تصويت غير مفيد"
            className={`grid h-11 w-11 place-items-center rounded-chip transition ${
              p.myVote === -1 ? "text-danger" : "text-text-muted hover:text-danger"}`}>
            <FontAwesomeIcon icon={faArrowDown} className="h-4 w-4" />
          </button>
        </div>

        <Link href={`/community/${p.id}`}
          className="flex min-h-11 items-center gap-1.5 rounded-item px-2 text-[12.5px] font-bold text-text-muted transition hover:bg-primary/[0.08] hover:text-primary">
          <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
          {p.commentCount > 0 ? `${p.commentCount} تعليق` : "تعليق"}
        </Link>
      </div>
    </Card>
  );
});
