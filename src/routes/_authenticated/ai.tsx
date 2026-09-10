import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, MessageSquare, Brain, Layers } from "lucide-react";
import { ChatPanel } from "#/components/ai/AiChatPanel";
import { QuizPanel } from "@/components/ai/QuizPanel";
import { FlashcardPanel } from "@/components/ai/FlashcardPanel";

export const Route = createFileRoute("/_authenticated/ai")({
  component: AIAssistantPage,
});

type Mode = "chat" | "quiz" | "flashcards";

const ALL_MODES: { id: Mode; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "AI Assistant", icon: MessageSquare },
  { id: "quiz", label: "Quiz Generator", icon: Brain },
  { id: "flashcards", label: "Flashcards", icon: Layers },
];

function AIAssistantPage() {
  const { userState } = Route.useRouteContext();
  const [activeMode, setActiveMode] = useState<Mode>("chat");

  if (userState.status !== "approved") return null;
  const userRole = userState.profile.role;

  const modes = ALL_MODES.filter((mode) => {
    if (mode.id === "chat") return true;
    if (mode.id === "quiz") return userRole !== "admin";
    return userRole !== "instructor" && userRole !== "admin";
  });

  const effectiveMode = modes.some((m) => m.id === activeMode) ? activeMode : "chat";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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

      <div className="bg-white rounded-xl border border-gray-200 p-2 flex gap-2 shadow-sm">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = effectiveMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
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

      <div className="min-h-150">
        {effectiveMode === "chat" && <ChatPanel userRole={userRole} />}
        {effectiveMode === "quiz" && userRole !== "admin" && (
          <QuizPanel userRole={userRole} />
        )}
        {effectiveMode === "flashcards" &&
          userRole !== "instructor" &&
          userRole !== "admin" && <FlashcardPanel />}
      </div>
    </div>
  );
}