-- CreateEnum
CREATE TYPE "BiometricSource" AS ENUM ('HEALTH_CONNECT', 'WEAR_OS');

-- CreateTable
CREATE TABLE "WorkoutBiometrics" (
    "workoutId" TEXT NOT NULL,
    "avgHeartRateBpm" INTEGER,
    "maxHeartRateBpm" INTEGER,
    "activeCaloriesKcal" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "source" "BiometricSource" NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutBiometrics_pkey" PRIMARY KEY ("workoutId")
);

-- AddForeignKey
ALTER TABLE "WorkoutBiometrics" ADD CONSTRAINT "WorkoutBiometrics_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
