import { cmToIn, inToCm, kgToLb, lbToKg, type UnitSystem } from '@garfit/domain';

export function toProfileMetric(
  value: FormDataEntryValue | null,
  system: UnitSystem,
  factor: number,
  _decimals?: number,
): number | null {
  void _decimals;
  if (value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Number.NaN;
  if (system !== 'IMPERIAL') return numeric;
  return factor === profileUnitFactors.kg ? lbToKg(numeric) : inToCm(numeric);
}

export function profileFormValues(
  profile: { heightCm: number | null; weightKg: number | null } | null,
  system: UnitSystem,
) {
  const height = profile?.heightCm ?? null;
  const weight = profile?.weightKg ?? null;
  return {
    height: height === null ? '' : system === 'IMPERIAL' ? cmToIn(height) : height,
    weight: weight === null ? '' : system === 'IMPERIAL' ? kgToLb(weight) : weight,
  };
}

export const profileUnitFactors = { kg: 1, cm: 2 };
