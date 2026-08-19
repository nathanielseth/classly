import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Groq from "groq-sdk";
import { authMiddleware } from "../middleware";
import { aiRatelimit } from "../ratelimit";
import { assertNoOpenQuizSession } from "../exam-lock";
import { getMaterialContentForAi } from "./materials";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// only user/assistant turns are accepted
// the single system prompt comes from the server, preventing students from injecting their own system role to override instructions
const chatInput = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(8000),
    }),
  ),
});

const ACADEMIC_ASSISTANT_BASE_RULES = `Stay strictly within these bounds:
- Only help with academic, educational, or constructive classroom-related requests: explaining concepts, study help, summarizing material, exam/quiz prep (outside of active exams), writing feedback, and similar.
- Do not write, complete, debug, or explain code, even if framed as a class assignment, homework help, or "just this once." Politely decline and suggest the student consult their instructor or a programming-specific tool.
- Do not do anything outside an academic context: no general chit-chat, entertainment, personal advice unrelated to school, or tasks that resemble spam, testing your limits, or abusing this tool for non-academic purposes.
- If a request is ambiguous, prefer the more conservative interpretation and gently redirect back to legitimate academic use.

If a request falls outside these bounds, briefly explain that you're limited to academic assistance and decline, rather than attempting a partial or reframed answer.`

// role framing is always derived from the server‑verified profile role
const ROLE_SYSTEM_PROMPTS: Record<string, string> = {
  instructor: `You are Classly's academic assistant, helping instructors prepare lessons, create assessments, and explain concepts to teach with. ${ACADEMIC_ASSISTANT_BASE_RULES}`,
  admin: `You are Classly's academic assistant, helping an LMS administrator with academic and platform-operations questions. ${ACADEMIC_ASSISTANT_BASE_RULES}`,
  student: `You are Classly's academic assistant, helping students with their coursework. ${ACADEMIC_ASSISTANT_BASE_RULES}`,
}

function systemPromptFor(role: string): string {
  return ROLE_SYSTEM_PROMPTS[role] ?? ROLE_SYSTEM_PROMPTS.student
}

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(chatInput)
  .handler(async ({ data, context }) => {
    await assertNoOpenQuizSession(context.supabase, context.profile)

    const { success, reset } = await aiRatelimit.limit(context.user.id)

    if (!success) {
      throw new Error(
        `Rate limit exceeded. Try again after ${new Date(reset).toLocaleTimeString()}.`,
      )
    }

    const groqStream = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPromptFor(context.profile.role),
        },
        ...data.messages,
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    })

    // server functions can stream chunks directly, letting the client render chat token‑by‑token instead of waiting for the full buffered reply.
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of groqStream) {
            const token = chunk.choices[0]?.delta?.content
            if (token) controller.enqueue(encoder.encode(token))
          }
        } catch (err) {
          controller.error(err)
          return
        }
        controller.close()
      },
    })

    return { stream }
  });

async function consumeAiRateLimit(userId: string) {
  const { success, remaining, reset } = await aiRatelimit.limit(userId);
  if (!success) {
    throw new Error(
      `Rate limit exceeded. Try again after ${new Date(reset).toLocaleTimeString()}.`,
    );
  }
  return remaining;
}

const materialContentInput = {
  materialTitle: z.string().trim().min(1).max(200),
  materialContent: z.string().trim().min(50).max(8000),
};

const generateFlashcardsInput = z.object(materialContentInput);

interface Flashcard {
  question: string;
  answer: string;
}

function extractJsonArray(raw: string): unknown {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("The AI response didn't contain a recognizable list. Please try again.");
  }
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse the AI's response. Please try again.");
  }
}

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(generateFlashcardsInput)
  .handler(async ({ data, context }) => {
    await assertNoOpenQuizSession(context.supabase, context.profile);
    await consumeAiRateLimit(context.user.id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `You are an educational flashcard generator. Create 10 high-quality flashcards from the following material.

Material Title: ${data.materialTitle}
Content: ${data.materialContent}

Generate flashcards that:
- Cover key concepts and definitions
- Are clear and concise
- Have meaningful questions and accurate short answers
- Progress from basic to advanced concepts

CRITICAL: Return ONLY a valid JSON array. NO markdown. NO explanations. NO text before or after.
Start with [ and end with ]

Format:
[{"question": "Q1", "answer": "A1"}, {"question": "Q2", "answer": "A2"}]`,
        },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from AI.");

    const parsed = extractJsonArray(content);
    if (!Array.isArray(parsed)) {
      throw new Error("The AI's response wasn't a list of flashcards. Please try again.");
    }

    const cards: Flashcard[] = parsed.filter(
      (c): c is Flashcard =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Flashcard).question === "string" &&
        typeof (c as Flashcard).answer === "string",
    );

    if (cards.length === 0) {
      throw new Error("No valid flashcards were generated. Please try again.");
    }

    return { flashcards: cards };
  });

