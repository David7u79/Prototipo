import GarfitWearModule, {
  type GarfitWearModuleContract,
  type WearWorkoutSummary,
} from './src/GarfitWearModule';

export type { WearWorkoutSummary, GarfitWearModuleContract };

export async function getSummaries(): Promise<WearWorkoutSummary[]> {
  if (!GarfitWearModule) {
    return [];
  }
  return await GarfitWearModule.getSummaries();
}

export async function deleteSummary(sessionId: string): Promise<void> {
  if (!GarfitWearModule) {
    return;
  }
  await GarfitWearModule.deleteSummary(sessionId);
}

export function isWearNativeModuleAvailable(): boolean {
  return GarfitWearModule !== null;
}

export default {
  getSummaries,
  deleteSummary,
  isWearNativeModuleAvailable,
};
