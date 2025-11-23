import React, { useState, useRef, useEffect } from "react";
import {
	Sparkles,
	FileText,
	Brain,
	BarChart3,
	Send,
	Paperclip,
	X,
	Zap,
	CheckCircle2,
	TrendingUp,
	AlertCircle,
	Square,
} from "lucide-react";

// Groq API streaming function
const getChatCompletionStream = async (messages, onChunk) => {
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
				messages,
				temperature: 0.7,
				max_tokens: 2048,
				stream: true,
			}),
		}
	);

	if (!response.ok) {
		throw new Error("Failed to get response from Groq API");
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
				} catch (e) {
					// Skip invalid JSON
				}
			}
		}
	}
};

const AIAssistant = () => {
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			content:
				"Hi! I'm your AI study assistant powered by Groq. I can help you summarize documents, generate practice quizzes, analyze your performance, and answer questions about your coursework. How can I help you today?",
			timestamp: new Date(),
		},
	]);
	const [input, setInput] = useState("");
	const [attachedFiles, setAttachedFiles] = useState([]);
	const [isTyping, setIsTyping] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState(null);
	const messagesEndRef = useRef(null);
	const fileInputRef = useRef(null);
	const stopStreamingRef = useRef(false);
	const typingIntervalRef = useRef(null);

	useEffect(() => {
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
	}, []);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isTyping]);

	const extractTextFromPDF = async (file) => {
		if (!window.pdfjsLib) {
			throw new Error(
				"PDF library still loading. Please try again in a moment."
			);
		}
		const arrayBuffer = await file.arrayBuffer();
		const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
			.promise;
		let fullText = "";

		for (let i = 1; i <= pdf.numPages; i++) {
			const page = await pdf.getPage(i);
			const textContent = await page.getTextContent();
			const pageText = textContent.items.map((item) => item.str).join(" ");
			fullText += pageText + "\n\n";
		}

		return fullText;
	};

	const readFileAsText = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target.result);
			reader.onerror = reject;
			reader.readAsText(file);
		});
	};

	const handleStop = () => {
		stopStreamingRef.current = true;
		setIsTyping(false);
		setIsGenerating(false);
		if (typingIntervalRef.current) {
			clearInterval(typingIntervalRef.current);
			typingIntervalRef.current = null;
		}
	};

	const handleSend = async () => {
		if (!input.trim() && attachedFiles.length === 0) return;

		setError(null);
		stopStreamingRef.current = false;
		let userContent = input || "";

		// Read file contents if any
		if (attachedFiles.length > 0) {
			try {
				const fileContents = await Promise.all(
					attachedFiles.map(async (file) => {
						let text = "";
						if (file.type === "application/pdf") {
							text = await extractTextFromPDF(file);
						} else {
							text = await readFileAsText(file);
						}
						return `\n\n[File: ${file.name}]\n${text}`;
					})
				);
				userContent += fileContents.join("");
			} catch (fileError) {
				setError("Failed to read file contents. Please try again.");
				console.error("File read error:", fileError);
				return;
			}
		}

		const newMessage = {
			role: "user",
			content: input,
			files: attachedFiles,
			timestamp: new Date(),
		};

		setMessages([...messages, newMessage]);
		setInput("");
		setAttachedFiles([]);
		setIsTyping(true);

		try {
			// Build conversation history for context
			const conversationHistory = [
				{
					role: "system",
					content:
						"You are an intelligent academic assistant helping students with their coursework. Provide clear, accurate, and helpful responses. When analyzing documents or answering questions, be thorough but concise.",
				},
				...messages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
				{
					role: "user",
					content: userContent,
				},
			];

			// Create placeholder message
			const streamingMessage = {
				role: "assistant",
				content: "",
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, streamingMessage]);
			setIsTyping(false);
			setIsGenerating(true);

			// Buffer for smooth character-by-character display
			let buffer = "";
			let currentContent = "";

			typingIntervalRef.current = setInterval(() => {
				if (stopStreamingRef.current) {
					clearInterval(typingIntervalRef.current);
					typingIntervalRef.current = null;
					return;
				}

				if (buffer.length > 0) {
					const char = buffer[0];
					buffer = buffer.slice(1);
					currentContent += char;

					setMessages((prev) => {
						const newMessages = [...prev];
						newMessages[newMessages.length - 1] = {
							...streamingMessage,
							content: currentContent,
						};
						return newMessages;
					});
				}
			}, 25);

			await getChatCompletionStream(conversationHistory, (chunk) => {
				if (!stopStreamingRef.current) {
					buffer += chunk;
				}
			});

			const waitForBuffer = setInterval(() => {
				if (buffer.length === 0 || stopStreamingRef.current) {
					clearInterval(typingIntervalRef.current);
					clearInterval(waitForBuffer);
					typingIntervalRef.current = null;
					setIsGenerating(false);

					if (!stopStreamingRef.current) {
						setMessages((prev) => {
							const newMessages = [...prev];
							newMessages[newMessages.length - 1] = {
								...streamingMessage,
								content: currentContent + buffer,
							};
							return newMessages;
						});
					}
				}
			}, 100);
		} catch (apiError) {
			setIsTyping(false);
			setIsGenerating(false);
			if (typingIntervalRef.current) {
				clearInterval(typingIntervalRef.current);
				typingIntervalRef.current = null;
			}
			const errorMessage =
				apiError.message ||
				"Failed to get response. Please check your API key and try again.";
			setError(errorMessage);
			console.error("AI Error:", apiError);

			setMessages((prev) => prev.filter((msg) => msg.content !== ""));
		}
	};

	const handleFileSelect = (e) => {
		const files = Array.from(e.target.files);
		setAttachedFiles([...attachedFiles, ...files]);
	};

	const removeFile = (index) => {
		setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
	};

	const quickActions = [
		{
			icon: FileText,
			label: "Summarize this document",
			prompt: "Can you summarize this document for me?",
		},
		{
			icon: Brain,
			label: "Generate practice quiz",
			prompt:
				"Generate a practice quiz with 5 questions based on my recent materials",
		},
		{
			icon: CheckCircle2,
			label: "Check my work",
			prompt: "Can you review my work and provide constructive feedback?",
		},
		{
			icon: TrendingUp,
			label: "Explain this concept",
			prompt: "Can you explain this concept in simpler terms?",
		},
	];

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Sparkles className="text-classly-green" size={28} />
						AI Study Assistant
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Powered by Groq • Lightning-fast AI responses
					</p>
				</div>
			</div>

			{/* Error Banner */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
					<div className="flex-1">
						<p className="text-sm text-red-800 font-medium">Error</p>
						<p className="text-sm text-red-600 mt-1">{error}</p>
					</div>
					<button
						onClick={() => setError(null)}
						className="text-red-400 hover:text-red-600 cursor-pointer"
					>
						<X size={18} />
					</button>
				</div>
			)}

			{/* Feature Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<FeatureCard
					icon={FileText}
					title="Smart Summaries"
					description="Get concise summaries of lectures and readings"
					color="green"
				/>
				<FeatureCard
					icon={Brain}
					title="Quiz Generator"
					description="Create practice tests from your materials"
					color="purple"
				/>
				<FeatureCard
					icon={CheckCircle2}
					title="Work Review"
					description="Get feedback and suggestions on assignments"
					color="blue"
				/>
				<FeatureCard
					icon={BarChart3}
					title="Performance Insights"
					description="Track your progress and identify areas to improve"
					color="gold"
				/>
			</div>

			{/* Chat Interface */}
			<div
				className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
				style={{ height: "600px", display: "flex", flexDirection: "column" }}
			>
				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{messages.map((message, index) => (
						<Message key={index} message={message} />
					))}

					{isTyping && (
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-full bg-classly-green/10 flex items-center justify-center shrink-0">
								<Sparkles size={16} className="text-classly-green" />
							</div>
							<div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
								<div className="flex gap-1">
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
									<div
										className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
										style={{ animationDelay: "0.2s" }}
									></div>
									<div
										className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
										style={{ animationDelay: "0.4s" }}
									></div>
								</div>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Quick Actions */}
				{messages.length === 1 && (
					<div className="px-6 pb-4">
						<p className="text-xs font-medium text-gray-500 mb-3">
							Quick Actions
						</p>
						<div className="grid grid-cols-2 gap-2">
							{quickActions.map((action, index) => (
								<button
									key={index}
									onClick={() => setInput(action.prompt)}
									className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left group"
								>
									<action.icon
										size={16}
										className="text-gray-400 group-hover:text-classly-green transition-colors"
									/>
									<span className="truncate">{action.label}</span>
								</button>
							))}
						</div>
					</div>
				)}

				{/* Attached Files */}
				{attachedFiles.length > 0 && (
					<div className="px-6 pb-2">
						<div className="flex flex-wrap gap-2">
							{attachedFiles.map((file, index) => (
								<div
									key={index}
									className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm"
								>
									<Paperclip size={14} className="text-blue-600" />
									<span className="text-blue-700 truncate max-w-xs">
										{file.name}
									</span>
									<button
										onClick={() => removeFile(index)}
										className="text-blue-600 hover:text-blue-800 cursor-pointer"
									>
										<X size={14} />
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Input Area */}
				<div className="border-t border-gray-200 p-4 bg-gray-50">
					<div className="flex items-end gap-2">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileSelect}
							multiple
							accept=".pdf,.doc,.docx,.txt"
							className="hidden"
						/>
						<button
							onClick={() => fileInputRef.current?.click()}
							className="p-2.5 text-gray-400 hover:text-classly-green hover:bg-white rounded-lg transition-all cursor-pointer"
							title="Attach files"
							disabled={isTyping || isGenerating}
						>
							<Paperclip size={20} />
						</button>

						<div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl focus-within:border-classly-green focus-within:ring-2 focus-within:ring-classly-green/20 transition-all">
							<input
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyPress={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleSend();
									}
								}}
								placeholder="Ask me anything about your coursework..."
								className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400"
								disabled={isTyping || isGenerating}
							/>
						</div>

						{isGenerating ? (
							<button
								onClick={handleStop}
								className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all cursor-pointer"
								title="Stop generating"
							>
								<Square size={20} fill="currentColor" />
							</button>
						) : (
							<button
								onClick={handleSend}
								disabled={isTyping || isGenerating}
								className="p-2.5 bg-classly-green text-white rounded-xl hover:bg-classly-green/90 disabled:bg-gray-200 disabled:text-gray-400 transition-all cursor-pointer disabled:cursor-not-allowed"
							>
								<Send size={20} />
							</button>
						)}
					</div>

					<p className="text-xs text-gray-400 mt-2 px-1">
						<Zap size={12} className="inline mr-1" />
						Powered by Groq AI • Supports PDF, TXT, DOC, DOCX files
					</p>
				</div>
			</div>
		</div>
	);
};

