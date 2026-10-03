/**
 * Sueldos que se cobran a mes vencido en los últimos ~7 días del mes se usan
 * durante todo el mes siguiente. Esta función devuelve la fecha "efectiva"
 * para fines de presupuesto: si la fecha cae en la última semana de su mes,
 * la mueve al día 1 del mes siguiente; si no, la deja igual. Nunca modifica
 * el income_date real guardado en la base, solo cómo se agrupa en el Resumen.
 */
export function effectiveIncomeDate(incomeDate: string): string {
  const [year, month, day] = incomeDate.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth - 7) {
    const next = new Date(year, month, 1);
    const nextMonth = String(next.getMonth() + 1).padStart(2, "0");
    return `${next.getFullYear()}-${nextMonth}-01`;
  }
  return incomeDate;
}
