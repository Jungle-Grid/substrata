ALTER TABLE "ExtractedSpec"
ADD COLUMN "confidenceLevel" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'product_identity';
