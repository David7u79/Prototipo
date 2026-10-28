import { requireOptionalNativeModule } from 'expo';

export interface WearWorkoutSummary {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  activeCaloriesKcal: number | null;
}

export interface GarfitWearModuleContract {
  getSummaries(): Promise<WearWorkoutSummary[]>;
  deleteSummary(sessionId: string): Promise<void>;
}

export default requireOptionalNativeModule<GarfitWearModuleContract>('GarfitWear');
