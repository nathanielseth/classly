import React, { useState, useEffect } from "react";
import {
	Sparkles,
	MessageSquare,
	FileText,
	Brain,
	Layers,
	X,
} from "lucide-react";
import ChatTab from "./ChatTab";
import FlashcardTab from "./FlashcardTab";
import QuizTab from "./QuizTab";
import { loadPDFLib } from "../../lib/api/aiApi";

const AIAssistant = () => {
	const [activeMode, setActiveMode] = useState("chat");

	useEffect(() => {
		loadPDFLib();
	}, []);

	const modes = [
		{ id: "chat", label: "AI Assistant", icon: MessageSquare },
		{ id: "summary", label: "Smart Summary", icon: FileText },
		{ id: "quiz", label: "Quiz Generator", icon: Brain },
		{ id: "flashcards", label: "Flashcards", icon: Layers },
	];

	return (
		<div className="max-w-7xl mx-auto space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Sparkles className="text-classly-green" size={28} />
						AI Study Tools
					</h1>
					<p className="text-sm text-gray-500 mt-1">
						Generate quizzes, flashcards, and get AI assistance for your
						coursework
					</p>
				</div>
			</div>

			{/* Mode Toggle */}
			<div className="bg-white rounded-xl border border-gray-200 p-2 flex gap-2 shadow-sm">
				{modes.map((mode) => {
					const Icon = mode.icon;
					const isActive = activeMode === mode.id;
					const isComingSoon = mode.id === "summary";

					return (
						<button
							key={mode.id}
							onClick={() => !isComingSoon && setActiveMode(mode.id)}
							disabled={isComingSoon}
							className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
								isActive
									? "bg-classly-green text-white shadow-sm"
									: isComingSoon
									? "text-gray-400 cursor-not-allowed"
									: "text-gray-600 hover:bg-gray-50"
							}`}
						>
							<Icon size={18} />
							<span className="hidden sm:inline">{mode.label}</span>
							{isComingSoon && (
								<span className="hidden md:inline text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-1">
									Soon
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Content Area */}
			<div className="min-h-[600px]">
				{activeMode === "chat" && <ChatTab />}
				{activeMode === "summary" && <SummaryPlaceholder />}
				{activeMode === "quiz" && <QuizTab />}
				{activeMode === "flashcards" && <FlashcardTab />}
			</div>
		</div>
	);
};

const SummaryPlaceholder = () => {
	return (
		<div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
			<div className="max-w-md mx-auto">
				<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<FileText size={32} className="text-gray-400" />
				</div>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Smart Summary
				</h3>
				<p className="text-gray-500 mb-4">
					AI-powered summaries of your course materials will be available soon.
				</p>
				<div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
					<Sparkles size={16} />
					Coming Soon
				</div>
			</div>
		</div>
	);
};

export default AIAssistant;