const generateQuizInput = z.object(materialContentInput);

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shuffleQuizOptions(quiz: QuizQuestion[]): QuizQuestion[] {
  return quiz.map((q) => {
    const correctOption = q.options[q.correctIndex];
    const shuffledOptions = shuffleArray(q.options);
    const newCorrectIndex = shuffledOptions.indexOf(correctOption);
    return { ...q, options: shuffledOptions, correctIndex: newCorrectIndex };
  });
}

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(generateQuizInput)
  .handler(async ({ data, context }) => {
    await assertNoOpenQuizSession(context.supabase, context.profile);
    await consumeAiRateLimit(context.user.id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a quiz generator that outputs ONLY valid JSON arrays. Never include markdown, explanations, or any text outside the JSON array.",
        },
        {
          role: "user",
          content: `Create exactly 10 multiple choice questions from this material.

Material: ${data.materialTitle}
Content: ${data.materialContent}

Return a JSON array with this exact structure:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

Requirements:
- Exactly 10 questions
- Each question has exactly 4 options
- correctIndex is 0, 1, 2, or 3
- Test key concepts from the material
- NO markdown, NO explanations, ONLY the JSON array`,
        },
      ],
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from AI.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse quiz response. Please try again.");
    }

    if (!Array.isArray(parsed) && parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.quiz)) parsed = obj.quiz;
      else if (Array.isArray(obj.questions)) parsed = obj.questions;
      else {
        const arrayValue = Object.values(obj).find((v) => Array.isArray(v));
        if (arrayValue) parsed = arrayValue;
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Failed to parse quiz response. Please try again.");
    }

    const validQuiz: QuizQuestion[] = parsed.filter((q): q is QuizQuestion => {
      return (
        q &&
        typeof q === "object" &&
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((opt: unknown) => typeof opt === "string") &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3
      );
    });

    if (validQuiz.length === 0) {
      throw new Error("No valid questions were generated. Please try again.");
    }

    return { quiz: shuffleQuizOptions(validQuiz) };
  });

const digitizeQuizInput = z.object({
  materialId: z.uuid(),
});

// digitize extracts existing quiz questions verbatim, unlike generateQuiz, and handles varied option counts without inventing new ones
export const digitizeQuizFromMaterial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(digitizeQuizInput)
  .handler(async ({ data, context }) => {
    await assertNoOpenQuizSession(context.supabase, context.profile);

    if (context.profile.role !== "instructor" && context.profile.role !== "admin") {
      throw new Error("Only instructors can digitize a quiz.");
    }

    const { content, hasFileContent } = await getMaterialContentForAi({
      data: { materialId: data.materialId },
    });

    if (!hasFileContent) {
      throw new Error(
        "This material doesn't have an attached file to digitize. Attach a quiz PDF or text file first.",
      );
    }
    if (content.length < 20) {
      throw new Error(
        "Couldn't read enough content from the attached file. Try re-uploading it.",
      );
    }

    await consumeAiRateLimit(context.user.id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You transcribe existing quiz questions from a document into structured JSON. You do not invent, rephrase, or add new questions - only extract what is already written. Output ONLY a valid JSON array, no markdown, no explanations.",
        },
        {
          role: "user",
          content: `Extract every multiple-choice or true/false question from this quiz document, exactly as written.

Document: ${content}

Return a JSON array with this exact structure:
[
  {
    "question": "Question text exactly as it appears",
    "options": ["Option A", "Option B", "..."],
    "correctIndex": 0
  }
]

Requirements:
- Preserve the original question wording and option text
- Include every option as written (2 to 8 options per question is fine - do not force a fixed count)
- If the correct answer is marked in the document (e.g. bolded, starred, an answer key), set correctIndex to match it; otherwise set correctIndex to 0 and the instructor will fix it during review
- correctIndex must be a valid index into that question's options array
- NO markdown, NO explanations, ONLY the JSON array`,
        },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.1,
      max_tokens: 4096,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) throw new Error("No content received from AI.");

    const parsed = extractJsonArray(responseContent);
    if (!Array.isArray(parsed)) {
      throw new Error("The AI's response wasn't a list of questions. Please try again.");
    }

    const validQuiz: QuizQuestion[] = parsed.filter((q): q is QuizQuestion => {
      return (
        q &&
        typeof q === "object" &&
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.every((opt: unknown) => typeof opt === "string") &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex < q.options.length
      );
    });

    if (validQuiz.length === 0) {
      throw new Error(
        "Couldn't extract any valid questions from this file. It may not be a recognizable quiz format.",
      );
    }

    return { quiz: validQuiz };
  });