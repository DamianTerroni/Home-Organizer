"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ThemeProposal, ThemeProposalVote } from "@/lib/types";

type Member = { id: string; full_name: string };
type ProposalWithVotes = ThemeProposal & { theme_proposal_votes: ThemeProposalVote[] };

const PRESET_COLORS = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#d97706", "#16a34a"];

export default function SettingsClient({
  profile,
  themeColor,
  inviteCode,
  members,
  pendingProposals,
  currentUserId,
}: {
  profile: Profile;
  themeColor: string;
  inviteCode: string;
  members: Member[];
  pendingProposals: ProposalWithVotes[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(profile.full_name);
  const [savingNickname, setSavingNickname] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [proposedColor, setProposedColor] = useState(themeColor);
  const [proposing, setProposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Supabase no está configurado.</p>;
  }

  function memberName(id: string) {
    return members.find((m) => m.id === id)?.full_name ?? "—";
  }

  async function saveNickname() {
    if (!supabase || !nickname.trim()) return;
    setSavingNickname(true);
    setError(null);
    const { error } = await supabase.from("profiles").update({ full_name: nickname.trim() }).eq("id", currentUserId);
    setSavingNickname(false);
    if (error) setError("No se pudo guardar el nombre.");
    else router.refresh();
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setUploadingAvatar(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${currentUserId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError("No se pudo subir la imagen.");
      setUploadingAvatar(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // eslint-disable-next-line react-hooks/purity -- cache-busts the CDN URL after an upsert upload; only runs from the file input's onChange, never during render.
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", currentUserId);

    setUploadingAvatar(false);
    if (updateError) setError("No se pudo guardar la foto.");
    else router.refresh();
  }

  async function proposeColor() {
    if (!supabase) return;
    setProposing(true);
    setError(null);
    const { error } = await supabase.rpc("propose_theme_color", { p_color: proposedColor });
    setProposing(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function vote(proposalId: string, approve: boolean) {
    if (!supabase) return;
    setError(null);
    const { error } = await supabase.rpc("vote_theme_proposal", {
      p_proposal_id: proposalId,
      p_approve: approve,
    });
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
      <h1 className="text-lg font-semibold">Ajustes personales</h1>

      {error && <p className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-600">{error}</p>}

      <section className="space-y-1 rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-semibold">Código de invitación</h2>
        <p className="text-2xl font-semibold tracking-widest">{inviteCode}</p>
        <p className="text-xs text-black/50 dark:text-white/50">
          Compartíselo a quien quieras invitar al hogar para que se una desde &ldquo;Unirme&rdquo; al crear su cuenta.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-semibold">Mi perfil</h2>

        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--accent)] text-lg font-semibold text-white"
            title="Cambiar foto"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            )}
            {uploadingAvatar && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                ...
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            className="hidden"
          />
          <div className="flex-1 space-y-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              placeholder="Tu nombre"
            />
            <button
              onClick={saveNickname}
              disabled={savingNickname || nickname.trim() === profile.full_name}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              {savingNickname ? "Guardando..." : "Guardar nombre"}
            </button>
          </div>
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">Tocá tu foto para cambiarla.</p>
      </section>

      <section className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-semibold">Paleta de colores del hogar</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-black/50 dark:text-white/50">Color actual:</span>
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: themeColor }} />
          <span className="text-xs">{themeColor}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setProposedColor(c)}
              className={`h-7 w-7 rounded-full border-2 ${proposedColor === c ? "border-black/60 dark:border-white/80" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={proposedColor}
            onChange={(e) => setProposedColor(e.target.value)}
            className="h-7 w-9 rounded border border-black/10 dark:border-white/15"
          />
          <button
            onClick={proposeColor}
            disabled={proposing || proposedColor === themeColor}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {proposing ? "Enviando..." : "Proponer cambio"}
          </button>
        </div>
        {members.length > 1 && (
          <p className="text-xs text-black/50 dark:text-white/50">
            El cambio se aplica cuando todos los integrantes del hogar lo aprueban.
          </p>
        )}

        {pendingProposals.length > 0 && (
          <div className="space-y-2 border-t border-black/10 pt-3 dark:border-white/15">
            <p className="text-xs font-medium text-black/60 dark:text-white/60">Propuestas pendientes</p>
            {pendingProposals.map((p) => {
              const hasVoted = p.theme_proposal_votes.some((v) => v.member_id === currentUserId);
              const approvedNames = p.theme_proposal_votes.filter((v) => v.approve).map((v) => memberName(v.member_id));
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-black/10 p-2 text-sm dark:border-white/15">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: p.color }} />
                    <div>
                      <p>Propuso {memberName(p.proposed_by ?? "")}</p>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        Aprobaron: {approvedNames.join(", ") || "nadie todavía"} ({approvedNames.length}/{members.length})
                      </p>
                    </div>
                  </div>
                  {hasVoted ? (
                    <span className="text-xs text-black/50 dark:text-white/50">Ya votaste</span>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => vote(p.id, true)}
                        className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs text-white"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => vote(p.id, false)}
                        className="rounded-md border border-black/10 px-2 py-1 text-xs dark:border-white/15"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
