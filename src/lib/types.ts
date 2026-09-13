export type Profile = {
  id: string;
  full_name: string;
  household_id: string | null;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
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
