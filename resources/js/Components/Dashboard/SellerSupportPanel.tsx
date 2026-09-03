import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Paperclip,
  X,
  ChevronDown,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  Filter,
  Upload,
  FileText,
  Image,
  Film,
  Send,
  MessageSquare,
  RefreshCw,
  ThumbsUp,
  ShieldAlert,
  User,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@inertiajs/react";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus =
  | "Open"
  | "Awaiting Review"
  | "Info Requested"
  | "In Progress"
  | "Resolved"
  | "Closed";

type TicketCategory =
  | "Account"
  | "Subscription"
  | "Order Issues"
  | "Store & Listing"
  | "Payment Disputes"
  | "System";

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file: File;
}

interface TicketPayload {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  reopenCount: number;
  thread: Array<{
    id: string;
    sender: "admin" | "vendor";
    senderName: string;
    body: string;
    timestamp: string;
    attachmentCount?: number;
  }>;
}

interface ThreadMessage {
  id: string;
  sender: "admin" | "vendor";
  senderName: string;
  body: string;
  timestamp: Date;
  attachmentCount?: number;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  evidenceCount: number;
  thread: ThreadMessage[];
  reopenCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TicketStatus,
  { bg: string; text: string; dot: string }
> = {
  Open: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "Awaiting Review": {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  "Info Requested": {
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  "In Progress": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  Resolved: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  Closed: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

const CATEGORIES: TicketCategory[] = [
  "Account",
  "Subscription",
  "Order Issues",
  "Store & Listing",
  "Payment Disputes",
  "System",
];

const ALL_STATUSES: TicketStatus[] = [
  "Open",
  "Awaiting Review",
  "Info Requested",
  "In Progress",
  "Resolved",
  "Closed",
];

function numericTicketId(ticketId: string): number {
  return parseInt(ticketId.replace(/\D/g, ""), 10);
}

function parseTicket(raw: TicketPayload): Ticket {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    thread: raw.thread.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(d: Date) {
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.startsWith("image/"))
    return <Image className="w-4 h-4 text-blue-500" />;
  if (type.startsWith("video/"))
    return <Film className="w-4 h-4 text-purple-500" />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

function isImageAttachment(file: { type: string; name: string }) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name)
  );
}

function isVideoAttachment(file: { type: string; name: string }) {
  return file.type.startsWith("video/") || /\.mp4$/i.test(file.name);
}

function revokeFileUrl(file: AttachedFile) {
  if (file.url) URL.revokeObjectURL(file.url);
}

function toAttachedFiles(files: File[]): AttachedFile[] {
  return files.map((f) => ({
    id: Math.random().toString(36).slice(2),
    name: f.name,
    size: f.size,
    type: f.type,
    url: URL.createObjectURL(f),
    file: f,
  }));
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
      style={{ fontFamily: "Inter Condensed, sans-serif" }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SellerSupportPanel({
  backHref = "/dashboard/owner-manager",
  pageTitle = "Seller Support",
  initialTickets = [],
  submitTicketUrl = "",
  ticketActionsBaseUrl = "",
}: {
  backHref?: string;
  pageTitle?: string;
  initialTickets?: TicketPayload[];
  submitTicketUrl?: string;
  ticketActionsBaseUrl?: string;
}) {
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // ── Ticket list state ──
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    initialTickets.map(parseTicket)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "All">("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // ── New ticket form state ──
  const [form, setForm] = useState({ title: "", description: "", category: "" as TicketCategory | "" });
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachedFilesRef = useRef<AttachedFile[]>([]);
  const replyFilesRef = useRef<AttachedFile[]>([]);

  useEffect(() => {
    setTickets(initialTickets.map(parseTicket));
  }, [initialTickets]);

  // ── Detail view — reply state ──
  const [replyText, setReplyText] = useState("");
  const [replyFiles, setReplyFiles] = useState<AttachedFile[]>([]);
  const [replyError, setReplyError] = useState("");
  const replyFileRef = useRef<HTMLInputElement>(null);
  const [showReplyConfirm, setShowReplyConfirm] = useState(false);
  const [showReplySuccess, setShowReplySuccess] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  // ── Detail view — resolve actions ──
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState("");
  const [showAcceptSuccess, setShowAcceptSuccess] = useState(false);
  const [showReopenSuccess, setShowReopenSuccess] = useState(false);

  useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  useEffect(() => {
    replyFilesRef.current = replyFiles;
  }, [replyFiles]);

  useEffect(() => {
    return () => {
      attachedFilesRef.current.forEach(revokeFileUrl);
      replyFilesRef.current.forEach(revokeFileUrl);
    };
  }, []);

  // ── Filtered tickets ──
  const filteredTickets = tickets
    .filter((t) => {
      const matchSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "All" || t.status === statusFilter;
      const matchCategory = categoryFilter === "All" || t.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    })
    .sort((a, b) => {
      const diff = b.createdAt.getTime() - a.createdAt.getTime();
      return sortOrder === "newest" ? diff : -diff;
    });

  // ── File handling (new ticket) ──
  function addAttachedFiles(files: File[]) {
    const maxSize = 20 * 1024 * 1024;
    let sizeError = "";
    const validFiles = files.filter((f) => {
      if (f.size > maxSize) {
        sizeError = `"${f.name}" exceeds the 20MB limit.`;
        return false;
      }
      return true;
    });

    if (sizeError) {
      setFormErrors((prev) => ({ ...prev, attachments: sizeError }));
    } else if (validFiles.length) {
      setFormErrors((prev) => {
        if (!prev.attachments) return prev;
        const next = { ...prev };
        delete next.attachments;
        return next;
      });
    }

    if (validFiles.length) {
      setAttachedFiles((prev) => [...prev, ...toAttachedFiles(validFiles)]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    addAttachedFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(id: string) {
    setAttachedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) revokeFileUrl(target);
      return prev.filter((f) => f.id !== id);
    });
  }

  function clearAttachedFiles() {
    setAttachedFiles((prev) => {
      prev.forEach(revokeFileUrl);
      return [];
    });
  }

  // ── File handling (reply) ──
  function handleReplyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setReplyFiles((prev) => [...prev, ...toAttachedFiles(files)]);
    if (replyFileRef.current) replyFileRef.current.value = "";
  }

  function removeReplyFile(id: string) {
    setReplyFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) revokeFileUrl(target);
      return prev.filter((f) => f.id !== id);
    });
  }

  // ── New ticket validation ──
  function validateNewTicket() {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    if (!form.description.trim()) errors.description = "Description is required.";
    if (!form.category) errors.category = "Please select a category.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmitClick() {
    if (validateNewTicket()) {
      setSubmitError("");
      setShowConfirmDialog(true);
    }
  }

  async function handleConfirmSubmit() {
    if (!submitTicketUrl) {
      setSubmitError("Support ticket submission is not configured.");
      return;
    }

    setShowConfirmDialog(false);
    setIsSubmitting(true);
    setSubmitError("");

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("category", form.category);
    attachedFiles.forEach((f, i) => {
      fd.append(`attachments[${i}]`, f.file);
    });

    try {
      const response = await axios.post(submitTicketUrl, fd, {
        headers: { Accept: "application/json" },
      });

      const { ticket, tickets: updatedTickets } = response.data as {
        ticket: TicketPayload;
        tickets: TicketPayload[];
      };

      setTickets(updatedTickets.map(parseTicket));
      setSubmittedTicketId(ticket.id);
      setShowSuccessDialog(true);
      setForm({ title: "", description: "", category: "" });
      clearAttachedFiles();
      setFormErrors({});
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { errors?: Record<string, string[]> } };
      };

      if (axiosError.response?.status === 422) {
        const errors = axiosError.response.data?.errors ?? {};
        const mapped: Record<string, string> = {};
        if (errors.title?.[0]) mapped.title = errors.title[0];
        if (errors.description?.[0]) mapped.description = errors.description[0];
        if (errors.category?.[0]) mapped.category = errors.category[0];
        const attachmentError = Object.entries(errors).find(([key]) =>
          key.startsWith("attachments")
        );
        if (attachmentError?.[1]?.[0]) mapped.attachments = attachmentError[1][0];
        setFormErrors(mapped);
        setView("new");
      } else if (axiosError.response?.status === 419) {
        setSubmitError("Your session expired. Refresh the page and try again.");
        setView("new");
      } else {
        setSubmitError("Unable to submit your ticket. Please try again.");
        setShowConfirmDialog(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSuccessDone() {
    setShowSuccessDialog(false);
    setView("list");
  }

  function handleTicketActionError(
    error: unknown,
    fallbackMessage: string,
    onRetry?: () => void
  ) {
    const axiosError = error as {
      response?: { status?: number; data?: { message?: string } };
    };

    if (axiosError.response?.status === 419) {
      setReplyError("Your session expired. Refresh the page and try again.");
    } else {
      const message = axiosError.response?.data?.message ?? fallbackMessage;
      setReplyError(message);
    }

    onRetry?.();
  }

  // ── Reply to Info Requested ──
  function handleReplySubmit() {
    if (!replyText.trim()) {
      setReplyError("Please enter a reply before submitting.");
      return;
    }
    setReplyError("");
    setShowReplyConfirm(true);
  }

  async function handleConfirmReply() {
    if (!selectedTicket) return;
    if (!ticketActionsBaseUrl) {
      setReplyError("Support ticket actions are not configured.");
      return;
    }

    setShowReplyConfirm(false);
    setIsReplying(true);
    setReplyError("");

    const fd = new FormData();
    fd.append("body", replyText.trim());
    replyFiles.forEach((f, i) => {
      fd.append(`attachments[${i}]`, f.file);
    });

    try {
      const response = await axios.post(
        `${ticketActionsBaseUrl}/${numericTicketId(selectedTicket.id)}/reply`,
        fd,
        { headers: { Accept: "application/json" } }
      );

      const { ticket, tickets: updatedTickets } = response.data as {
        ticket: TicketPayload;
        tickets: TicketPayload[];
      };

      const parsedTicket = parseTicket(ticket);
      setTickets(updatedTickets.map(parseTicket));
      setSelectedTicket(parsedTicket);
      setReplyText("");
      setReplyFiles((prev) => {
        prev.forEach(revokeFileUrl);
        return [];
      });
      setShowReplySuccess(true);
    } catch (error: unknown) {
      handleTicketActionError(
        error,
        "Unable to send your reply. Please try again.",
        () => setShowReplyConfirm(true)
      );
    } finally {
      setIsReplying(false);
    }
  }

  // ── Accept resolved ticket ──
  async function handleConfirmAccept() {
    if (!selectedTicket) return;
    if (!ticketActionsBaseUrl) {
      setReplyError("Support ticket actions are not configured.");
      return;
    }

    setShowAcceptConfirm(false);
    setIsAccepting(true);
    setReplyError("");

    try {
      const response = await axios.patch(
        `${ticketActionsBaseUrl}/${numericTicketId(selectedTicket.id)}/accept`,
        {},
        { headers: { Accept: "application/json" } }
      );

      const { ticket, tickets: updatedTickets } = response.data as {
        ticket: TicketPayload;
        tickets: TicketPayload[];
      };

      const parsedTicket = parseTicket(ticket);
      setTickets(updatedTickets.map(parseTicket));
      setSelectedTicket(parsedTicket);
      setShowAcceptSuccess(true);
    } catch (error: unknown) {
      handleTicketActionError(
        error,
        "Unable to close this ticket. Please try again.",
        () => setShowAcceptConfirm(true)
      );
    } finally {
      setIsAccepting(false);
    }
  }

  // ── Reopen resolved ticket ──
  function handleReopenSubmit() {
    if (!reopenReason.trim()) {
      setReopenError("Please explain why you are reopening this ticket.");
      return;
    }
    setReopenError("");
    setShowReopenConfirm(true);
  }

  async function handleConfirmReopen() {
    if (!selectedTicket) return;
    if (!ticketActionsBaseUrl) {
      setReopenError("Support ticket actions are not configured.");
      return;
    }

    setShowReopenConfirm(false);
    setIsReopening(true);
    setReopenError("");

    try {
      const response = await axios.post(
        `${ticketActionsBaseUrl}/${numericTicketId(selectedTicket.id)}/reopen`,
        { body: reopenReason.trim() },
        { headers: { Accept: "application/json" } }
      );

      const { ticket, tickets: updatedTickets } = response.data as {
        ticket: TicketPayload;
        tickets: TicketPayload[];
      };

      const parsedTicket = parseTicket(ticket);
      setTickets(updatedTickets.map(parseTicket));
      setSelectedTicket(parsedTicket);
      setReopenReason("");
      setShowReopenSuccess(true);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };

      if (axiosError.response?.status === 419) {
        setReopenError("Your session expired. Refresh the page and try again.");
      } else {
        setReopenError(
          axiosError.response?.data?.message ??
            "Unable to reopen this ticket. Please try again."
        );
      }
      setShowReopenConfirm(true);
    } finally {
      setIsReopening(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            {view === "detail" ? (
              <button
                onClick={() => { setView("list"); setSelectedTicket(null); }}
                className="flex items-center gap-2 text-[#6B7280] hover:text-[#102059] transition-colors"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Tickets</span>
              </button>
            ) : (
              <Link
                href={backHref}
                className="flex items-center gap-2 text-[#6B7280] hover:text-[#102059] transition-colors"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </Link>
            )}
            <div className="w-px h-5 bg-[#E5E7EB]" />
            <h1
              className="text-lg font-bold text-[#102059]"
              style={{ fontFamily: "Inter Condensed, sans-serif", fontWeight: "bold", color:"rgb(16, 32, 89)" }}
            >
              {pageTitle}
              {view === "detail" && selectedTicket && (
                <span className="text-[#6B7280] font-normal ml-2">/ {selectedTicket.id}</span>
              )}
            </h1>
          </div>

          {/* Pill Nav — hide on detail view */}
          {view !== "detail" && (
            <nav className="hidden md:flex">
              
            </nav>
          )}

          <Link
            href="/"
            className="h-10 flex items-center text-xl font-bold text-[#102059]"
            style={{ fontFamily: "Inter Condensed, sans-serif", color:"rgb(16, 32, 89)" }}
          >
            Klasmeyt
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">

        {/* ── DETAIL VIEW ─────────────────────────────────────────────── */}
        {view === "detail" && selectedTicket && (
          <TicketDetail
            ticket={selectedTicket}
            replyText={replyText}
            setReplyText={setReplyText}
            replyFiles={replyFiles}
            replyError={replyError}
            replyFileRef={replyFileRef}
            onReplyFileChange={handleReplyFileChange}
            onRemoveReplyFile={removeReplyFile}
            onReplySubmit={handleReplySubmit}
            reopenReason={reopenReason}
            setReopenReason={setReopenReason}
            reopenError={reopenError}
            onAccept={() => setShowAcceptConfirm(true)}
            onReopenSubmit={handleReopenSubmit}
          />
        )}

        {/* ── NEW TICKET VIEW ──────────────────────────────────────────── */}
        {view === "new" && (
          <NewTicketForm
            form={form}
            setForm={setForm}
            attachedFiles={attachedFiles}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onAddFiles={addAttachedFiles}
            onRemoveFile={removeFile}
            formErrors={formErrors}
            submitError={submitError}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitClick}
            onCancel={() => {
              setView("list");
              setForm({ title: "", description: "", category: "" });
              clearAttachedFiles();
              setFormErrors({});
              setSubmitError("");
            }}
          />
        )}

        {/* ── TICKET LIST VIEW ─────────────────────────────────────────── */}
        {view === "list" && (
          <TicketList
            tickets={tickets}
            filteredTickets={filteredTickets}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            showStatusDropdown={showStatusDropdown}
            setShowStatusDropdown={setShowStatusDropdown}
            showCategoryDropdown={showCategoryDropdown}
            setShowCategoryDropdown={setShowCategoryDropdown}
            showSortDropdown={showSortDropdown}
            setShowSortDropdown={setShowSortDropdown}
            onNewTicket={() => setView("new")}
            onOpenTicket={(t) => {
              setSelectedTicket(t);
              setView("detail");
            }}
          />
        )}
      </main>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}

      {/* New ticket — confirm */}
      {showConfirmDialog && (
        <ConfirmDialog
          icon={<Send className="w-6 h-6 text-[#D3A218]" />}
          iconBg="bg-[#FEF3C7]"
          title="Submit this ticket?"
          body={
            <>
              You're about to submit a support ticket titled{" "}
              <span className="font-semibold text-[#1F2937]">"{form.title}"</span>. Our team will review it and respond within 24 hours.
            </>
          }
          confirmLabel={isSubmitting ? "Submitting..." : "Yes, Submit"}
          confirmClass="bg-[#E20E28] hover:bg-[#c00b22]"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirmDialog(false)}
          confirmDisabled={isSubmitting}
        />
      )}

      {/* New ticket — success */}
      {showSuccessDialog && (
        <SuccessDialog
          title="Ticket Submitted!"
          body="Your ticket has been submitted successfully."
          sub={<>Reference: <span className="font-bold text-[#244693]">{submittedTicketId}</span></>}
          hint="You can track the status of your ticket in the My Tickets tab."
          actionLabel="View My Tickets"
          onAction={handleSuccessDone}
        />
      )}

      {/* Reply — confirm */}
      {showReplyConfirm && (
        <ConfirmDialog
          icon={<MessageSquare className="w-6 h-6 text-[#244693]" />}
          iconBg="bg-[#EFF6FF]"
          title="Send your reply?"
          body="Your reply will be sent to the support team and the ticket will re-enter review."
          confirmLabel={isReplying ? "Sending..." : "Send Reply"}
          confirmClass="bg-[#244693] hover:bg-[#1e3a7a]"
          onConfirm={handleConfirmReply}
          onCancel={() => setShowReplyConfirm(false)}
          confirmDisabled={isReplying}
        />
      )}

      {/* Reply — success */}
      {showReplySuccess && (
        <SuccessDialog
          title="Reply Sent!"
          body="Your reply has been sent. The ticket is now back under review."
          hint="Our team will respond as soon as possible."
          actionLabel="View Ticket"
          onAction={() => setShowReplySuccess(false)}
        />
      )}

      {/* Accept resolved — confirm */}
      {showAcceptConfirm && (
        <ConfirmDialog
          icon={<ThumbsUp className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-50"
          title="Accept the resolution?"
          body="This will mark the ticket as Closed. You can still reopen it later if the issue reoccurs."
          confirmLabel={isAccepting ? "Closing..." : "Accept & Close"}
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={handleConfirmAccept}
          onCancel={() => setShowAcceptConfirm(false)}
          confirmDisabled={isAccepting}
        />
      )}

      {/* Accept resolved — success */}
      {showAcceptSuccess && (
        <SuccessDialog
          title="Ticket Closed"
          body="You have accepted the resolution. This ticket is now closed."
          hint="If the issue reoccurs, you can reopen the ticket from the detail view."
          actionLabel="Back to Tickets"
          onAction={() => { setShowAcceptSuccess(false); setView("list"); setSelectedTicket(null); }}
        />
      )}

      {/* Reopen — confirm */}
      {showReopenConfirm && (
        <ConfirmDialog
          icon={<RefreshCw className="w-6 h-6 text-orange-600" />}
          iconBg="bg-orange-50"
          title="Reopen this ticket?"
          body="The ticket will be sent back for review with your explanation."
          confirmLabel={isReopening ? "Reopening..." : "Yes, Reopen"}
          confirmClass="bg-[#E20E28] hover:bg-[#c00b22]"
          onConfirm={handleConfirmReopen}
          onCancel={() => setShowReopenConfirm(false)}
          confirmDisabled={isReopening}
        />
      )}

      {/* Reopen — success */}
      {showReopenSuccess && (
        <SuccessDialog
          title="Ticket Reopened"
          body="Your ticket has been reopened and is back under review."
          hint="Our team will follow up on your concern shortly."
          actionLabel="View Ticket"
          onAction={() => setShowReopenSuccess(false)}
        />
      )}
    </div>
  );
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────

function TicketDetail({
  ticket,
  replyText,
  setReplyText,
  replyFiles,
  replyError,
  replyFileRef,
  onReplyFileChange,
  onRemoveReplyFile,
  onReplySubmit,
  reopenReason,
  setReopenReason,
  reopenError,
  onAccept,
  onReopenSubmit,
}: {
  ticket: Ticket;
  replyText: string;
  setReplyText: (v: string) => void;
  replyFiles: AttachedFile[];
  replyError: string;
  replyFileRef: React.RefObject<HTMLInputElement>;
  onReplyFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveReplyFile: (id: string) => void;
  onReplySubmit: () => void;
  reopenReason: string;
  setReopenReason: (v: string) => void;
  reopenError: string;
  onAccept: () => void;
  onReopenSubmit: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Ticket meta card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold text-[#244693]"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                {ticket.id}
              </span>
              <span
                className="inline-block px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-medium"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                {ticket.category}
              </span>
              {ticket.reopenCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium"
                  style={{ fontFamily: "Inter Condensed, sans-serif" }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Reopened ×{ticket.reopenCount}
                </span>
              )}
            </div>
            <h2
              className="text-lg font-bold text-[#102059]"
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            >
              {ticket.title}
            </h2>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="flex gap-4 text-xs text-[#9CA3AF]">
          <span>Submitted: {formatDate(ticket.createdAt)}</span>
          <span>Last updated: {formatDate(ticket.updatedAt)}</span>
        </div>
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {ticket.thread.map((msg) => (
          <ThreadBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* ── Info Requested: reply box ── */}
      {ticket.status === "Info Requested" && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-orange-600" />
            <p
              className="text-sm font-bold text-orange-700"
              style={{ fontFamily: "Inter Condensed, sans-serif", marginBottom: "0px" }}
            >
              Additional information requested
            </p>
          </div>
          <p className="text-xs text-orange-600 mb-4">
            The support team has asked a question above. Please reply to continue the review process.
          </p>

          <label
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Your Reply
          </label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Provide the requested information..."
            className={`w-full border rounded-lg px-4 py-2.5 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#244693]/30 focus:border-[#244693] resize-none transition-colors bg-white ${
              replyError ? "border-[#E20E28]" : "border-[#E5E7EB]"
            }`}
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          />
          {replyError && (
            <p className="text-xs text-[#E20E28] mt-1">{replyError}</p>
          )}

          {/* Attach files */}
          <button
            type="button"
            onClick={() => replyFileRef.current?.click()}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#244693] transition-colors"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            <Paperclip className="w-3.5 h-3.5" />
            Attach files
          </button>
          <input
            ref={replyFileRef}
            type="file"
            multiple
            accept="image/*,video/mp4,.pdf,.docx"
            className="hidden"
            onChange={onReplyFileChange}
          />
          {replyFiles.length > 0 && (
            <AttachmentPreviewList files={replyFiles} onRemove={onRemoveReplyFile} />
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={onReplySubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#244693] text-white hover:bg-[#1e3a7a] transition-colors"
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            >
              <Send className="w-4 h-4" />
              Send Reply
            </button>
          </div>
        </div>
      )}

      {/* ── Resolved: accept or reopen ── */}
      {ticket.status === "Resolved" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <p
              className="text-sm font-bold text-green-700"
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            >
              Resolution provided by support team
            </p>
          </div>
          <p className="text-xs text-green-600 mb-5">
            Review the solution above. If it resolves your issue, accept it to close the ticket. If the problem persists, reopen the ticket with an explanation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Accept */}
            <div className="flex-1 bg-white border border-green-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <p
                  className="text-sm font-semibold text-[#1F2937]"
                  style={{ fontFamily: "Inter Condensed, sans-serif" }}
                >
                  Issue resolved
                </p>
              </div>
              <p className="text-xs text-[#6B7280]">
                The solution fixed my problem. Close this ticket.
              </p>
              <button
                onClick={onAccept}
                className="mt-auto w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                Accept & Close
              </button>
            </div>

            {/* Reopen */}
            <div className="flex-1 bg-white border border-orange-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-600" />
                <p
                  className="text-sm font-semibold text-[#1F2937]"
                  style={{ fontFamily: "Inter Condensed, sans-serif" }}
                >
                  Problem still persists
                </p>
              </div>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={2}
                placeholder="Describe why the issue is not resolved..."
                className={`w-full border rounded-lg px-3 py-2 text-xs text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none transition-colors ${
                  reopenError ? "border-[#E20E28]" : "border-[#E5E7EB]"
                }`}
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              />
              {reopenError && (
                <p className="text-xs text-[#E20E28] -mt-1">{reopenError}</p>
              )}
              <button
                onClick={onReopenSubmit}
                className="mt-auto w-full py-2.5 rounded-lg text-sm font-semibold bg-[#E20E28] text-white hover:bg-[#c00b22] transition-colors"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                Reopen Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Thread Bubble ────────────────────────────────────────────────────────────

function ThreadBubble({ msg }: { msg: ThreadMessage }) {
  const isAdmin = msg.sender === "admin";
  const isReopen = msg.body.startsWith("[Reopened]");

  return (
    <div className={`flex gap-3 ${isAdmin ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAdmin ? "bg-[#102059]" : "bg-[#E5E7EB]"
        }`}
      >
        {isAdmin ? (
          <ShieldCheck className="w-4 h-4 text-white" />
        ) : (
          <User className="w-4 h-4 text-[#6B7280]" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isAdmin ? "" : "items-end flex flex-col"}`}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-semibold ${isAdmin ? "text-[#102059]" : "text-[#4B5563]"}`}
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            {msg.senderName}
          </span>
          <span className="text-xs text-[#9CA3AF]">{formatDateTime(msg.timestamp)}</span>
        </div>
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            isAdmin
              ? "bg-white border border-[#E5E7EB] text-[#1F2937]"
              : isReopen
              ? "bg-orange-50 border border-orange-200 text-orange-800"
              : "bg-[#EFF6FF] border border-blue-100 text-[#1F2937]"
          }`}
          style={{ fontFamily: "Inter Condensed, sans-serif" }}
        >
          {isReopen ? (
            <span>
              <span className="font-semibold text-orange-700">[Reopened] </span>
              {msg.body.replace("[Reopened] ", "")}
            </span>
          ) : (
            msg.body
          )}
        </div>
        {msg.attachmentCount && msg.attachmentCount > 0 ? (
          <div
            className={`flex items-center gap-1 mt-1.5 text-xs text-[#9CA3AF] ${
              isAdmin ? "" : "justify-end"
            }`}
          >
            <Paperclip className="w-3 h-3" />
            {msg.attachmentCount} attachment{msg.attachmentCount > 1 ? "s" : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Attachment Preview List ──────────────────────────────────────────────────

function AttachmentPreviewList({
  files,
  onRemove,
}: {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}) {
  if (files.length === 0) return null;

  const mediaFiles = files.filter(
    (f) => isImageAttachment(f) || isVideoAttachment(f)
  );
  const otherFiles = files.filter(
    (f) => !isImageAttachment(f) && !isVideoAttachment(f)
  );

  return (
    <div className="mt-3 space-y-3">
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mediaFiles.map((f) => (
            <div
              key={f.id}
              className="relative group aspect-square overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F3F4F6]"
            >
              {isImageAttachment(f) ? (
                <img
                  src={f.url}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={f.url}
                  className="h-full w-full object-cover bg-black"
                  muted
                  playsInline
                />
              )}
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                aria-label={`Remove ${f.name}`}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <p
                className="absolute bottom-0 inset-x-0 truncate bg-black/55 px-2 py-1 text-[11px] text-white"
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                {f.name}
              </p>
            </div>
          ))}
        </div>
      )}
      {otherFiles.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg"
        >
          {fileIcon(f.type)}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium text-[#1F2937] truncate"
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            >
              {f.name}
            </p>
            <p className="text-xs text-[#9CA3AF]">{formatFileSize(f.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(f.id)}
            className="p-1 hover:bg-[#FEE2E2] rounded-md transition-colors"
            aria-label={`Remove ${f.name}`}
          >
            <X className="w-4 h-4 text-[#6B7280] hover:text-[#E20E28]" />
          </button>
        </div>
      ))}
    </div>
  );
}

function NewTicketForm({
  form,
  setForm,
  attachedFiles,
  fileInputRef,
  onFileChange,
  onAddFiles,
  onRemoveFile,
  formErrors,
  submitError,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  form: { title: string; description: string; category: TicketCategory | "" };
  setForm: (f: { title: string; description: string; category: TicketCategory | "" }) => void;
  attachedFiles: AttachedFile[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  formErrors: Record<string, string>;
  submitError?: string;
  isSubmitting?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onAddFiles(files);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2
          className="text-2xl font-bold text-[#102059] mb-1"
          style={{ fontFamily: "Inter Condensed, sans-serif", fontWeight: "bold", color:"rgb(16, 32, 89)" }}
        >
          Submit a Support Ticket
        </h2>
        <p className="text-sm text-[#6B7280]">
          Describe your issue and our team will respond within 24 hours.
        </p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
        {/* Title */}
        <div>
          <label
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Title <span className="text-[#E20E28]">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Brief description of your issue"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#244693]/30 focus:border-[#244693] transition-colors ${
              formErrors.title ? "border-[#E20E28]" : "border-[#E5E7EB]"
            }`}
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          />
          {formErrors.title && (
            <p className="text-xs text-[#E20E28] mt-1">{formErrors.title}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Category <span className="text-[#E20E28]">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm({ ...form, category: cat })}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.category === cat
                    ? "bg-[#102059] text-white border-[#102059]"
                    : "bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#244693] hover:text-[#244693]"
                }`}
                style={{ fontFamily: "Inter Condensed, sans-serif" }}
              >
                {cat}
              </button>
            ))}
          </div>
          {formErrors.category && (
            <p className="text-xs text-[#E20E28] mt-1">{formErrors.category}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Description <span className="text-[#E20E28]">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            placeholder="Describe your issue in detail — include steps to reproduce if applicable..."
            className={`w-full border rounded-lg px-4 py-2.5 text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#244693]/30 focus:border-[#244693] resize-none transition-colors ${
              formErrors.description ? "border-[#E20E28]" : "border-[#E5E7EB]"
            }`}
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          />
          {formErrors.description && (
            <p className="text-xs text-[#E20E28] mt-1">{formErrors.description}</p>
          )}
        </div>

        {/* Evidence */}
        <div>
          <label
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Evidence{" "}
            <span className="text-[#9CA3AF] font-normal">(optional)</span>
          </label>
          <p className="text-xs text-[#6B7280] mb-3">
            Attach screenshots, videos, or documents. JPG, PNG, MP4, PDF, DOCX — max 20MB each.
          </p>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
              isDragging
                ? "border-[#244693] bg-[#F0F4FF]"
                : "border-[#D1D5DB] hover:border-[#244693] hover:bg-[#F0F4FF]"
            }`}
          >
            <Upload className={`w-8 h-8 transition-colors ${isDragging ? "text-[#244693]" : "text-[#9CA3AF]"}`} />
            <p
              className={`text-sm ${isDragging ? "text-[#244693]" : "text-[#6B7280]"}`}
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            >
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,.pdf,.docx"
            className="hidden"
            onChange={onFileChange}
          />
          <AttachmentPreviewList files={attachedFiles} onRemove={onRemoveFile} />
          {formErrors.attachments && (
            <p className="text-xs text-[#E20E28] mt-1">{formErrors.attachments}</p>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-[#E20E28]">{submitError}</p>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#F3F4F6]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#E20E28] text-white hover:bg-[#c00b22] transition-colors disabled:opacity-50"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket List ──────────────────────────────────────────────────────────────

function TicketList({
  tickets,
  filteredTickets,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  sortOrder,
  setSortOrder,
  showStatusDropdown,
  setShowStatusDropdown,
  showCategoryDropdown,
  setShowCategoryDropdown,
  showSortDropdown,
  setShowSortDropdown,
  onNewTicket,
  onOpenTicket,
}: {
  tickets: Ticket[];
  filteredTickets: Ticket[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: TicketStatus | "All";
  setStatusFilter: (v: TicketStatus | "All") => void;
  categoryFilter: TicketCategory | "All";
  setCategoryFilter: (v: TicketCategory | "All") => void;
  sortOrder: "newest" | "oldest";
  setSortOrder: (v: "newest" | "oldest") => void;
  showStatusDropdown: boolean;
  setShowStatusDropdown: (v: boolean) => void;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (v: boolean) => void;
  showSortDropdown: boolean;
  setShowSortDropdown: (v: boolean) => void;
  onNewTicket: () => void;
  onOpenTicket: (t: Ticket) => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2
            className="text-2xl font-bold text-[#102059] mb-1"
            style={{ fontFamily: "Inter Condensed, sans-serif", fontWeight: "bold", color:"rgb(16, 32, 89)" }}
          >
            My Support Tickets
          </h2>
          <p className="text-sm text-[#6B7280]">
            Track the status of your submitted support requests.
          </p>
        </div>
        <button
          onClick={onNewTicket}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E20E28] text-white text-sm font-semibold hover:bg-[#c00b22] transition-colors whitespace-nowrap"
          style={{ fontFamily: "Inter Condensed, sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#244693]/20 focus:border-[#244693] transition-colors"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          />
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowStatusDropdown(!showStatusDropdown);
              setShowCategoryDropdown(false);
              setShowSortDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#4B5563] hover:border-[#244693] hover:text-[#244693] transition-colors bg-white"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            <Filter className="w-3.5 h-3.5" />
            Status: {statusFilter}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showStatusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
              <div className="absolute left-0 mt-1 w-48 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden z-20 shadow-lg">
                {["All", ...ALL_STATUSES].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s as TicketStatus | "All");
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                      statusFilter === s
                        ? "bg-[#F0F4FF] text-[#244693] font-semibold"
                        : "text-[#4B5563] hover:bg-[#F9FAFB]"
                    }`}
                    style={{ fontFamily: "Inter Condensed, sans-serif" }}
                  >
                    {s !== "All" && (
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s as TicketStatus]?.dot}`} />
                    )}
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCategoryDropdown(!showCategoryDropdown);
              setShowStatusDropdown(false);
              setShowSortDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#4B5563] hover:border-[#244693] hover:text-[#244693] transition-colors bg-white"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Category: {categoryFilter}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showCategoryDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
              <div className="absolute left-0 mt-1 w-48 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden z-20 shadow-lg">
                {["All", ...CATEGORIES].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCategoryFilter(c as TicketCategory | "All");
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      categoryFilter === c
                        ? "bg-[#F0F4FF] text-[#244693] font-semibold"
                        : "text-[#4B5563] hover:bg-[#F9FAFB]"
                    }`}
                    style={{ fontFamily: "Inter Condensed, sans-serif" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSortDropdown(!showSortDropdown);
              setShowStatusDropdown(false);
              setShowCategoryDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#4B5563] hover:border-[#244693] hover:text-[#244693] transition-colors bg-white"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            {sortOrder === "newest" ? "Newest First" : "Oldest First"}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute right-0 mt-1 w-40 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden z-20 shadow-lg">
                {(["newest", "oldest"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSortOrder(s); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortOrder === s
                        ? "bg-[#F0F4FF] text-[#244693] font-semibold"
                        : "text-[#4B5563] hover:bg-[#F9FAFB]"
                    }`}
                    style={{ fontFamily: "Inter Condensed, sans-serif" }}
                  >
                    {s === "newest" ? "Newest First" : "Oldest First"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_STATUSES.map((s) => {
          const count = tickets.filter((t) => t.status === s).length;
          if (count === 0) return null;
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s
                  ? `${cfg.bg} ${cfg.text} border-current`
                  : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#9CA3AF]"
              }`}
              style={{ fontFamily: "Inter Condensed, sans-serif", borderRadius: "20px" }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Ticket rows */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center">
          <div className="w-12 h-12 bg-[#F3F4F6] rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-[#9CA3AF]" />
          </div>
          <p
            className="text-sm font-semibold text-[#1F2937] mb-1"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            No tickets found
          </p>
          <p className="text-xs text-[#6B7280]">
            Try adjusting your filters or{" "}
            <button
              onClick={onNewTicket}
              className="text-[#244693] underline hover:text-[#102059]"
            >
              submit a new ticket
            </button>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onOpen={() => onOpenTicket(ticket)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ticket Row ───────────────────────────────────────────────────────────────

function TicketRow({ ticket, onOpen }: { ticket: Ticket; onOpen: () => void }) {
  const needsAction =
    ticket.status === "Info Requested" || ticket.status === "Resolved";

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left bg-white border rounded-xl flex items-start gap-4 hover:border-[#244693] transition-all group ${
        needsAction ? "border-orange-200 bg-orange-50/30" : "border-[#E5E7EB]"
      }`}
      style={{ marginBottom: "20px" , borderRadius: "20px", padding: "25px" }}
    >
      {/* ID + Category */}
      <div className="flex flex-col items-start gap-1.5 min-w-[110px]">
        <span
          className="text-xs font-bold text-[#244693]"
          style={{ fontFamily: "Inter Condensed, sans-serif" }}
        >
          {ticket.id}
        </span>
        <span
          className="inline-block px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-medium"
          style={{ fontFamily: "Inter Condensed, sans-serif" }}
        >
          {ticket.category}
        </span>
      </div>

      {/* Title + snippet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p
            className="text-sm font-semibold text-[#1F2937] truncate"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            {ticket.title}
          </p>
          {needsAction && (
            <span
              className="shrink-0 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full"
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            >
              Action needed
            </span>
          )}
          {ticket.reopenCount > 0 && (
            <span
              className="shrink-0 inline-flex items-center gap-0.5 text-xs text-orange-600"
              style={{ fontFamily: "Inter Condensed, sans-serif" }}
            >
              <RefreshCw className="w-3 h-3" />×{ticket.reopenCount}
            </span>
          )}
        </div>
        <p className="text-xs text-[#6B7280] line-clamp-1">{ticket.description}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-[#9CA3AF]">
            <MessageSquare className="w-3 h-3" />
            {ticket.thread.length} message{ticket.thread.length !== 1 ? "s" : ""}
          </span>
          {ticket.evidenceCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#9CA3AF]">
              <Paperclip className="w-3 h-3" />
              {ticket.evidenceCount}
            </span>
          )}
        </div>
      </div>

      {/* Status + date */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StatusBadge status={ticket.status} />
        <span className="text-xs text-[#9CA3AF]">{formatDate(ticket.createdAt)}</span>
      </div>

      <ChevronDown className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#244693] transition-colors shrink-0 mt-1 -rotate-90" />
    </button>
  );
}

// ─── Reusable Dialogs ─────────────────────────────────────────────────────────

function ConfirmDialog({
  icon,
  iconBg,
  title,
  body,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl border border-[#E5E7EB] p-6 w-full max-w-sm shadow-xl">
        <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h3
          className="text-lg font-bold text-[#102059] text-center mb-2"
          style={{ fontFamily: "Inter Condensed, sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-sm text-[#6B7280] text-center mb-6">{body}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors"
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${confirmClass}`}
            style={{ fontFamily: "Inter Condensed, sans-serif" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessDialog({
  title,
  body,
  sub,
  hint,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  sub?: React.ReactNode;
  hint?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl border border-[#E5E7EB] p-6 w-full max-w-sm shadow-xl text-center">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3
          className="text-lg font-bold text-[#102059] mb-1"
          style={{ fontFamily: "Inter Condensed, sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-sm text-[#6B7280] mb-1">{body}</p>
        {sub && <p className="text-sm mb-3">{sub}</p>}
        {hint && <p className="text-xs text-[#9CA3AF] mb-5">{hint}</p>}
        <button
          onClick={onAction}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#102059] text-white hover:bg-[#0d1a47] transition-colors"
          style={{ fontFamily: "Inter Condensed, sans-serif" }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
