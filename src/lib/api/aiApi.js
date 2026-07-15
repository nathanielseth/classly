/**
 * Streams chat completions from Groq API
 * @param {Array} messages - Conversation messages
 * @param {string} model - Model identifier
 * @param {Function} onChunk - Callback for each chunk
 */
export const getChatCompletionStream = async (messages, model, onChunk) => {
	const response = await fetch(
		"https://api.groq.com/openai/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
			},
			body: JSON.stringify({
				model,
				messages,
				temperature: 0.7,
				max_tokens: 2048,
				stream: true,
			}),
		},
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error?.message || "Failed to get response from Groq API",
		);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const chunk = decoder.decode(value);
		const lines = chunk.split("\n");

		for (const line of lines) {
			if (line.startsWith("data: ") && line !== "data: [DONE]") {
				try {
					const data = JSON.parse(line.slice(6));
					const content = data.choices[0]?.delta?.content || "";
					if (content) onChunk(content);
				} catch {
					// Skip invalid JSON
				}
			}
		}
	}
};

/**
 * Extracts text content from a PDF file
 * @param {File} file - PDF file object
 * @returns {Promise<string>} Extracted text
 */
export const extractTextFromPDF = async (file) => {
	if (!window.pdfjsLib) {
		throw new Error("PDF library not loaded. Please refresh and try again.");
	}

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	let fullText = "";

	// Read up to 10 pages to avoid token limits
	for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
		const page = await pdf.getPage(i);
		const textContent = await page.getTextContent();
		const pageText = textContent.items.map((item) => item.str).join(" ");
		fullText += pageText + "\n\n";
	}

	return fullText;
};

/**
 * Reads a text file
 * @param {File} file - Text file object
 * @returns {Promise<string>} File content
 */
export const readFileAsText = (file) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target.result);
		reader.onerror = reject;
		reader.readAsText(file);
	});
};

/**
 * Processes attached files and extracts their content
 * @param {Array<File>} files - Array of file objects
 * @returns {Promise<string>} Combined file content
 */
export const processFiles = async (files) => {
	const fileContents = await Promise.all(
		files.map(async (file) => {
			let text = "";
			if (file.type === "application/pdf") {
				text = await extractTextFromPDF(file);
			} else {
				text = await readFileAsText(file);
			}
			return `\n\n[File: ${file.name}]\n${text}`;
		}),
	);
	return fileContents.join("");
};

/**
 * Loads PDF.js library if not already loaded
 */
export const loadPDFLib = () => {
	if (!window.pdfjsLib) {
		const script = document.createElement("script");
		script.src =
			"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
		script.onload = () => {
			window.pdfjsLib.GlobalWorkerOptions.workerSrc =
				"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
		};
		document.head.appendChild(script);
	}
};

/**
 * AI Models configuration
 */
export const AI_MODELS = {
	CHAT: "openai/gpt-oss-20b",
	QUIZ: "llama-3.3-70b-versatile",
	FLASHCARD: "openai/gpt-oss-120b",
	SUMMARY: "llama-3.1-8b-instant",
};

/**
 * Generates flashcards from material content
 * @param {string} materialContent - The content to generate flashcards from
 * @param {string} materialTitle - Title of the material
 * @returns {Promise<Array>} Array of flashcard objects
 */
export const generateFlashcardsFromContent = async (
	materialContent,
	materialTitle,
) => {
	const prompt = `You are an educational flashcard generator. Create 10 high-quality flashcards from the following material.

Material Title: ${materialTitle}
Content: ${materialContent.substring(0, 8000)}

Generate flashcards that:
- Cover key concepts and definitions
- Are clear and concise
- Have meaningful questions and accurate short answers
- Progress from basic to advanced concepts

CRITICAL: Return ONLY a valid JSON array. NO markdown. NO explanations. NO text before or after.
Start with [ and end with ]

Format:
[{"question": "Q1", "answer": "A1"}, {"question": "Q2", "answer": "A2"}]`;

	let fullResponse = "";

	await getChatCompletionStream(
		[{ role: "user", content: prompt }],
		AI_MODELS.FLASHCARD,
		(chunk) => {
			fullResponse += chunk;
		},
	);

	// Clean and parse JSON
	let cleaned = fullResponse.trim();
	cleaned = cleaned.replace(/```json\n?/g, "");
	cleaned = cleaned.replace(/```\n?/g, "");

	const firstBracket = cleaned.indexOf("[");
	const lastBracket = cleaned.lastIndexOf("]");

	if (firstBracket !== -1 && lastBracket !== -1) {
		cleaned = cleaned.substring(firstBracket, lastBracket + 1);
	}

	return JSON.parse(cleaned);
};

