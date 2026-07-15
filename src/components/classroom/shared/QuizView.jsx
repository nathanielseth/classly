import { useState, useEffect } from "react";
import {
	ChevronLeft,
	ChevronRight,
	Check,
	X,
	Trophy,
	Clock,
	RotateCcw,
	Loader2,
} from "lucide-react";
import { db } from "../../../lib/supabase";

export const QuizView = ({ material, userId, onBack }) => {
	const [questions, setQuestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedAnswers, setSelectedAnswers] = useState({});
	const [submitted, setSubmitted] = useState(false);
	const [result, setResult] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [previousResult, setPreviousResult] = useState(null);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			const [{ data: qs }, { data: prev }] = await Promise.all([
				db.quizQuestions.getByMaterial(material.id),
				db.quizAnswers.getByMaterial(material.id, userId),
			]);
			setQuestions(qs || []);
			if (prev) setPreviousResult(prev);
			setLoading(false);
		};
		load();
	}, [material.id, userId]);

	const handleSelect = (optionIndex) => {
		if (submitted) return;
		setSelectedAnswers((prev) => ({
			...prev,
			[currentIndex]: optionIndex,
		}));
	};

	const handleSubmit = async () => {
		if (Object.keys(selectedAnswers).length < questions.length) {
			if (
				!window.confirm(
					`You have ${questions.length - Object.keys(selectedAnswers).length} unanswered questions. Submit anyway?`,
				)
			)
				return;
		}

		setSubmitting(true);

		let score = 0;
		questions.forEach((q, i) => {
			if (selectedAnswers[i] === q.correct_index) score++;
		});

		const { data, error } = await db.quizAnswers.submit(
			material.id,
			userId,
			selectedAnswers,
			score,
			questions.length,
		);

		if (error) {
			alert("Failed to submit. Please try again.");
			setSubmitting(false);
			return;
		}

		setResult(data);
		setSubmitted(true);
		setSubmitting(false);
		setCurrentIndex(0);
	};

	const handleRetake = () => {
		setSelectedAnswers({});
		setSubmitted(false);
		setResult(null);
		setCurrentIndex(0);
		setPreviousResult(null);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Loader2 size={24} className="animate-spin text-classly-green" />
			</div>
		);
	}

	if (questions.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
					<Clock size={24} className="text-amber-600" />
				</div>
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Quiz not ready yet
				</h3>
				<p className="text-sm text-gray-500">
					Your instructor hasn't published questions yet.
				</p>
				<button
					onClick={onBack}
					className="mt-4 text-sm text-classly-green hover:underline"
				>
					Go back
				</button>
			</div>
		);
	}

	// Results screen
	if (submitted && result) {
		const pct = Math.round((result.score / result.total) * 100);
		const passed = pct >= 60;

		return (
			<div className="max-w-2xl mx-auto space-y-6">
				{/* Score card */}
				<div
					className={`rounded-2xl p-8 text-center ${passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
				>
					<div
						className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? "bg-green-100" : "bg-red-100"}`}
					>
						<Trophy
							size={36}
							className={passed ? "text-green-600" : "text-red-500"}
						/>
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-1">
						{passed ? "Great job!" : "Keep practicing!"}
					</h2>
					<p
						className="text-5xl font-bold my-4"
						style={{ color: passed ? "#16a34a" : "#dc2626" }}
					>
						{pct}%
					</p>
					<p className="text-gray-600">
						You got <strong>{result.score}</strong> out of{" "}
						<strong>{result.total}</strong> questions correct
					</p>
					<div className="flex gap-3 justify-center mt-6">
						<button
							onClick={handleRetake}
							className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
						>
							<RotateCcw size={16} />
							Retake Quiz
						</button>
						<button
							onClick={() => {
								setSubmitted(false);
								setCurrentIndex(0);
							}}
							className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 transition-colors text-sm font-medium"
						>
							Review Answers
						</button>
					</div>
				</div>

				{/* Answer review */}
				<div className="space-y-3">
					<h3 className="font-semibold text-gray-900">Answer Review</h3>
					{questions.map((q, i) => {
						const selected = selectedAnswers[i];
						const correct = q.correct_index;
						const isCorrect = selected === correct;

						return (
							<div
								key={q.id}
								className={`border rounded-xl p-4 ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
							>
								<div className="flex items-start gap-3 mb-3">
									<div
										className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrect ? "bg-green-500" : "bg-red-500"}`}
									>
										{isCorrect ? (
											<Check size={12} className="text-white" />
										) : (
											<X size={12} className="text-white" />
										)}
									</div>
									<p className="text-sm font-medium text-gray-900">
										{q.question}
									</p>
								</div>
								<div className="ml-9 space-y-1.5">
									{q.options.map((opt, oi) => (
										<div
											key={oi}
											className={`text-sm px-3 py-1.5 rounded-lg ${
												oi === correct
													? "bg-green-100 text-green-800 font-medium"
													: oi === selected && !isCorrect
														? "bg-red-100 text-red-800 line-through"
														: "text-gray-600"
											}`}
										>
											{String.fromCharCode(65 + oi)}. {opt}
											{oi === correct && " ✓"}
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	// Previous result banner
	const showPrevBanner = previousResult && !submitted;

	const currentQ = questions[currentIndex];
	const answeredCount = Object.keys(selectedAnswers).length;
	const progress = (answeredCount / questions.length) * 100;

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			{showPrevBanner && (
				<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
					<p className="text-sm text-amber-700">
						Previous score:{" "}
						<strong>
							{previousResult.score}/{previousResult.total}
						</strong>{" "}
						({Math.round((previousResult.score / previousResult.total) * 100)}%)
					</p>
					<span className="text-xs text-amber-600">
						Retaking will overwrite
					</span>
				</div>
			)}

			{/* Progress */}
			<div>
				<div className="flex items-center justify-between text-sm text-gray-500 mb-2">
					<span>
						Question {currentIndex + 1} of {questions.length}
					</span>
					<span>{answeredCount} answered</span>
				</div>
				<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
					<div
						className="h-full bg-classly-green rounded-full transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			{/* Question dots */}
			<div className="flex gap-1.5 flex-wrap">
				{questions.map((_, i) => (
					<button
						key={i}
						onClick={() => setCurrentIndex(i)}
						className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
							i === currentIndex
								? "bg-classly-green text-white"
								: selectedAnswers[i] !== undefined
									? "bg-classly-green/20 text-classly-green"
									: "bg-gray-100 text-gray-500 hover:bg-gray-200"
						}`}
					>
						{i + 1}
					</button>
				))}
			</div>

			{/* Question card */}
			<div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
				<p className="text-lg font-semibold text-gray-900 mb-6">
					{currentQ.question}
				</p>

				<div className="space-y-3">
					{currentQ.options.map((option, oi) => {
						const isSelected = selectedAnswers[currentIndex] === oi;
						return (
							<button
								key={oi}
								onClick={() => handleSelect(oi)}
								className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
									isSelected
										? "border-classly-green bg-classly-green/5 text-classly-green"
										: "border-gray-200 hover:border-gray-300 text-gray-700"
								}`}
							>
								<span
									className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs mr-3 shrink-0 ${
										isSelected
											? "bg-classly-green text-white"
											: "bg-gray-100 text-gray-500"
									}`}
								>
									{String.fromCharCode(65 + oi)}
								</span>
								{option}
							</button>
						);
					})}
				</div>
			</div>

			{/* Navigation */}
			<div className="flex items-center justify-between">
				<button
					onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
					disabled={currentIndex === 0}
					className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
				>
					<ChevronLeft size={16} />
					Previous
				</button>

				{currentIndex < questions.length - 1 ? (
					<button
						onClick={() =>
							setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
						}
						className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 text-sm font-medium"
					>
						Next
						<ChevronRight size={16} />
					</button>
				) : (
					<button
						onClick={handleSubmit}
						disabled={submitting}
						className="flex items-center gap-2 px-6 py-2 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 text-sm font-medium disabled:opacity-50"
					>
						{submitting ? (
							<>
								<Loader2 size={16} className="animate-spin" /> Submitting...
							</>
						) : (
							"Submit Quiz"
						)}
					</button>
				)}
			</div>
		</div>
	);
};