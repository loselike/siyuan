ALTER TABLE "User" ADD COLUMN "directManagerId" TEXT;

CREATE INDEX "User_directManagerId_idx" ON "User"("directManagerId");

ALTER TABLE "User"
ADD CONSTRAINT "User_directManagerId_fkey"
FOREIGN KEY ("directManagerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
