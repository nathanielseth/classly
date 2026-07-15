import { useState, useRef, useEffect } from "react";
import {
	X,
	Loader2,
	Sparkles,
	Upload,
	Trash2,
	Plus,
	ChevronUp,
	ChevronDown,
	Check,
	AlertCircle,
	RefreshCw,
} from "lucide-react";
import {
	generateQuizFromContent,
	extractTextFromPDF,
	readFileAsText,
	loadPDFLib,
} from "../../../lib/api/aiApi";
import { db } from "../../../lib/supabase";

// mode: "generate" | "digitize" | "manual"
//  - generate: read an attached module/lecture file, create a NEW quiz
//    material in the same subject, save questions to that new material.
//  - digitize: read an attached quiz PDF, save extracted questions to
//    THIS material so students can answer it in-app.
//  - manual: no file attached; instructor builds/edits questions by hand
//    (optionally generating from an uploaded file first), saved to THIS
//    material.
export const QuizBuilderModal = ({
	material,
	subjectId,
	mode = "manual",
	onClose,
	onSaved,
}) => {
	const [questions, setQuestions] = useState([]);
	const [generating, setGenerating] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [step, setStep] = useState("upload"); // "upload" | "review"
	const fileInputRef = useRef(null);

	// Re-opening the builder on a quiz that already has saved questions
	// (post-digitize or manually built) should let the instructor edit
	// what's there, not start from a blank upload screen. "generate"
	// mode is exempt: it always creates a brand-new quiz material, so
	// there's nothing on `material.id` to load.
	useEffect(() => {
		if (mode === "generate") return;
		let cancelled = false;

		(async () => {
			const { data } = await db.quizQuestions.getByMaterial(material.id);
			if (cancelled || !data || data.length === 0) return;
			setQuestions(
				data.map((q) => ({
					id: q.id,
					question: q.question,
					options: q.options,
					correctIndex: q.correct_index,
				})),
			);
			setStep("review");
		})();

		return () => {
			cancelled = true;
		};
	}, [material.id, mode]);

	const runGeneration = async (file) => {
		setGenerating(true);
		setError("");

		try {
			loadPDFLib();

			if (file.type === "application/pdf") {
				await new Promise((resolve) => {
					const check = setInterval(() => {
						if (window.pdfjsLib) {
							clearInterval(check);
							resolve();
						}
					}, 100);
					setTimeout(() => {
						clearInterval(check);
						resolve();
					}, 5000);
				});
			}

			let content = "";
			if (file.type === "application/pdf") {
				content = await extractTextFromPDF(file);
			} else {
				content = await readFileAsText(file);
			}

			if (!content.trim()) {
				throw new Error(
					"Could not extract text from file. Try a different file.",
				);
			}

			const generated = await generateQuizFromContent(content, material.title);
			setQuestions(generated.map((q, i) => ({ ...q, id: `q_${i}` })));
			setStep("review");
		} catch (err) {
			if (
				err.message?.includes("failed_generation") ||
				err.message?.includes("Failed to generate JSON")
			) {
				setError(
					"The document may be too long or complex. Try uploading a shorter file.",
				);
			} else {
				setError(err.message || "Failed to generate quiz. Try again.");
			}
		} finally {
			setGenerating(false);
		}
	};

	const handleFileUpload = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await runGeneration(file);
	};

	const handleUseExistingFile = async () => {
		if (!material.file_url) return;

		setGenerating(true);
		setError("");

		try {
			const response = await fetch(material.file_url);
			const blob = await response.blob();
			const file = new File([blob], material.file_name || "module.pdf", {
				type: blob.type,
			});
			// runGeneration sets/clears its own generating & error state,
			// so hand off to it directly.
			await runGeneration(file);
		} catch (err) {
			setError(err.message || "Failed to generate from attached file.");
			setGenerating(false);
		}
	};

	const handleQuestionChange = (id, field, value) => {
		setQuestions((prev) =>
			prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
		);
	};

	const handleOptionChange = (id, optionIndex, value) => {
		setQuestions((prev) =>
			prev.map((q) =>
				q.id === id
					? {
							...q,
							options: q.options.map((o, i) => (i === optionIndex ? value : o)),
						}
					: q,
			),
		);
	};

	const handleDeleteQuestion = (id) => {
		setQuestions((prev) => prev.filter((q) => q.id !== id));
	};

	const handleAddQuestion = () => {
		setQuestions((prev) => [
			...prev,
			{
				id: `q_${Date.now()}`,
				question: "",
				options: ["", "", "", ""],
				correctIndex: 0,
			},
		]);
	};

	const handleSave = async () => {
		// Validate
		for (const q of questions) {
			if (!q.question.trim()) {
				setError("All questions must have text.");
				return;
			}
			if (q.options.some((o) => !o.trim())) {
				setError("All options must be filled in.");
				return;
			}
		}

		setSaving(true);
		setError("");

		try {
			if (mode === "generate") {
				if (!subjectId) {
					throw new Error(
						"Missing subject context — can't create a new quiz material.",
					);
				}

				// Create a NEW quiz material in the same subject rather than
				// overwriting the source module's own questions.
				const { data: newMaterial, error: createError } =
					await db.materials.create({
						subject_id: subjectId,
						title: `${material.title} — Quiz`,
						description: `Auto-generated quiz from ${material.title}`,
						type: "quiz",
						max_points: questions.length * 10,
						published: false, // draft until instructor reviews
						allow_late_submission: true,
						topic_id: material.topic_id || null,
					});
				if (createError) throw createError;

				const { error: saveError } = await db.quizQuestions.saveAll(
					newMaterial.id,
					questions,
				);
				if (saveError) throw saveError;

				onSaved(newMaterial.title);
			} else {
				// "digitize" or "manual" — save straight to this material
				const { error: saveError } = await db.quizQuestions.saveAll(
					material.id,
					questions,
				);
				if (saveError) throw saveError;

				onSaved(material.title);
			}
		} catch (err) {
			setError(err.message || "Failed to save quiz.");
			setSaving(false);
		}
	};

	const uploadDescription =
		mode === "generate"
			? "Upload a module or lecture file and the AI will generate 10 quiz questions from it, saved as a new quiz in this subject. You can review and edit before saving."
			: mode === "digitize"
				? "AI will read your quiz PDF and convert the questions into a digital format students can answer directly in the app."
				: "Upload a file to generate questions, or add them manually below.";

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
					<div>
						<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
							<Sparkles size={20} className="text-classly-green" />
							{mode === "digitize" ? "Digitize Quiz" : "Quiz Builder"}
						</h2>
						<p className="text-sm text-gray-500 mt-0.5">{material.title}</p>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X size={20} />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-6">
					{step === "upload" && (
						<div className="space-y-4">
							{generating ? (
								<div className="flex flex-col items-center justify-center py-16 gap-4">
									<div className="w-12 h-12 border-4 border-classly-green border-t-transparent rounded-full animate-spin" />
									<p className="text-gray-600 font-medium">
										{mode === "digitize"
											? "Reading quiz and extracting questions..."
											: "Generating quiz questions..."}
									</p>
									<p className="text-sm text-gray-400">
										This takes about 10–15 seconds
									</p>
								</div>
							) : (
								<>
									<p className="text-sm text-gray-600">{uploadDescription}</p>

									{/* Digitize mode: file is already attached, surface a single
									    clear action instead of the generic "use existing file"
									    card used by generate mode. */}
									{mode === "digitize" && material.file_url && (
										<div className="border border-purple-200 bg-purple-50 rounded-xl p-4">
											<p className="text-sm font-medium text-gray-700 mb-1">
												Quiz PDF detected
											</p>
											<p className="text-xs text-gray-500 mb-3 truncate">
												{material.file_name}
											</p>
											<button
												onClick={handleUseExistingFile}
												className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
											>
												<Sparkles size={16} />
												Digitize this Quiz
											</button>
										</div>
									)}

									{/* Generate mode: offer the already-attached module file */}
									{mode === "generate" && material.file_url && (
										<div className="border border-classly-green/30 bg-green-50 rounded-xl p-4">
											<p className="text-sm font-medium text-gray-700 mb-3">
												Use attached file
											</p>
											<button
												onClick={handleUseExistingFile}
												className="flex items-center gap-3 w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
											>
												<div className="p-2 bg-blue-50 rounded-lg shrink-0">
													<Upload size={16} className="text-blue-600" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-gray-900 truncate">
														{material.file_name}
													</p>
													<p className="text-xs text-gray-500">
														Already attached to this material
													</p>
												</div>
												<span className="text-sm text-classly-green font-medium shrink-0">
													Generate →
												</span>
											</button>
										</div>
									)}

									{/* Manual mode (or a fallback for any mode): let the
									    instructor upload a different/additional file */}
									{mode !== "digitize" && (
										<div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-classly-green transition-colors">
											<input
												ref={fileInputRef}
												type="file"
												className="hidden"
												accept=".pdf,.txt,.doc,.docx"
												onChange={handleFileUpload}
											/>
											<Upload
												size={32}
												className="text-gray-400 mx-auto mb-3"
											/>
											<p className="text-sm font-medium text-gray-700 mb-1">
												{material.file_url
													? "Upload a different file"
													: "Upload a file"}
											</p>
											<p className="text-xs text-gray-500 mb-4">
												PDF, TXT, DOC, DOCX supported
											</p>
											<button
												onClick={() => fileInputRef.current?.click()}
												className="px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors"
											>
												Choose File
											</button>
										</div>
									)}

									{/* Manual mode with no file at all: let them skip straight
									    to building questions by hand */}
									{mode === "manual" && (
										<button
											onClick={() => {
												setError("");
												setStep("review");
											}}
											className="w-full text-sm text-gray-500 hover:text-classly-green underline underline-offset-2"
										>
											Skip — build questions manually
										</button>
									)}
								</>
							)}

							{error && (
								<div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
									<AlertCircle size={16} />
									{error}
								</div>
							)}
						</div>
					)}

					{step === "review" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<p className="text-sm text-gray-600">
									{questions.length} questions — review and edit before saving
								</p>
								<button
									onClick={() => {
										setStep("upload");
										setError("");
									}}
									className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
								>
									<RefreshCw size={14} />
									Regenerate
								</button>
							</div>

							{questions.map((q, qIndex) => (
								<div
									key={q.id}
									className="border border-gray-200 rounded-xl p-4 space-y-3"
								>
									<div className="flex items-start gap-3">
										<span className="w-6 h-6 bg-classly-green text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">
											{qIndex + 1}
										</span>
										<textarea
											value={q.question}
											onChange={(e) =>
												handleQuestionChange(q.id, "question", e.target.value)
											}
											className="flex-1 text-sm font-medium text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-classly-green resize-none"
											rows={2}
											placeholder="Question text..."
										/>
										<button
											onClick={() => handleDeleteQuestion(q.id)}
											className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-1"
										>
											<Trash2 size={16} />
										</button>
									</div>

									<div className="ml-9 space-y-2">
										{q.options.map((option, oIndex) => (
											<div key={oIndex} className="flex items-center gap-2">
												<button
													onClick={() =>
														handleQuestionChange(q.id, "correctIndex", oIndex)
													}
													className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
														q.correctIndex === oIndex
															? "border-classly-green bg-classly-green"
															: "border-gray-300 hover:border-classly-green"
													}`}
												>
													{q.correctIndex === oIndex && (
														<Check size={12} className="text-white" />
													)}
												</button>
												<input
													type="text"
													value={option}
													onChange={(e) =>
														handleOptionChange(q.id, oIndex, e.target.value)
													}
													className={`flex-1 text-sm px-3 py-1.5 border rounded-lg focus:outline-none focus:border-classly-green transition-colors ${
														q.correctIndex === oIndex
															? "border-classly-green/40 bg-green-50"
															: "border-gray-200"
													}`}
													placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
												/>
											</div>
										))}
										<p className="text-xs text-gray-400 ml-8">
											Click the circle to mark the correct answer
										</p>
									</div>
								</div>
							))}

							<button
								onClick={handleAddQuestion}
								className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-classly-green hover:text-classly-green transition-colors"
							>
								<Plus size={16} />
								Add Question
							</button>

							{error && (
								<div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
									<AlertCircle size={16} />
									{error}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				{step === "review" && (
					<div className="p-6 pt-0 flex gap-3 shrink-0 border-t border-gray-100 mt-2">
						<button
							onClick={onClose}
							className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={saving || questions.length === 0}
							className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{saving ? (
								<>
									<Loader2 size={16} className="animate-spin" /> Saving...
								</>
							) : (
								`Save ${questions.length} Questions`
							)}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};