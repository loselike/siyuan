CREATE TABLE "Site" (
  "id" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");
CREATE INDEX "Site_sortOrder_name_idx" ON "Site"("sortOrder", "name");

INSERT INTO "Site" ("id", "sortOrder", "name", "enabled") VALUES
  ('site-shenzhen-siyuan', 1, '深圳思远', true),
  ('site-shenzhen-siyuan-wuhan', 2, '深圳思远武汉', true),
  ('site-zhangzhou-sihua', 3, '漳州思华', true),
  ('site-wuhan-jiuyulian', 4, '武汉九域联', true)
ON CONFLICT ("name") DO NOTHING;
