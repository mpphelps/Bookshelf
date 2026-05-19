-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_bookId_fkey";

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
