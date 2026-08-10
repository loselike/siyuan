CREATE TABLE "UserTablePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferenceKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTablePreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserTablePreference_userId_preferenceKey_key"
ON "UserTablePreference"("userId", "preferenceKey");

CREATE INDEX "UserTablePreference_userId_updatedAt_idx"
ON "UserTablePreference"("userId", "updatedAt");

ALTER TABLE "UserTablePreference"
ADD CONSTRAINT "UserTablePreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
