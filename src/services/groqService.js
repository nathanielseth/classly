import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
	apiKey: import.meta.env.VITE_GROQ_API_KEY,
	dangerouslyAllowBrowser: true, // Required for client-side usage
});

/**
 * Send a message with streaming response
 * @param {Array} messages - Array of message objects
 * @param {Function} onChunk - Callback for each chunk of text
 * @param {string} model - Model to use
 */
export const getChatCompletionStream = async (
	messages,
	onChunk,
	model = "llama-3.3-70b-versatile"
) => {
	try {
		const stream = await groq.chat.completions.create({
			messages,
			model,
			temperature: 0.7,
			max_tokens: 2048,
			top_p: 1,
			stream: true,
		});

		let fullResponse = "";

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content || "";
			fullResponse += content;
			onChunk(content, fullResponse);
		}

		return fullResponse;
	} catch (error) {
		console.error("Groq Streaming Error:", error);
		throw new Error(
			error.message || "Failed to get streaming response from AI assistant"
		);
	}
};

/**
 * Analyze a document and provide summary/insights
 * @param {string} documentText - The text content to analyze
 * @param {string} task - What to do with the document (summarize, quiz, etc)
 */
export const analyzeDocument = async (documentText, task = "summarize") => {
	const prompts = {
		summarize: `Please provide a clear and concise summary of the following document, highlighting the key points and main ideas:\n\n${documentText}`,
		quiz: `Based on the following document, generate 5 multiple-choice questions to test understanding of the key concepts. Format each question with 4 options (A, B, C, D) and indicate the correct answer:\n\n${documentText}`,
		explain: `Please explain the key concepts in the following document in simpler terms, as if teaching it to a student:\n\n${documentText}`,
	};

	const messages = [
		{
			role: "system",
			content:
				"You are an intelligent academic assistant helping students understand their coursework better. Provide clear, accurate, and helpful responses.",
		},
		{
			role: "user",
			content: prompts[task] || documentText,
		},
	];

	return await getChatCompletionStream(messages, () => {});
};

/**
 * Get available models
 */
export const GROQ_MODELS = {
	LLAMA_70B: "llama-3.3-70b-versatile", // Best for complex reasoning
	LLAMA_8B: "llama-3.1-8b-instant", // Fastest responses
	WHISPER: "whisper-large-v3-turbo", // Good balance
};
