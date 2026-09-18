"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/HouseholdContext";
import type { ShoppingItem } from "@/lib/types";

type Member = { id: string; full_name: string };
type Category = { id: string; name: string };

export default function ShoppingListClient() {
  const { supabase, household, user } = useHousehold();
  const householdId = household.id;
  const currentUserId = user.id;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [payerId, setPayerId] = useState(currentUserId);
  const [storeName, setStoreName] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: itemsData }, { data: membersData }, { data: categoriesData }] = await Promise.all([
        supabase
          .from("shopping_items")
          .select("*")
          .eq("household_id", householdId)
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("id, full_name").eq("household_id", householdId),
        supabase.from("categories").select("id, name").eq("household_id", householdId),
      ]);
      if (cancelled) return;
      setItems((itemsData ?? []) as ShoppingItem[]);
      setMembers(membersData ?? []);
      setCategories(categoriesData ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, householdId]);

  useEffect(() => {
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

  if (loading) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Cargando...</p>;
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from("shopping_items").insert({
      household_id: householdId,
      name: name.trim(),
      quantity: quantity.trim() || null,
      created_by: currentUserId,
    });
    setName("");
    setQuantity("");
  }

  // Actualiza el estado local al toque en vez de esperar el eco de Realtime:
  // confiar solo en Realtime para la propia acción hacía que a veces pareciera
  // que "no pasaba nada" hasta navegar a otra pantalla y volver.
  async function toggle(item: ShoppingItem) {
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, is_checked: !item.is_checked } : i)));
    await supabase.from("shopping_items").update({ is_checked: !item.is_checked }).eq("id", item.id);
  }

  async function remove(id: string) {
    setItems((current) => current.filter((i) => i.id !== id));
    await supabase.from("shopping_items").delete().eq("id", id);
  }

  async function emptyList() {
    if (items.length === 0) return;
    if (!confirm("¿Vaciar toda la lista (incluido lo pendiente)? Esto no queda guardado en ningún lado.")) return;
    setItems([]);
    await supabase.from("shopping_items").delete().eq("household_id", householdId);
  }

  async function confirmPurchase() {
    if (done.length === 0) return;
    if (!storeName.trim()) {
      setCompleteError("Decinos en qué mercado fue.");
      return;
    }
    setCompleteError(null);
    setSaving(true);
    try {
      const amountValue = amount ? Number(amount) : null;

      const { data: trip } = await supabase
        .from("shopping_trips")
        .insert({
          household_id: householdId,
          completed_by: currentUserId,
          paid_by: payerId || null,
          store_name: storeName.trim(),
          amount: amountValue,
          items: done.map((i) => ({ name: i.name, quantity: i.quantity })),
        })
        .select()
        .single();

      if (amountValue) {
        const mercado = categories.find((c) => c.name.toLowerCase() === "mercado");
        await supabase.from("expenses").insert({
          household_id: householdId,
          member_id: payerId,
          category_id: mercado?.id ?? null,
          created_by: currentUserId,
          description: storeName.trim(),
          amount: amountValue,
          shopping_trip_id: trip?.id ?? null,
        });
      }

      setItems((current) => current.filter((i) => !i.is_checked));
      await supabase.from("shopping_items").delete().eq("household_id", householdId).eq("is_checked", true);

      setShowComplete(false);
      setAmount("");
      setStoreName("");
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
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="¿En qué mercado fue? (ej. Día, Carrefour)"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
          />
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
          {completeError && <p className="text-sm text-red-600">{completeError}</p>}
          <p className="text-xs text-black/50 dark:text-white/50">
            Si cargás un monto, se suma automáticamente al resumen de gastos con el mercado como descripción, y
            desde ahí vas a poder ver qué compraste.
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
          <li key={item.id} className="flex items-center gap-1 px-2 py-1">
            <input
              type="checkbox"
              checked={item.is_checked}
              onChange={() => toggle(item)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <button
              onClick={() => toggle(item)}
              className="flex flex-1 items-center gap-2 rounded-lg px-2 py-3 text-left text-sm active:bg-black/5 dark:active:bg-white/10"
            >
              <span className="flex-1">{item.name}</span>
              {item.quantity && <span className="text-xs text-black/50 dark:text-white/50">{item.quantity}</span>}
            </button>
            <button
              onClick={() => remove(item.id)}
              className="p-2 text-black/30 hover:text-red-600 dark:text-white/30"
              title="Borrar"
            >
              🗑️
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
              <li key={item.id} className="flex items-center gap-1 px-2 py-1 opacity-60">
                <input
                  type="checkbox"
                  checked={item.is_checked}
                  onChange={() => toggle(item)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <button
                  onClick={() => toggle(item)}
                  className="flex flex-1 items-center gap-2 rounded-lg px-2 py-3 text-left text-sm active:bg-black/5 dark:active:bg-white/10"
                >
                  <span className="flex-1 line-through">{item.name}</span>
                  {item.quantity && <span className="text-xs">{item.quantity}</span>}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="p-2 text-black/30 hover:text-red-600 dark:text-white/30"
                  title="Borrar"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
