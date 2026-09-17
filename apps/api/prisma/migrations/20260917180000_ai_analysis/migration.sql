-- CreateEnum
CREATE TYPE "AiAnalysisType" AS ENUM ('PROGRESS_ANALYSIS', 'WORKOUT_ANALYSIS', 'WOD_EXPLANATION', 'MOVEMENT_EXPLANATION');

-- CreateEnum
CREATE TYPE "AiAnalysisStatus" AS ENUM ('COMPLETED', 'INSUFFICIENT_DATA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiConsentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AiAnalysisType" NOT NULL,
    "targetId" TEXT,
    "periodDays" INTEGER,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "contextHash" CHAR(64) NOT NULL,
    "status" "AiAnalysisStatus" NOT NULL,
    "responseJson" JSONB NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAnalysis_userId_contextHash_promptVersion_model_idx" ON "AiAnalysis"("userId", "contextHash", "promptVersion", "model");

-- AddForeignKey
ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

