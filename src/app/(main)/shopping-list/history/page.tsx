"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/HouseholdContext";

type TripRow = {
  id: string;
  amount: number | null;
  store_name: string | null;
  items: { name: string; quantity: string | null }[];
  completed_at: string;
  completed_by_profile: { full_name: string } | null;
  paid_by_profile: { full_name: string } | null;
};

export default function ShoppingHistoryPage() {
  const { supabase, household } = useHousehold();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("shopping_trips")
        .select(
          "id, amount, store_name, items, completed_at, completed_by_profile:profiles!completed_by(full_name), paid_by_profile:profiles!paid_by(full_name)"
        )
        .eq("household_id", household.id)
        .order("completed_at", { ascending: false });
      if (cancelled) return;
      setTrips((data ?? []) as unknown as TripRow[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, household.id]);

  if (loading) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Cargando...</p>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Historial de compras</h1>
        <Link href="/shopping-list" className="text-sm text-[var(--accent)] hover:underline">
          ← Volver a la lista
        </Link>
      </div>

      {trips.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">
          Todavía no cerraste ninguna compra. Cuando marques &ldquo;Compra realizada&rdquo; en la lista, va a
          aparecer acá.
        </p>
      )}

      <ul className="space-y-3">
        {trips.map((trip) => (
          <li key={trip.id} className="rounded-xl border border-black/10 p-4 dark:border-white/15">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">
                {trip.store_name && <>{trip.store_name} · </>}
                {new Date(trip.completed_at).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {trip.amount != null && <span className="font-semibold">${Number(trip.amount).toFixed(2)}</span>}
            </div>
            <p className="mb-2 text-xs text-black/50 dark:text-white/50">
              Comprado por {trip.completed_by_profile?.full_name ?? "—"}
              {trip.paid_by_profile && <> · Pagó {trip.paid_by_profile.full_name}</>}
            </p>
            <p className="text-sm text-black/70 dark:text-white/70">
              {trip.items.map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name)).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
