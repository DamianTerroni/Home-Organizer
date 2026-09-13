"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShoppingItem } from "@/lib/types";

type Member = { id: string; full_name: string };
type Category = { id: string; name: string };

export default function ShoppingListClient({
  initialItems,
  householdId,
  currentUserId,
  members,
  categories,
}: {
  initialItems: ShoppingItem[];
  householdId: string;
  currentUserId: string;
  members: Member[];
  categories: Category[];
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [payerId, setPayerId] = useState(currentUserId);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`shopping-list-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items", filter: `household_id=eq.${householdId}` },
        (payload) => {
          setItems((current) => {
            if (payload.eventType === "INSERT") {
              const newItem = payload.new as ShoppingItem;
              if (current.some((i) => i.id === newItem.id)) return current;
              return [...current, newItem];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as ShoppingItem;
              return current.map((i) => (i.id === updated.id ? updated : i));
            }
            if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as ShoppingItem).id;
              return current.filter((i) => i.id !== deletedId);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  if (!supabase) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Supabase no está configurado.</p>;
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !supabase) return;
    await supabase.from("shopping_items").insert({
      household_id: householdId,
      name: name.trim(),
      quantity: quantity.trim() || null,
      created_by: currentUserId,
    });
    setName("");
    setQuantity("");
  }

  async function toggle(item: ShoppingItem) {
    if (!supabase) return;
    await supabase.from("shopping_items").update({ is_checked: !item.is_checked }).eq("id", item.id);
  }

  async function remove(id: string) {
    if (!supabase) return;
    await supabase.from("shopping_items").delete().eq("id", id);
  }

  async function emptyList() {
    if (!supabase || items.length === 0) return;
    if (!confirm("¿Vaciar toda la lista (incluido lo pendiente)? Esto no queda guardado en ningún lado.")) return;
    await supabase.from("shopping_items").delete().eq("household_id", householdId);
  }

  async function confirmPurchase() {
    if (!supabase || done.length === 0) return;
    setSaving(true);
    try {
      const amountValue = amount ? Number(amount) : null;

      await supabase.from("shopping_trips").insert({
        household_id: householdId,
        completed_by: currentUserId,
        paid_by: payerId || null,
        amount: amountValue,
        items: done.map((i) => ({ name: i.name, quantity: i.quantity })),
      });

      if (amountValue) {
        const mercado = categories.find((c) => c.name.toLowerCase() === "mercado");
        await supabase.from("expenses").insert({
          household_id: householdId,
          member_id: payerId,
          category_id: mercado?.id ?? null,
          created_by: currentUserId,
          description: "Compra de supermercado",
          amount: amountValue,
        });
      }

      await supabase.from("shopping_items").delete().eq("household_id", householdId).eq("is_checked", true);

      setShowComplete(false);
      setAmount("");
    } finally {
      setSaving(false);
    }
  }

  const pending = items.filter((i) => !i.is_checked);
  const done = items.filter((i) => i.is_checked);

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Lista de compras</h1>
          <Link href="/shopping-list/history" className="text-xs text-[var(--accent)] hover:underline">
            Ver historial de compras
          </Link>
        </div>
        <div className="flex gap-2">
          <button
            onClick={emptyList}
            disabled={items.length === 0}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-black/60 disabled:opacity-40 dark:border-white/15 dark:text-white/60"
            title="Borra todo, incluido lo pendiente, sin guardar historial"
          >
            Vaciar lista
          </button>
          <button
            onClick={() => setShowComplete((v) => !v)}
            disabled={done.length === 0}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            Compra realizada
          </button>
        </div>
      </div>

      {showComplete && (
        <div className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm">
            Se van a archivar los <strong>{done.length}</strong> artículos comprados en el historial. Lo
            pendiente se mantiene en la lista.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto total (opcional)"
              className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
            />
          </div>
          <p className="text-xs text-black/50 dark:text-white/50">
            Si cargás un monto, se suma automáticamente al resumen de gastos como &ldquo;Compra de supermercado&rdquo;.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmPurchase}
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Confirmar"}
            </button>
            <button
              onClick={() => setShowComplete(false)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm dark:border-white/15"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={addItem} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Producto"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Cant."
          className="w-20 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
        />
        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
          Agregar
        </button>
      </form>

      <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
        {pending.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={item.is_checked}
              onChange={() => toggle(item)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="flex-1 text-sm">{item.name}</span>
            {item.quantity && <span className="text-xs text-black/50 dark:text-white/50">{item.quantity}</span>}
            <button onClick={() => remove(item.id)} className="text-black/30 hover:text-red-600 dark:text-white/30">
              ✕
            </button>
          </li>
        ))}
        {pending.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-black/50 dark:text-white/50">
            No hay nada pendiente 🎉
          </li>
        )}
      </ul>

      {done.length > 0 && (
        <details className="rounded-xl border border-black/10 dark:border-white/15">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-black/60 dark:text-white/60">
            Comprado ({done.length})
          </summary>
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {done.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <input
                  type="checkbox"
                  checked={item.is_checked}
                  onChange={() => toggle(item)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="flex-1 text-sm line-through">{item.name}</span>
                <button onClick={() => remove(item.id)} className="text-black/30 hover:text-red-600 dark:text-white/30">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
