import SetupNeeded from "@/components/SetupNeeded";
import SettingsClient from "@/components/settings/SettingsClient";
import { requireHousehold } from "@/lib/session";
import type { ThemeProposal, ThemeProposalVote } from "@/lib/types";

export default async function SettingsPage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household, profile, user } = session;

  const [{ data: members }, { data: proposals }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
    supabase
      .from("theme_proposals")
      .select("*, theme_proposal_votes(member_id, approve)")
      .eq("household_id", household.id)
      .eq("status", "pending"),
  ]);

  type ProposalWithVotes = ThemeProposal & { theme_proposal_votes: ThemeProposalVote[] };

  return (
    <SettingsClient
      profile={profile}
      themeColor={household.theme_color}
      members={members ?? []}
      pendingProposals={(proposals ?? []) as ProposalWithVotes[]}
      currentUserId={user.id}
    />
  );
}
