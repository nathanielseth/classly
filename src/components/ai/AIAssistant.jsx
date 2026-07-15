import React, { useEffect, useState } from "react";
import { Sparkles, MessageSquare, Brain, Layers } from "lucide-react";
import ChatTab from "./ChatTab";
import FlashcardTab from "./FlashcardTab";
import QuizTab from "./QuizTab";
import { loadPDFLib } from "../../lib/api/aiApi";

const AIAssistant = ({ userRole }) => {
	const [activeMode, setActiveMode] = useState("chat");

	useEffect(() => {
		loadPDFLib();
	}, []);

	const allModes = [
		{ id: "chat", label: "AI Assistant", icon: MessageSquare },
		{ id: "quiz", label: "Quiz Generator", icon: Brain },
		{ id: "flashcards", label: "Flashcards", icon: Layers },
	];

	const modes = allModes.filter((mode) => {
		if (mode.id === "chat") return true;
		if (mode.id === "quiz") return userRole !== "admin";
		if (mode.id === "flashcards")
			return userRole !== "instructor" && userRole !== "admin";
		return true;
	});

	const effectiveMode = modes.some((m) => m.id === activeMode)
		? activeMode
		: "chat";

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
						{userRole === "admin"
							? "Get AI assistance for managing the platform"
							: userRole === "instructor"
								? "Generate quizzes and get AI assistance for your classes"
								: "Generate quizzes, flashcards, and get AI assistance for your coursework"}
					</p>
				</div>
			</div>

			{/* Mode Toggle */}
			<div className="bg-white rounded-xl border border-gray-200 p-2 flex gap-2 shadow-sm">
				{modes.map((mode) => {
					const Icon = mode.icon;
					const isActive = effectiveMode === mode.id;

					return (
						<button
							key={mode.id}
							onClick={() => setActiveMode(mode.id)}
							className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all cursor-pointer ${
								isActive
									? "bg-classly-green text-white shadow-sm"
									: "text-gray-600 hover:bg-gray-50"
							}`}
						>
							<Icon size={18} />
							<span className="hidden sm:inline">{mode.label}</span>
						</button>
					);
				})}
			</div>

			{/* Content Area */}
			<div className="min-h-150">
				{effectiveMode === "chat" && <ChatTab userRole={userRole} />}
				{effectiveMode === "quiz" && userRole !== "admin" && (
					<QuizTab userRole={userRole} />
				)}
				{effectiveMode === "flashcards" &&
					userRole !== "instructor" &&
					userRole !== "admin" && <FlashcardTab userRole={userRole} />}
			</div>
		</div>
	);
};

export default AIAssistant;