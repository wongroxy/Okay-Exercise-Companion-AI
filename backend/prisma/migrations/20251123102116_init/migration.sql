-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" BIGINT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "imageUrls" TEXT NOT NULL,
    "model" TEXT
);

-- CreateTable
CREATE TABLE "ReviewQuestion" (
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
    CONSTRAINT "ReviewQuestion_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedEssay" (
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
    "imageUrls" TEXT NOT NULL
);
