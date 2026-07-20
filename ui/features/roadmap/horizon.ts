export function horizonGroupLabel(horizonDays: number): string {
  return horizonDays <= 30 ? "Soon" : "Later";
}
