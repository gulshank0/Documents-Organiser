-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "cloudinaryPublicId" TEXT,
ADD COLUMN     "cloudinaryUrl" TEXT,
ADD COLUMN     "thumbnailPublicId" TEXT;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "logoPublicId" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "avatarPublicId" TEXT;
