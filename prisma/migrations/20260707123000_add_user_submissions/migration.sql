-- CreateTable
CREATE TABLE "UserSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "analysisRunId" TEXT,
    "sessionId" TEXT,
    "module" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "sourcePage" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSubmission_userId_createdAt_idx" ON "UserSubmission"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSubmission_analysisRunId_createdAt_idx" ON "UserSubmission"("analysisRunId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSubmission_sessionId_createdAt_idx" ON "UserSubmission"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSubmission_module_inputType_createdAt_idx" ON "UserSubmission"("module", "inputType", "createdAt");

-- AddForeignKey
ALTER TABLE "UserSubmission" ADD CONSTRAINT "UserSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubmission" ADD CONSTRAINT "UserSubmission_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
