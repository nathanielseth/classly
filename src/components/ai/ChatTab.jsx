import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Paperclip, X, Square } from "lucide-react";
import {
	getChatCompletionStream,
	processFiles,
	AI_MODELS,
} from "../../lib/api/aiApi";

const ChatTab = ({ userRole }) => {
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			content: "Hi! How can I help you with your coursework today?",
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
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isTyping]);

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

		if (attachedFiles.length > 0) {
			try {
				const filesContent = await processFiles(attachedFiles);
				userContent += filesContent;
			} catch {
				setError("Failed to read file contents. Please try again.");
				return;
			}
		}

		const newMessage = {
			role: "user",
			content: input,
			files: attachedFiles,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, newMessage]);
		setInput("");
		setAttachedFiles([]);
		setIsTyping(true);

		try {
			const systemPrompt =
				userRole === "instructor"
					? "You are an intelligent teaching assistant helping university instructors prepare lessons, create assessments, explain concepts clearly, and manage their classes. Provide practical, educator-focused responses."
					: userRole === "admin"
						? "You are an intelligent system assistant helping a university LMS administrator manage users, subjects, and platform operations. Provide clear, administrative guidance."
						: "You are an intelligent academic assistant helping students with their coursework. Provide clear, accurate, and helpful responses. Be concise but thorough.";

			const conversationHistory = [
				{
					role: "system",
					content: systemPrompt,
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

			const streamingMessage = {
				role: "assistant",
				content: "",
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, streamingMessage]);
			setIsTyping(false);
			setIsGenerating(true);

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
			}, 15);

			await getChatCompletionStream(
				conversationHistory,
				AI_MODELS.CHAT,
				(chunk) => {
					if (!stopStreamingRef.current) {
						buffer += chunk;
					}
				},
			);

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
			setError(apiError.message || "Failed to get response. Please try again.");
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

	return (
		<div
			className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
			style={{ height: "600px" }}
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

			{/* Error Message */}
			{error && (
				<div className="px-6 py-3 bg-red-50 border-t border-red-200 flex items-center justify-between">
					<p className="text-sm text-red-600">{error}</p>
					<button
						onClick={() => setError(null)}
						className="text-red-400 hover:text-red-600"
					>
						<X size={16} />
					</button>
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
									className="text-blue-600 hover:text-blue-800"
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
						className="p-2.5 text-gray-400 hover:text-classly-green hover:bg-white rounded-lg transition-all"
						disabled={isTyping || isGenerating}
					>
						<Paperclip size={20} />
					</button>

					<div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl focus-within:border-classly-green focus-within:ring-2 focus-within:ring-classly-green/20">
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
							className="flex-1 px-4 py-3 bg-transparent focus:outline-none"
							disabled={isTyping || isGenerating}
						/>
					</div>

					{isGenerating ? (
						<button
							onClick={handleStop}
							className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
						>
							<Square size={20} fill="currentColor" />
						</button>
					) : (
						<button
							onClick={handleSend}
							disabled={isTyping || isGenerating}
							className="p-2.5 bg-classly-green text-white rounded-xl hover:bg-classly-green/90 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
						>
							<Send size={20} />
						</button>
					)}
				</div>
			</div>
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

					{message.files && message.files.length > 0 && (
						<div className="flex flex-wrap gap-2 mt-2">
							{message.files.map((file, index) => (
								<div
									key={index}
									className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded text-xs"
								>
									<Paperclip size={12} />
									<span className="truncate max-w-37.5">{file.name}</span>
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

export default ChatTab;