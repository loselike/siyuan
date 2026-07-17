CREATE TABLE "UserModuleReadState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "sectionKey" TEXT NOT NULL DEFAULT '',
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "watermark" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserModuleReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserModuleReadState_userId_moduleKey_sectionKey_key"
  ON "UserModuleReadState"("userId", "moduleKey", "sectionKey");
CREATE INDEX "UserModuleReadState_userId_moduleKey_idx"
  ON "UserModuleReadState"("userId", "moduleKey");
ALTER TABLE "UserModuleReadState"
  ADD CONSTRAINT "UserModuleReadState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
