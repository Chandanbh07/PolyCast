import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import { getComments, postComment } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { truncateAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CommentsSection({ marketId }: { marketId: string }) {
  const { address, signIn, walletAvailable } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: queryKeys.comments(marketId),
    queryFn: () => getComments(marketId),
  });

  const mutation = useMutation({
    mutationFn: postComment,
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(marketId) });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Couldn't post comment"),
  });

  function submit() {
    const content = draft.trim();
    if (!content) return;
    mutation.mutate({ marketId, content });
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-mist-400" />
        <h3 className="font-display text-sm font-semibold text-mist-50">Comments</h3>
        {comments && <span className="text-xs text-mist-400">({comments.length})</span>}
      </div>

      <div className="mt-4">
        {address ? (
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share your read on this market…"
              rows={2}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2.5 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-400 focus:outline-none"
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={mutation.isPending || !draft.trim()}
              aria-label="Post comment"
            >
              <Send className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={signIn}
            disabled={!walletAvailable}
            className="w-full rounded-xl border border-dashed border-ink-600 px-3 py-3 text-center text-sm text-mist-400 hover:border-ink-500 hover:text-mist-200 disabled:opacity-50"
          >
            {walletAvailable ? "Connect a wallet to join the discussion" : "Install a Solana wallet to comment"}
          </button>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}

        {!isLoading && comments?.length === 0 && (
          <p className="py-6 text-center text-sm text-mist-400">
            No comments yet — be the first to weigh in.
          </p>
        )}

        {comments?.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono-nums text-[11px] text-mist-300">
              {c.user.address.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono-nums text-xs font-medium text-mist-200">
                  {truncateAddress(c.user.address)}
                </span>
                <span className="text-[11px] text-mist-400">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-mist-300">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
