"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type MemberTotal = { name: string; total: number };

export default function MemberBarChart({ data, color = "#0d9488" }: { data: MemberTotal[]; color?: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white/50">Todavía no hay gastos cargados.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip formatter={(value) => `$${Number(value ?? 0).toFixed(2)}`} />
        <Bar dataKey="total" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
