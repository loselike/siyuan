CREATE TABLE "CustomerSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "remark" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerSource_normalizedName_key" ON "CustomerSource"("normalizedName");
CREATE INDEX "CustomerSource_enabled_sortOrder_idx" ON "CustomerSource"("enabled", "sortOrder");