/**
 * Fisher–Yates shuffle, returns a new array (does not mutate input).
 */
const shuffleArray = (arr) => {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

/**
 * Randomizes the position of each question's correct answer.
 *
 * LLMs reliably default to placing the correct option first (or in
 * some other fixed slot) regardless of prompting, so `correctIndex`
 * comes back skewed toward 0 the vast majority of the time. Shuffling
 * client-side after generation — rather than trying to prompt the bias
 * away — is the only reliable fix. Each question's options are
 * reordered independently so the correct-answer position varies
 * question to question, not just once for the whole quiz.
 */
const shuffleQuizOptions = (quiz) => {
	return quiz.map((q) => {
		const correctOption = q.options[q.correctIndex];
		const shuffledOptions = shuffleArray(q.options);
		const newCorrectIndex = shuffledOptions.indexOf(correctOption);

		return {
			...q,
			options: shuffledOptions,
			correctIndex: newCorrectIndex,
		};
	});
};

/**
 * Generates a quiz from material content (non-streaming for better JSON reliability)
 * @param {string} materialContent - The content to generate quiz from
 * @param {string} materialTitle - Title of the material
 * @returns {Promise<Array>} Array of quiz question objects
 */
export const generateQuizFromContent = async (
	materialContent,
	materialTitle,
) => {
	const response = await fetch(
		"https://api.groq.com/openai/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
			},
			body: JSON.stringify({
				model: "llama-3.3-70b-versatile",
				messages: [
					{
						role: "system",
						content:
							"You are a quiz generator that outputs ONLY valid JSON arrays. Never include markdown, explanations, or any text outside the JSON array.",
					},
					{
						role: "user",
						content: `Create exactly 10 multiple choice questions from this material.

Material: ${materialTitle}
Content: ${materialContent.substring(0, 8000)}

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
				response_format: { type: "json_object" },
				temperature: 0.1,
				max_tokens: 4096,
			}),
		},
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error?.message || "Failed to generate quiz");
	}

	const data = await response.json();
	const content = data.choices[0]?.message?.content;

	if (!content) {
		throw new Error("No content received from AI");
	}

	console.log("Raw AI Response:", content);

	try {
		// Parse the JSON response
		let parsed = JSON.parse(content);

		// Handle if the response is wrapped in an object with a "quiz" or "questions" key
		if (parsed.quiz) parsed = parsed.quiz;
		if (parsed.questions) parsed = parsed.questions;

		// If still not an array, try to extract array from the object
		if (!Array.isArray(parsed)) {
			const keys = Object.keys(parsed);
			for (const key of keys) {
				if (Array.isArray(parsed[key])) {
					parsed = parsed[key];
					break;
				}
			}
		}

		if (!Array.isArray(parsed)) {
			throw new Error("Response is not an array");
		}

		console.log("Parsed quiz:", parsed);

		// Validate and filter questions
		const validQuiz = parsed.filter((q) => {
			return (
				q.question &&
				typeof q.question === "string" &&
				Array.isArray(q.options) &&
				q.options.length === 4 &&
				q.options.every((opt) => typeof opt === "string") &&
				typeof q.correctIndex === "number" &&
				q.correctIndex >= 0 &&
				q.correctIndex <= 3
			);
		});

		if (validQuiz.length === 0) {
			throw new Error("No valid questions generated");
		}

		console.log(`Valid questions: ${validQuiz.length} out of ${parsed.length}`);

		return shuffleQuizOptions(validQuiz);
	} catch (parseError) {
		console.error("JSON Parse Error:", parseError);
		console.error("Content:", content);
		throw new Error("Failed to parse quiz response. Please try again.");
	}
};