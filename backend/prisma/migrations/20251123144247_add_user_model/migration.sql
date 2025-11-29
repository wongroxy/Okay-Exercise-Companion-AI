-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "avatarUrl" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuizSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" BIGINT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "imageUrls" TEXT NOT NULL,
    "model" TEXT,
    "userId" TEXT,
    CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuizSession" ("id", "imageUrls", "model", "score", "timestamp", "totalQuestions") SELECT "id", "imageUrls", "model", "score", "timestamp", "totalQuestions" FROM "QuizSession";
DROP TABLE "QuizSession";
ALTER TABLE "new_QuizSession" RENAME TO "QuizSession";
CREATE TABLE "new_SavedEssay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "contentScore" INTEGER NOT NULL,
    "expressionScore" INTEGER NOT NULL,
    "structureScore" INTEGER NOT NULL,
    "punctuationScore" INTEGER NOT NULL,
    "typoBonus" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "transcribedText" TEXT NOT NULL,
    "overallComment" TEXT NOT NULL,
    "feedbackContent" TEXT NOT NULL,
    "feedbackExpression" TEXT NOT NULL,
    "feedbackStructure" TEXT NOT NULL,
    "feedbackPunctuation" TEXT NOT NULL,
    "tokenUsage" TEXT,
    "cost" TEXT,
    "imageUrls" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "SavedEssay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SavedEssay" ("contentScore", "cost", "expressionScore", "feedbackContent", "feedbackExpression", "feedbackPunctuation", "feedbackStructure", "id", "imageUrls", "overallComment", "punctuationScore", "structureScore", "timestamp", "title", "tokenUsage", "totalScore", "transcribedText", "typoBonus") SELECT "contentScore", "cost", "expressionScore", "feedbackContent", "feedbackExpression", "feedbackPunctuation", "feedbackStructure", "id", "imageUrls", "overallComment", "punctuationScore", "structureScore", "timestamp", "title", "tokenUsage", "totalScore", "transcribedText", "typoBonus" FROM "SavedEssay";
DROP TABLE "SavedEssay";
ALTER TABLE "new_SavedEssay" RENAME TO "SavedEssay";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
