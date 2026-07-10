ALTER TABLE "LoadProfile" ADD COLUMN "userId" TEXT;

CREATE INDEX "LoadProfile_userId_createdAt_idx" ON "LoadProfile"("userId", "createdAt");

ALTER TABLE "LoadProfile"
  ADD CONSTRAINT "LoadProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