const FeatureCard = ({ icon: IconComponent, title, description, color }) => {
	const colorClasses = {
		green: "bg-green-50 text-classly-green",
		purple: "bg-purple-50 text-purple-600",
		blue: "bg-blue-50 text-blue-600",
		gold: "bg-orange-50 text-classly-gold",
	};

	return (
		<div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-300 group cursor-pointer">
			<div
				className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
			>
				<IconComponent size={20} />
			</div>
			<h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
			<p className="text-sm text-gray-500 leading-relaxed">{description}</p>
		</div>
	);
};

const Message = ({ message }) => {
	const isAssistant = message.role === "assistant";

	return (
		<div
			className={`flex items-start gap-3 ${
				isAssistant ? "" : "flex-row-reverse"
			}`}
		>
			{/* Avatar */}
			<div
				className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
					isAssistant ? "bg-classly-green/10" : "bg-blue-500"
				}`}
			>
				{isAssistant ? (
					<Sparkles size={16} className="text-classly-green" />
				) : (
					<span className="text-white text-sm font-medium">You</span>
				)}
			</div>

			{/* Message Content */}
			<div className={`flex-1 ${isAssistant ? "" : "flex justify-end"}`}>
				<div
					className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 ${
						isAssistant
							? "bg-gray-100 text-gray-900 rounded-tl-sm"
							: "bg-classly-green text-white rounded-tr-sm"
					}`}
				>
					<p className="text-sm leading-relaxed whitespace-pre-wrap">
						{message.content}
					</p>

					{/* Attached Files */}
					{message.files && message.files.length > 0 && (
						<div className="flex flex-wrap gap-2 mt-2">
							{message.files.map((file, index) => (
								<div
									key={index}
									className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded text-xs"
								>
									<Paperclip size={12} />
									<span className="truncate max-w-[150px]">{file.name}</span>
								</div>
							))}
						</div>
					)}

					<span
						className={`text-[10px] mt-1.5 block ${
							isAssistant ? "text-gray-400" : "text-white/70"
						}`}
					>
						{message.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
			</div>
		</div>
	);
};

export default AIAssistant;
