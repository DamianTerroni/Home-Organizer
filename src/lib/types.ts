export type Profile = {
  id: string;
  full_name: string;
  household_id: string | null;
  avatar_url: string | null;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  theme_color: string;
  created_at: string;
};

export type Category = {
  id: string;
  household_id: string;
  name: string;
};

export type Expense = {
  id: string;
  household_id: string;
  member_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  created_by: string | null;
  created_at: string;
};

export type ExpenseWithRelations = Expense & {
  profiles: { id: string; full_name: string } | null;
  categories: { id: string; name: string } | null;
};

export type ShoppingItem = {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  is_checked: boolean;
  created_by: string;
  created_at: string;
};

export type ShoppingTrip = {
  id: string;
  household_id: string;
  completed_by: string;
  paid_by: string | null;
  amount: number | null;
  items: { name: string; quantity: string | null }[];
  completed_at: string;
};

export type ThemeProposalStatus = "pending" | "approved" | "rejected";

export type ThemeProposal = {
  id: string;
  household_id: string;
  proposed_by: string;
  color: string;
  status: ThemeProposalStatus;
  created_at: string;
};

export type ThemeProposalVote = {
  proposal_id: string;
  member_id: string;
  approve: boolean;
  voted_at: string;
};
