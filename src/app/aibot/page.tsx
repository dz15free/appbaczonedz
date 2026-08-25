"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUp,
  faBars,
  faBookOpen,
  faCheck,
  faChevronLeft,
  faClock,
  faEllipsisVertical,
  faFile,
  faFilePdf,
  faFileWord,
  faGraduationCap,
  faListCheck,
  faPaperclip,
  faPen,
  faPlus,
  faRobot,
  faSpinner,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { ref, query, orderByChild, limitToLast, get } from "firebase/database";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { TRACKS } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { MarwaMessage } from "@/components/ui/marwa-message";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { extractTasksFromPlan, addStudyTasksBatch } from "@/features/study/study-tasks";
import { isFirebaseConfigured, rtdb } from "@/lib/firebase/config";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { prepareFile, prepareImagePair } from "@/lib/upload";
import { isDriveConfigured, initDrive, connectDrive, hasDriveToken, uploadToDrivePrivate } from "@/lib/gdrive";
import Link from "next/link";
import {
  appendKhabbashaMessage,
  createKhabbashaConversation,
  deleteKhabbashaConversation,
  ensureKhabbashaConversations,
  getActiveKhabbashaConversation,
  getKhabbashaAttachmentPreview,
  listenKhabbashaConversations,
  listenKhabbashaMessages,
  migrateLegacyKhabbashaChat,
  renameKhabbashaConversation,
  saveKhabbashaAttachment,
  setActiveKhabbashaConversation,
  type KhabbashaAttachment,
  type KhabbashaConversation,
  type KhabbashaMessage,
} from "@/features/ai/khabbasha-conversations";

const GREETING =
  "أهلاً! أنا **الخباشة** 🌟 مساعدتك الآلية، وهنا لأساعدك في دراستك.\n\nاسألني عن أي درس، أو اطلب خطة مراجعة، أو دعني أختبرك! يمكنني أيضاً شرح المعادلات الرياضية خطوة بخطوة.";

const SUGGESTIONS = [
  { icon: faBookOpen, text: "أعطني أفضل ملخّص في المكتبة" },
  { icon: faListCheck, text: "ضع لي خطة مراجعة لأسبوع" },
  { icon: faGraduationCap, text: "اختبرني في مادة من اختياري" },
  { icon: faClock, text: "كيف أنظّم وقتي قبل الباك؟" },
];

type PendingAttachment = {
  id: string;
  file: File;
  type: "image" | "pdf" | "docx";
  mimeType: string;
  previewDataUrl?: string;
  dataUrl?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

function formatConversationTime(ts: number) {
  if (!ts) return "";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short" }).format(new Date(ts));
}

function attachmentIcon(type: KhabbashaAttachment["type"]) {
  if (type === "pdf") return faFilePdf;
  if (type === "docx") return faFileWord;
  if (type === "image") return faFile;
  return faFile;
}

function SavePlanButton({ text }: { text: string }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const count = extractTasksFromPlan(text).length;

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await addStudyTasksBatch(user.uid, extractTasksFromPlan(text));
      setSaved(true);
    } finally { setSaving(false); }
  }

  if (saved) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-secondary">
          <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> أُضيفت {count} مهمة لقائمتك
        </span>
        <Link href="/tools/tasks" className="text-xs font-bold text-primary hover:underline">عرض مهامي ←</Link>
      </div>
    );
  }

  return (
    <button onClick={save} disabled={saving} className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50">
      <FontAwesomeIcon icon={saving ? faSpinner : faListCheck} className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
      احفظ كمهام ({count})
    </button>
  );
}

