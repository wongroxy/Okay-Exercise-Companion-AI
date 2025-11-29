/*
  Warnings:

  - You are about to drop the `QuizSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SavedEssay` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuizSession";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SavedEssay";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "QuizDatabase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" BIGINT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "imageUrls" TEXT NOT NULL,
    "model" TEXT,
    "userId" TEXT,
    CONSTRAINT "QuizDatabase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EssayDatabase" (
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
    CONSTRAINT "EssayDatabase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReviewQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizSessionId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "questionNumber" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "choices" TEXT,
    "studentAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "boundingBox" TEXT,
    "isSolved" BOOLEAN NOT NULL,
    "reanswerAttempts" INTEGER NOT NULL,
    CONSTRAINT "ReviewQuestion_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizDatabase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReviewQuestion" ("boundingBox", "choices", "correctAnswer", "explanation", "id", "isCorrect", "isSolved", "question", "questionNumber", "questionType", "quizSessionId", "reanswerAttempts", "section", "studentAnswer") SELECT "boundingBox", "choices", "correctAnswer", "explanation", "id", "isCorrect", "isSolved", "question", "questionNumber", "questionType", "quizSessionId", "reanswerAttempts", "section", "studentAnswer" FROM "ReviewQuestion";
DROP TABLE "ReviewQuestion";
ALTER TABLE "new_ReviewQuestion" RENAME TO "ReviewQuestion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
