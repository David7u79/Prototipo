-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('WEIGHT', 'REPS', 'DISTANCE', 'DURATION', 'TIME');

-- CreateEnum
CREATE TYPE "RecordUnit" AS ENUM ('KILOGRAM', 'POUND', 'REPETITION', 'METER', 'KILOMETER', 'MILE', 'SECOND');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('MANUAL', 'WORKOUT');

-- CreateEnum
CREATE TYPE "MovementCategory" AS ENUM ('WAIST', 'UPPER_LEGS', 'LOWER_LEGS', 'BACK', 'CHEST', 'SHOULDERS', 'UPPER_ARMS', 'LOWER_ARMS', 'NECK', 'CARDIO');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BODY_WEIGHT', 'ASSISTED', 'WEIGHTED', 'BARBELL', 'OLYMPIC_BARBELL', 'EZ_BARBELL', 'TRAP_BAR', 'SMITH_MACHINE', 'DUMBBELL', 'KETTLEBELL', 'CABLE', 'LEVERAGE_MACHINE', 'SLED_MACHINE', 'BAND', 'RESISTANCE_BAND', 'MEDICINE_BALL', 'STABILITY_BALL', 'BOSU_BALL', 'ROPE', 'ROLLER', 'WHEEL_ROLLER', 'HAMMER', 'TIRE', 'STATIONARY_BIKE', 'ELLIPTICAL_MACHINE', 'STEPMILL_MACHINE', 'SKIERG_MACHINE', 'UPPER_BODY_ERGOMETER');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('ABS', 'OBLIQUES', 'CORE', 'HIP_FLEXORS', 'LOWER_BACK', 'UPPER_BACK', 'LATS', 'TRAPS', 'NECK', 'CHEST', 'SHOULDERS', 'SERRATUS_ANTERIOR', 'BICEPS', 'TRICEPS', 'FOREARMS', 'GLUTES', 'QUADRICEPS', 'HAMSTRINGS', 'ADDUCTORS', 'ABDUCTORS', 'CALVES', 'ANKLES_AND_FEET', 'CARDIOVASCULAR_SYSTEM');

-- CreateEnum
CREATE TYPE "MovementDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "heightCm" DECIMAL(4,1),
ADD COLUMN     "preferredUnits" "UnitSystem" NOT NULL DEFAULT 'METRIC',
ADD COLUMN     "trainingSince" DATE,
ADD COLUMN     "weightKg" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT[],
    "category" "MovementCategory" NOT NULL,
    "equipment" "Equipment" NOT NULL,
    "difficulty" "MovementDifficulty",
    "primaryMuscles" "MuscleGroup"[],
    "secondaryMuscles" "MuscleGroup"[],
    "recordTypes" "RecordType"[],
    "source" TEXT,
    "sourceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "recordType" "RecordType" NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "unit" "RecordUnit" NOT NULL,
    "normalizedValue" DECIMAL(14,3) NOT NULL,
    "repetitions" INTEGER,
    "performedAt" DATE NOT NULL,
    "notes" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'MANUAL',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movement_slug_key" ON "Movement"("slug");

-- CreateIndex
CREATE INDEX "Movement_isActive_name_idx" ON "Movement"("isActive", "name");

-- CreateIndex
CREATE INDEX "Movement_category_idx" ON "Movement"("category");

-- CreateIndex
CREATE INDEX "Movement_equipment_idx" ON "Movement"("equipment");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_source_sourceId_key" ON "Movement"("source", "sourceId");

-- CreateIndex
CREATE INDEX "PersonalRecord_userId_deletedAt_performedAt_idx" ON "PersonalRecord"("userId", "deletedAt", "performedAt");

-- CreateIndex
CREATE INDEX "PersonalRecord_userId_movementId_recordType_idx" ON "PersonalRecord"("userId", "movementId", "recordType");

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
