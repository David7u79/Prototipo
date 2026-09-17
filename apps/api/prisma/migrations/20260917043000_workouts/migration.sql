-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH', 'FOR_TIME', 'AMRAP', 'EMOM', 'CARDIO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
ALTER TYPE "Equipment" ADD VALUE 'ROWING_MACHINE';

-- AlterTable
ALTER TABLE "PersonalRecord" ADD COLUMN     "distanceMeters" DECIMAL(14,3),
ADD COLUMN     "distanceUnit" "RecordUnit",
ADD COLUMN     "distanceValue" DECIMAL(12,3),
ADD COLUMN     "workoutResultId" TEXT;

-- CreateTable
CREATE TABLE "Wod" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workoutType" "WorkoutType" NOT NULL,
    "durationSeconds" INTEGER,
    "rounds" INTEGER,
    "intervalSeconds" INTEGER,
    "repScheme" INTEGER[],
    "isBenchmark" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WodExercise" (
    "id" TEXT NOT NULL,
    "wodId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "reps" INTEGER,
    "loadValue" DECIMAL(12,3),
    "loadUnit" "RecordUnit",
    "distanceValue" DECIMAL(12,3),
    "distanceUnit" "RecordUnit",
    "durationSeconds" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WodExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wodId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "workoutType" "WorkoutType" NOT NULL,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'DRAFT',
    "durationSeconds" INTEGER,
    "rounds" INTEGER,
    "intervalSeconds" INTEGER,
    "repScheme" INTEGER[],
    "performedOn" DATE,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "targetSets" INTEGER,
    "targetReps" INTEGER,
    "targetLoadValue" DECIMAL(12,3),
    "targetLoadUnit" "RecordUnit",
    "targetDistanceValue" DECIMAL(12,3),
    "targetDistanceUnit" "RecordUnit",
    "targetDurationSeconds" INTEGER,
    "restSeconds" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutResult" (
    "id" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER,
    "loadValue" DECIMAL(12,3),
    "loadUnit" "RecordUnit",
    "loadKg" DECIMAL(12,3),
    "distanceValue" DECIMAL(12,3),
    "distanceUnit" "RecordUnit",
    "distanceMeters" DECIMAL(14,3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutScore" (
    "workoutId" TEXT NOT NULL,
    "timeSeconds" INTEGER,
    "repsAtTimeCap" INTEGER,
    "rounds" INTEGER,
    "extraReps" INTEGER,
    "completed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutScore_pkey" PRIMARY KEY ("workoutId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wod_slug_key" ON "Wod"("slug");

-- CreateIndex
CREATE INDEX "Wod_ownerId_idx" ON "Wod"("ownerId");

-- CreateIndex
CREATE INDEX "Wod_isBenchmark_idx" ON "Wod"("isBenchmark");

-- CreateIndex
CREATE UNIQUE INDEX "WodExercise_wodId_position_key" ON "WodExercise"("wodId", "position");

-- CreateIndex
CREATE INDEX "Workout_userId_deletedAt_status_performedOn_idx" ON "Workout"("userId", "deletedAt", "status", "performedOn");

-- CreateIndex
CREATE INDEX "Workout_wodId_idx" ON "Workout"("wodId");

-- CreateIndex
CREATE INDEX "WorkoutExercise_movementId_idx" ON "WorkoutExercise"("movementId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_workoutId_position_key" ON "WorkoutExercise"("workoutId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutResult_workoutExerciseId_setNumber_key" ON "WorkoutResult"("workoutExerciseId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalRecord_workoutResultId_recordType_key" ON "PersonalRecord"("workoutResultId", "recordType");

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_workoutResultId_fkey" FOREIGN KEY ("workoutResultId") REFERENCES "WorkoutResult"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wod" ADD CONSTRAINT "Wod_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WodExercise" ADD CONSTRAINT "WodExercise_wodId_fkey" FOREIGN KEY ("wodId") REFERENCES "Wod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WodExercise" ADD CONSTRAINT "WodExercise_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_wodId_fkey" FOREIGN KEY ("wodId") REFERENCES "Wod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutResult" ADD CONSTRAINT "WorkoutResult_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutScore" ADD CONSTRAINT "WorkoutScore_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