function MessageAttachment({ attachment, uid, conversationId }: { attachment: KhabbashaAttachment; uid: string; conversationId: string }) {
  const [preview, setPreview] = useState(attachment.previewDataUrl ?? "");
  useEffect(() => {
    if (preview || attachment.type !== "image" || attachment.source !== "rtdb-base64") return;
    let alive = true;
    getKhabbashaAttachmentPreview(uid, conversationId, attachment.id).then((value) => { if (alive && value) setPreview(value); }).catch(() => undefined);
    return () => { alive = false; };
  }, [attachment.id, attachment.source, attachment.type, conversationId, preview, uid]);

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-current/10 bg-black/5">
      {attachment.type === "image" && preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={attachment.fileName} className="max-h-64 w-full object-contain" />
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FontAwesomeIcon icon={attachmentIcon(attachment.type)} className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><b className="block truncate text-xs">{attachment.fileName}</b><span className="block text-[11px] opacity-70">{attachment.mimeType}</span></span>
        </div>
      )}
    </div>
  );
}

export default function AibotPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const trackName = TRACKS.find((t) => t.id === profile?.track)?.name ?? "";

  const [conversations, setConversations] = useState<KhabbashaConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<KhabbashaMessage[]>([]);
  const [input, setInput] = useState("");
  const [restoring, setRestoring] = useState(true);
  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<KhabbashaConversation | null>(null);
  const [renameText, setRenameText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<KhabbashaConversation | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [driveToken, setDriveToken] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);
  const libRef = useRef<{ title: string; subject: string; chapter?: string; uploaderName?: string }[]>([]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setInput(q.slice(0, 500));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    get(query(ref(rtdb, "library"), orderByChild("createdAt"), limitToLast(80)))
      .then((snap) => {
        const val = (snap.val() as Record<string, any>) ?? {};
        libRef.current = Object.values(val).map((e: any) => ({ title: e.title, subject: e.subject, chapter: e.chapter, uploaderName: e.uploaderName }));
      })
      .catch(() => { libRef.current = []; });
  }, []);

  useEffect(() => {
    let alive = true;
    hydratedRef.current = false;
    setReady(false);
    setActiveId(null);
    setConversations([]);
    setMessages([]);

    if (!user) {
      if (!loading) setRestoring(false);
      return () => { alive = false; };
    }

    setRestoring(true);
    (async () => {
      await migrateLegacyKhabbashaChat(user.uid);
      let list = await ensureKhabbashaConversations(user.uid);
      if (list.length === 0) {
        const created = await createKhabbashaConversation(user.uid);
        list = [created];
      }
      const storedActive = await getActiveKhabbashaConversation(user.uid);
      const selected = list.some((item) => item.id === storedActive) ? storedActive! : list[0].id;
      if (!alive) return;
      setConversations(list);
      setActiveId(selected);
      await setActiveKhabbashaConversation(user.uid, selected);
      if (!alive) return;
      hydratedRef.current = true;
      setReady(true);
    })().catch(() => {
      if (alive) setNotice("تعذّر استعادة محادثاتك الآن. أعد المحاولة بعد لحظات.");
    });

    return () => { alive = false; };
  }, [loading, user]);

  useEffect(() => {
    if (!user || !ready) return;
    const unsubscribe = listenKhabbashaConversations(user.uid, setConversations);
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [user, ready]);

  useEffect(() => {
    if (!user || !ready || !activeId) return;
    setRestoring(true);
    setMessages([]);
    const unsubscribe = listenKhabbashaMessages(user.uid, activeId, (items) => {
      setMessages(items);
      setRestoring(false);
    });
    void setActiveKhabbashaConversation(user.uid, activeId).catch(() => undefined);
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [user, ready, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function autoGrow() {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = Math.min(element.scrollHeight, 140) + "px";
  }

  async function selectConversation(id: string) {
    setActiveId(id);
    setMobileConversationsOpen(false);
    if (user) await setActiveKhabbashaConversation(user.uid, id).catch(() => undefined);
  }

  async function createNewConversation() {
    if (!user) return;
    try {
      const created = await createKhabbashaConversation(user.uid);
      setConversations((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setActiveId(created.id);
      setMessages([]);
      setNotice("");
      setMobileConversationsOpen(false);
    } catch {
      setNotice("تعذّر إنشاء محادثة جديدة. حاول مجددًا.");
    }
  }

  function beginRename(item: KhabbashaConversation) {
    setRenameTarget(item);
    setRenameText(item.title);
  }

  async function confirmRename() {
    if (!user || !renameTarget || !renameText.trim()) return;
    try {
      await renameKhabbashaConversation(user.uid, renameTarget.id, renameText);
      setConversations((items) => items.map((item) => item.id === renameTarget.id ? { ...item, title: renameText.trim().slice(0, 80) } : item));
      setRenameTarget(null);
    } catch {
      setNotice("تعذّرت إعادة تسمية المحادثة.");
    }
  }

  async function confirmDelete() {
    if (!user || !deleteTarget) return;
    const deletedId = deleteTarget.id;
    try {
      await deleteKhabbashaConversation(user.uid, deletedId);
      const remaining = conversations.filter((item) => item.id !== deletedId);
      if (remaining.length === 0) {
        const created = await createKhabbashaConversation(user.uid);
        setConversations([created]);
        setActiveId(created.id);
      } else {
        const next = remaining.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setConversations(remaining);
        if (activeId === deletedId) setActiveId(next.id);
      }
      setDeleteTarget(null);
    } catch {
      setNotice("تعذّر حذف المحادثة. لم نغيّر بقية محادثاتك.");
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc");
    if (!isImage && !isPdf && !isDocx) {
      setNotice("يمكن إرفاق الصور وPDF وWord فقط.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotice("الحد الأقصى للمرفق 8 ميغابايت.");
      return;
    }
    try {
      if (isImage) {
        const pair = await prepareImagePair(file);
        setPendingAttachments((items) => [...items, { id: crypto.randomUUID(), file, type: "image", mimeType: file.type || "image/jpeg", dataUrl: pair.full, previewDataUrl: pair.thumb }]);
      } else {
        setPendingAttachments((items) => [...items, { id: crypto.randomUUID(), file, type: isPdf ? "pdf" : "docx", mimeType: file.type || "application/octet-stream" }]);
      }
      setNotice("");
    } catch {
      setNotice("تعذّرت قراءة المرفق. جرّب ملفًا آخر.");
    }
  }

  function removePending(id: string) {
    setPendingAttachments((items) => items.filter((item) => item.id !== id));
  }

  async function persistPendingAttachments(): Promise<{ attachments: KhabbashaAttachment[]; driveAccessToken: string }> {
    if (!user || !activeId) return { attachments: [], driveAccessToken: driveToken };
    const attachments: KhabbashaAttachment[] = [];
    let activeDriveToken = driveToken;
    for (const pending of pendingAttachments) {
      if (pending.type === "image") {
        const id = await saveKhabbashaAttachment(user.uid, activeId, {
          dataUrl: pending.dataUrl ?? "",
          previewDataUrl: pending.previewDataUrl,
          fileName: pending.file.name,
          mimeType: pending.mimeType,
          size: pending.file.size,
        });
        attachments.push({ id, type: "image", fileName: pending.file.name, mimeType: pending.mimeType, size: pending.file.size, source: "rtdb-base64" });
        continue;
      }

      if (isDriveConfigured()) {
        if (!hasDriveToken()) await initDrive();
        const token = activeDriveToken || await connectDrive();
        activeDriveToken = token;
        setDriveToken(token);
        const uploaded = await uploadToDrivePrivate(pending.file);
        attachments.push({ id: uploaded.id, type: pending.type, fileName: uploaded.name || pending.file.name, mimeType: pending.mimeType, size: pending.file.size, source: "drive", driveId: uploaded.id });
      } else {
        const prepared = await prepareFile(pending.file);
        const id = await saveKhabbashaAttachment(user.uid, activeId, {
          dataUrl: prepared.dataUrl,
          fileName: pending.file.name,
          mimeType: pending.mimeType,
          size: pending.file.size,
        });
        attachments.push({ id, type: pending.type, fileName: pending.file.name, mimeType: pending.mimeType, size: pending.file.size, source: "rtdb-base64" });
      }
    }
    return { attachments, driveAccessToken: activeDriveToken };
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!user || !activeId || restoring || thinking || (!trimmed && pendingAttachments.length === 0)) return;
    setThinking(true);
    setUploading(pendingAttachments.length > 0);
    setNotice("");
    try {
      const { attachments, driveAccessToken } = await persistPendingAttachments();
      const savedUser = await appendKhabbashaMessage(user.uid, activeId, { role: "user", text: trimmed, attachments });
      setMessages((items) => items.some((item) => item.id === savedUser.id) ? items : [...items, savedUser]);
      setInput("");
      setPendingAttachments([]);
      if (inputRef.current) inputRef.current.style.height = "auto";

      const idToken = await user.getIdToken();
      const response = await fetch("/api/aibot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          conversationId: activeId,
          currentMessageId: savedUser.id,
          text: trimmed,
          attachments,
          track: trackName,
          library: libRef.current,
          driveAccessToken,
        }),
      });
      const data = await response.json();
      const replyText = response.ok
        ? (data.text && String(data.text).trim() ? data.text : "عذراً، لم أتمكّن من الإجابة. أعد المحاولة 🙏")
        : `⚠️ ${data.error || "تعذّر الرد."}`;
      const savedAssistant = await appendKhabbashaMessage(user.uid, activeId, { role: "assistant", text: replyText });
      setMessages((items) => items.some((item) => item.id === savedAssistant.id) ? items : [...items, savedAssistant]);
    } catch {
      setNotice("تعذّر إرسال الرسالة أو المرفق. تأكد من الاتصال وحاول مجددًا.");
    } finally {
      setUploading(false);
      setThinking(false);
    }
  }

  function ConversationList({ compact = false }: { compact?: boolean }) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <button onClick={createNewConversation} className="mb-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-3 text-sm font-extrabold text-white shadow-glow transition hover:opacity-90 active:scale-[.98]">
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          محادثة جديدة
        </button>
        <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-bold text-text-muted">
          <span>محادثاتي</span>
          <span>{conversations.length}</span>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {conversations.map((item) => {
            const active = item.id === activeId;
            return (
              <div key={item.id} className={`group relative flex items-start gap-1 rounded-xl border transition ${active ? "border-primary/25 bg-primary/10" : "border-transparent hover:border-border hover:bg-background"}`}>
                <button onClick={() => selectConversation(item.id)} className="min-w-0 flex-1 px-3 py-2.5 text-right">
                  <b className={`block truncate text-sm ${active ? "text-primary" : "text-text-primary"}`}>{item.title}</b>
                  <span className="mt-0.5 block truncate text-[11px] text-text-muted">{item.lastMessagePreview || "ابدأ هذه المحادثة الآن"}</span>
                  <span className="mt-1 block text-[10px] text-text-muted">{formatConversationTime(item.updatedAt)}</span>
                </button>
                <details className="relative mt-2 me-1">
                  <summary className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg text-text-muted hover:bg-border" aria-label="خيارات المحادثة">
                    <FontAwesomeIcon icon={faEllipsisVertical} className="h-3.5 w-3.5" />
                  </summary>
                  <div className="absolute left-1 top-9 z-30 w-32 rounded-xl border border-border bg-surface p-1 shadow-xl">
                    <button onClick={() => beginRename(item)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-xs font-bold hover:bg-background"><FontAwesomeIcon icon={faPen} className="h-3 w-3 text-primary" /> إعادة تسمية</button>
                    <button onClick={() => setDeleteTarget(item)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-xs font-bold text-danger hover:bg-danger/5"><FontAwesomeIcon icon={faTrash} className="h-3 w-3" /> حذف</button>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-9rem)] max-w-6xl gap-3 px-3 lg:h-[calc(100dvh-4.5rem)] lg:gap-5">
        <aside className="hidden w-72 shrink-0 flex-col rounded-2xl border border-border bg-surface p-3 shadow-sm lg:flex">
          <div className="mb-3 flex items-center gap-2 border-b border-border px-1 pb-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><FontAwesomeIcon icon={faBars} className="h-4 w-4" /></span>
            <div><b className="block text-sm">محادثات خباشة</b><span className="text-[11px] text-text-muted">موضوعك تختاره أنت</span></div>
          </div>
          {ready ? <ConversationList /> : <div className="space-y-2"><div className="h-11 animate-pulse rounded-xl bg-border" /><div className="h-14 animate-pulse rounded-xl bg-border" /><div className="h-14 animate-pulse rounded-xl bg-border" /></div>}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <header className="flex items-center gap-2 border-b border-border bg-surface px-3 py-3 sm:px-5">
            <button onClick={() => setMobileConversationsOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary lg:hidden" aria-label="فتح قائمة المحادثات" title="فتح قائمة المحادثات"><FontAwesomeIcon icon={faBars} className="h-4 w-4" /></button>
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow"><FontAwesomeIcon icon={faRobot} className="h-5 w-5" /><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-secondary" /></span>
            <div className="min-w-0 flex-1"><h1 className="truncate font-display text-lg font-extrabold leading-tight">الخباشة</h1><span className="flex items-center gap-1 text-xs text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> مساعدتك الآلية — محادثة حرة</span></div>
            <button onClick={createNewConversation} className="hidden min-h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 text-xs font-extrabold text-primary transition hover:bg-primary/10 sm:flex"><FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> جديدة</button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 sm:px-6">
            {!ready || restoring ? (
              <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted shadow-sm">جاري استعادة محادثتك...</div>
            ) : messages.length === 0 ? (
              <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center py-10 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-primary text-white shadow-glow"><FontAwesomeIcon icon={faRobot} className="h-7 w-7" /></span>
                <h2 className="mt-4 text-xl font-extrabold text-text-primary">ابدأ محادثتك مع الخباشة</h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-text-muted">اسأل عن أي شيء يخص دراستك. كل محادثة مستقلة، ويمكنك العودة إليها متى شئت.</p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4 py-5">
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-end gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    {message.role === "assistant" && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-white"><FontAwesomeIcon icon={faRobot} className="h-3.5 w-3.5" /></span>}
                    <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${message.role === "user" ? "rounded-br-sm bg-gradient-primary text-white" : "rounded-bl-sm border border-border bg-surface text-text-primary shadow-sm"}`}>
                      {message.text && (message.role === "assistant" ? <MarwaMessage text={message.text} /> : <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>)}
                      {message.attachments?.map((attachment) => <MessageAttachment key={attachment.id} attachment={attachment} uid={user.uid} conversationId={activeId!} />)}
                      {message.role === "assistant" && extractTasksFromPlan(message.text).length >= 3 && <SavePlanButton text={message.text} />}
                    </div>
                  </div>
                ))}
                {thinking && <div className="flex items-end gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-white"><FontAwesomeIcon icon={faRobot} className="h-3.5 w-3.5" /></span><div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3"><span className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" /><span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" /></span></div></div>}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {!restoring && messages.length <= 1 && <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-2 px-3 pb-2 sm:px-6">{SUGGESTIONS.map((suggestion) => <button key={suggestion.text} onClick={() => send(suggestion.text)} className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-right text-xs font-medium transition hover:border-primary hover:bg-primary/5"><FontAwesomeIcon icon={suggestion.icon} className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="line-clamp-1">{suggestion.text}</span></button>)}</div>}

          <div className="border-t border-border bg-surface px-3 py-3 sm:px-6">
            {notice && <div className="mx-auto mb-2 flex max-w-2xl items-center justify-between rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-bold text-danger"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="إغلاق"><FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" /></button></div>}
            {pendingAttachments.length > 0 && <div className="mx-auto mb-2 flex max-w-2xl flex-wrap gap-2">{pendingAttachments.map((item) => <div key={item.id} className="relative flex max-w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2">{item.previewDataUrl ? <img src={item.previewDataUrl} alt="معاينة" className="h-12 w-12 rounded-lg object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary"><FontAwesomeIcon icon={attachmentIcon(item.type)} className="h-5 w-5" /></span>}<span className="min-w-0"><b className="block max-w-[170px] truncate text-xs">{item.file.name}</b><span className="block text-[10px] text-text-muted">{formatSize(item.file.size)}</span></span><button onClick={() => removePending(item.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background text-text-muted hover:text-danger" aria-label="إزالة المرفق"><FontAwesomeIcon icon={faXmark} className="h-3 w-3" /></button></div>)}</div>}
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx" onChange={handleFileSelect} />
              <button onClick={() => fileInputRef.current?.click()} disabled={thinking || uploading} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-background text-text-muted transition hover:border-primary hover:text-primary disabled:opacity-50" aria-label="إرفاق صورة أو ملف"><FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" /></button>
              <textarea ref={inputRef} value={input} onChange={(event) => { setInput(event.target.value); autoGrow(); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} placeholder="اسأل الخباشة..." disabled={thinking || restoring} rows={1} className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary disabled:opacity-50" />
              <button onClick={() => void send(input)} disabled={thinking || restoring || (!input.trim() && pendingAttachments.length === 0)} aria-label="إرسال" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white transition hover:opacity-90 disabled:opacity-50"><FontAwesomeIcon icon={thinking ? faSpinner : faArrowUp} className={`h-4 w-4 ${thinking ? "animate-spin" : ""}`} /></button>
            </div>
            <p className="mx-auto mt-1.5 max-w-2xl text-center text-[10px] text-text-muted">يمكنك إرفاق صورة أو PDF أو Word. لا تشارك معلومات حساسة.</p>
          </div>
        </section>
      </div>

      <BottomSheet open={mobileConversationsOpen} onClose={() => setMobileConversationsOpen(false)} title="محادثاتي مع الخباشة" maxHeight="86vh"><ConversationList compact /></BottomSheet>

      {renameTarget && <div className="fixed inset-0 z-[10070] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl"><h2 className="text-lg font-extrabold">إعادة تسمية المحادثة</h2><input autoFocus value={renameText} onChange={(event) => setRenameText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void confirmRename(); }} className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" maxLength={80} /><div className="mt-4 flex gap-2"><button onClick={() => setRenameTarget(null)} className="min-h-10 flex-1 rounded-xl border border-border px-3 text-sm font-bold">إلغاء</button><button onClick={() => void confirmRename()} className="min-h-10 flex-1 rounded-xl bg-gradient-primary px-3 text-sm font-bold text-white">حفظ</button></div></div></div>}
      {deleteTarget && <div className="fixed inset-0 z-[10070] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl"><span className="grid h-11 w-11 place-items-center rounded-xl bg-danger/10 text-danger"><FontAwesomeIcon icon={faTrash} className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-extrabold">حذف هذه المحادثة؟</h2><p className="mt-2 text-sm leading-6 text-text-muted">سيتم حذف «{deleteTarget.title}» ورسائلها ومرفقاتها فقط. لا يمكن التراجع عن هذا الإجراء.</p><div className="mt-5 flex gap-2"><button onClick={() => setDeleteTarget(null)} className="min-h-10 flex-1 rounded-xl border border-border px-3 text-sm font-bold">إلغاء</button><button onClick={() => void confirmDelete()} className="min-h-10 flex-1 rounded-xl bg-danger px-3 text-sm font-bold text-white">حذف المحادثة</button></div></div></div>}
    </AppShell>
  );
}
