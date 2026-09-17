import { roundTo, type UnitSystem } from '@garfit/domain';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function toProfileMetric(
  value: FormDataEntryValue | null,
  system: UnitSystem,
  factor: number,
  decimals?: number,
): number | null {
  if (value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Number.NaN;
  const converted = system === 'IMPERIAL' ? numeric * factor : numeric;
  return decimals !== undefined ? roundTo(converted, decimals) : converted;
}

export function profileFormValues(
  profile: { heightCm: number | null; weightKg: number | null } | null,
  system: UnitSystem,
) {
  const height = profile?.heightCm ?? null;
  const weight = profile?.weightKg ?? null;
  return {
    height: height === null ? '' : system === 'IMPERIAL' ? roundTo(height / CM_PER_IN, 1) : height,
    weight: weight === null ? '' : system === 'IMPERIAL' ? roundTo(weight / KG_PER_LB, 1) : weight,
  };
}

export const profileUnitFactors = { kg: KG_PER_LB, cm: CM_PER_IN };
