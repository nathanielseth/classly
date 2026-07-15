import React, { useState, useEffect } from "react";
import {
	Brain,
	AlertCircle,
	Loader2,
	Check,
	RefreshCw,
	X,
	ChevronRight,
	BookOpen,
	GraduationCap,
	Sparkles,
} from "lucide-react";
import { db } from "../../lib/supabase/db";
import { supabase } from "../../lib/supabase/client";
import {
	extractTextFromPDF,
	generateQuizFromContent,
} from "../../lib/api/aiApi";

const PDF_JS_VERSION = "3.11.174";

const QuizTab = ({ userRole }) => {
	const [subjects, setSubjects] = useState([]);
	const [materials, setMaterials] = useState([]);
	const [selectedSubject, setSelectedSubject] = useState(null);
	const [selectedMaterial, setSelectedMaterial] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedQuiz, setGeneratedQuiz] = useState(null);
	const [error, setError] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [showAnswers, setShowAnswers] = useState(false);
	const [userAnswers, setUserAnswers] = useState({});
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [loadingMaterials, setLoadingMaterials] = useState(false);
	const [savingToClassroom, setSavingToClassroom] = useState(false);
	const [savedToClassroom, setSavedToClassroom] = useState(false);

	useEffect(() => {
		if (window.pdfjsLib) return;

		const script = document.createElement("script");
		script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.min.js`;
		script.onload = () => {
			window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;
		};
		document.head.appendChild(script);
	}, []);

	useEffect(() => {
		let cancelled = false;

		(async () => {
			try {
				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();

				if (cancelled) return;

				if (authError) {
					console.error("Error loading user:", authError);
					setError("Authentication error. Please log in again.");
					return;
				}

				if (user) {
					setCurrentUser(user);
				} else {
					setError("No user session found. Please log in.");
				}
			} catch (err) {
				if (cancelled) return;
				console.error("Error loading user:", err);
				setError("Failed to load user session.");
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	// Load the instructor's own subjects, or the student's enrolled
	// subjects, depending on role. Instructors need their own subjects
	// here (not enrollments) since the generated quiz gets saved as a
	// material into one of them.
	useEffect(() => {
		if (!currentUser) return;
		let cancelled = false;

		(async () => {
			try {
				let subjectsData = [];

				if (userRole === "instructor") {
					const { data, error: subjectsError } =
						await db.subjects.getByInstructor(currentUser.id);
					if (subjectsError) throw subjectsError;
					subjectsData = data || [];
				} else {
					const { data: enrollmentsData, error: enrollError } =
						await db.enrollments.getByStudent(currentUser.id);
					if (enrollError) throw enrollError;
					subjectsData = enrollmentsData.map((e) => e.subject).filter(Boolean);
				}

				if (cancelled) return;

				setSubjects(subjectsData);

				if (subjectsData.length === 0) {
					setError(
						userRole === "instructor"
							? "You haven't created any subjects yet."
							: "You are not enrolled in any subjects yet.",
					);
				}
			} catch (err) {
				if (cancelled) return;
				console.error("Error loading subjects:", err);
				setError("Failed to load subjects. Please try again.");
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [currentUser, userRole]);

	useEffect(() => {
		if (!selectedSubject) return;
		let cancelled = false;

		(async () => {
			setLoadingMaterials(true);
			setError(null);

			try {
				const { data, error: materialsError } = await db.materials.getBySubject(
					selectedSubject.id,
				);

				if (materialsError) {
					console.error("Materials error:", materialsError);
					throw materialsError;
				}

				if (cancelled) return;

				const materialsWithContent = data.filter(
					(m) => m.file_url || m.description || m.instructions,
				);

				setMaterials(materialsWithContent);

				if (materialsWithContent.length === 0) {
					setError("No materials with content found in this subject.");
				}
			} catch (err) {
				if (cancelled) return;
				console.error("Error loading materials:", err);
				setError("Failed to load materials.");
			} finally {
				if (!cancelled) setLoadingMaterials(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [selectedSubject]);

	const fetchMaterialContent = async (material) => {
		let content = "";

		if (material.description) {
			content += material.description + "\n\n";
		}

		if (material.instructions) {
			content += material.instructions + "\n\n";
		}

		if (material.file_url) {
			try {
				if (material.file_url.toLowerCase().includes(".pdf")) {
					const response = await fetch(material.file_url);
					const blob = await response.blob();
					const file = new File([blob], material.file_name || "document.pdf", {
						type: "application/pdf",
					});
					const pdfText = await extractTextFromPDF(file);
					content += pdfText;
				} else if (
					material.file_url.includes(".txt") ||
					material.file_url.includes(".md")
				) {
					const response = await fetch(material.file_url);
					const text = await response.text();
					content += text;
				}
			} catch (err) {
				console.error("Error fetching file content:", err);
				throw err;
			}
		}

		return content.trim();
	};

	const handleGenerate = async () => {
		if (!selectedMaterial) {
			setError("Please select a material first");
			return;
		}

		setError(null);
		setIsGenerating(true);
		setGeneratedQuiz(null);
		setShowAnswers(false);
		setUserAnswers({});
		setIsSubmitted(false);
		setSavedToClassroom(false);

		try {
			const materialContent = await fetchMaterialContent(selectedMaterial);

			if (!materialContent || materialContent.length < 50) {
				throw new Error(
					"Not enough content to generate quiz. Please select a material with more content.",
				);
			}

			const quiz = await generateQuizFromContent(
				materialContent,
				selectedMaterial.title,
			);

			setGeneratedQuiz(quiz);
		} catch (err) {
			console.error("Error generating quiz:", err);
			setError(err.message || "Failed to generate quiz. Please try again.");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSaveToClassroom = async () => {
		if (!generatedQuiz || !selectedSubject || !selectedMaterial) return;

		setSavingToClassroom(true);
		setError(null);

		try {
			const { data: newMaterial, error: createError } =
				await db.materials.create({
					subject_id: selectedSubject.id,
					title: `${selectedMaterial.title} — Quiz`,
					description: `AI-generated quiz from ${selectedMaterial.title}`,
					type: "quiz",
					max_points: generatedQuiz.length * 10,
					published: true,
					allow_late_submission: true,
					topic_id: selectedMaterial.topic_id || null,
				});
			if (createError) throw createError;

			const { error: saveError } = await db.quizQuestions.saveAll(
				newMaterial.id,
				generatedQuiz,
			);
			if (saveError) throw saveError;

			setSavedToClassroom(true);
			alert(
				`Quiz "${newMaterial.title}" saved to ${selectedSubject.name}! Students can now take it in the classroom.`,
			);
		} catch (err) {
			console.error("Error saving quiz to classroom:", err);
			setError(err.message || "Failed to save quiz to classroom.");
		} finally {
			setSavingToClassroom(false);
		}
	};

	const handleAnswerSelect = (questionIndex, optionIndex) => {
		if (isSubmitted) return;
		setUserAnswers((prev) => ({
			...prev,
			[questionIndex]: optionIndex,
		}));
	};

	const handleSubmitQuiz = () => {
		setIsSubmitted(true);
		setShowAnswers(true);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const calculateScore = () => {
		if (!generatedQuiz) return { correct: 0, total: 0, percentage: 0 };

		let correct = 0;
		generatedQuiz.forEach((q, idx) => {
			if (userAnswers[idx] === q.correctIndex) {
				correct++;
			}
		});

		return {
			correct,
			total: generatedQuiz.length,
			percentage: Math.round((correct / generatedQuiz.length) * 100),
		};
	};

	const handleRetry = () => {
		setUserAnswers({});
		setIsSubmitted(false);
		setShowAnswers(false);
	};

	const score = calculateScore();
	const isInstructor = userRole === "instructor";

	return (
		<div className="space-y-6">
			{/* Configuration Card */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
				<div className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
						<Brain className="text-classly-green" size={20} />
						Quiz Generator
					</h3>

					{error && (
						<div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
							<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
							<p className="text-sm text-red-600 font-medium">{error}</p>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700 flex items-center gap-2">
								<BookOpen size={16} className="text-gray-400" />
								Select Subject
							</label>
							<div className="relative">
								<select
									value={selectedSubject?.id || ""}
									onChange={(e) => {
										const subject = subjects.find(
											(s) => s.id === e.target.value,
										);
										setSelectedSubject(subject);
										setSelectedMaterial(null);
										setGeneratedQuiz(null);
										setError(null);
									}}
									disabled={isGenerating}
									className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-classly-green focus:border-transparent outline-none appearance-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
								>
									<option value="">Choose a subject...</option>
									{subjects.map((subject) => (
										<option key={subject.id} value={subject.id}>
											{subject.code} - {subject.name}
										</option>
									))}
								</select>
								<ChevronRight
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none"
									size={16}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-700 flex items-center gap-2">
								<GraduationCap size={16} className="text-gray-400" />
								Select Material
							</label>
							<div className="relative">
								<select
									value={selectedMaterial?.id || ""}
									onChange={(e) => {
										const material = materials.find(
											(m) => m.id === e.target.value,
										);
										setSelectedMaterial(material);
										setGeneratedQuiz(null);
										setError(null);
									}}
									disabled={
										!selectedSubject || isGenerating || loadingMaterials
									}
									className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-classly-green focus:border-transparent outline-none appearance-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
								>
									<option value="">
										{loadingMaterials
											? "Loading materials..."
											: !selectedSubject
												? "Select a subject first"
												: "Choose a material..."}
									</option>
									{materials.map((material) => (
										<option key={material.id} value={material.id}>
											{material.title}
											{material.file_url?.includes(".pdf") && " (PDF)"}
										</option>
									))}
								</select>
								<ChevronRight
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none"
									size={16}
								/>
							</div>
						</div>
					</div>

					<button
						onClick={handleGenerate}
						disabled={!selectedMaterial || isGenerating}
						className="w-full py-3.5 bg-classly-green text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
					>
						{isGenerating ? (
							<>
								<Loader2 className="animate-spin" size={20} />
								Analyzing Content & Generating Questions...
							</>
						) : (
							<>
								<Brain size={20} />
								Generate Quiz
							</>
						)}
					</button>
				</div>
			</div>

			{generatedQuiz && generatedQuiz.length > 0 && (
				<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h4 className="font-bold text-gray-900 text-xl">
								{selectedMaterial?.title}
							</h4>
							<p className="text-sm text-gray-500 mt-1">
								{generatedQuiz.length} Questions •{" "}
								{isInstructor ? "Preview Mode" : "Practice Mode"}
							</p>
						</div>

						{isSubmitted && !isInstructor && (
							<button
								onClick={handleRetry}
								className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
							>
								<RefreshCw size={16} />
								Try Again
							</button>
						)}
					</div>

					{/* Instructors get a save panel instead of taking the quiz
					    themselves — the point is to push it to the classroom for
					    students to answer digitally. */}
					{isInstructor && (
						<div className="mb-8 bg-classly-green/5 border border-classly-green/20 rounded-xl p-5">
							<p className="text-sm font-semibold text-gray-900 mb-1">
								Save to Classroom
							</p>
							<p className="text-xs text-gray-500 mb-4">
								This will create a new quiz material in{" "}
								<strong>{selectedSubject?.name}</strong> that students can take
								digitally.
							</p>
							<button
								onClick={handleSaveToClassroom}
								disabled={savingToClassroom || savedToClassroom}
								className="w-full py-2.5 bg-classly-green text-white rounded-lg font-medium hover:bg-classly-green/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-all"
							>
								{savingToClassroom ? (
									<>
										<Loader2 size={16} className="animate-spin" /> Saving...
									</>
								) : savedToClassroom ? (
									<>
										<Check size={16} /> Saved to Classroom
									</>
								) : (
									<>
										<Sparkles size={16} /> Save Quiz to Classroom
									</>
								)}
							</button>
						</div>
					)}

					{isSubmitted && !isInstructor && (
						<div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
							<div className="flex items-center gap-4">
								<div
									className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
										score.percentage >= 70
											? "bg-emerald-50 text-emerald-600"
											: "bg-amber-50 text-amber-600"
									}`}
								>
									{score.percentage}%
								</div>
								<div>
									<h5 className="font-bold text-gray-900 text-lg">
										Quiz Complete!
									</h5>
									<p className="text-gray-600">
										You answered {score.correct} out of {score.total} correctly
									</p>
								</div>
							</div>
							<div className="w-full sm:w-auto">
								{score.percentage >= 70 ? (
									<div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium text-center">
										Great job! You've mastered this material.
									</div>
								) : (
									<div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium text-center">
										Review the material and try again.
									</div>
								)}
							</div>
						</div>
					)}

					<div className="space-y-6">
						{generatedQuiz.map((q, idx) => (
							<QuizQuestion
								key={idx}
								question={q}
								index={idx}
								showAnswer={showAnswers || isInstructor}
								userAnswer={userAnswers[idx]}
								onAnswerSelect={handleAnswerSelect}
								isSubmitted={isSubmitted || isInstructor}
							/>
						))}
					</div>

					{!isSubmitted && !isInstructor && (
						<div className="mt-8 sticky bottom-6 z-10">
							<div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-lg max-w-2xl mx-auto flex items-center justify-between gap-4">
								<div className="text-sm text-gray-600 font-medium pl-2">
									{Object.keys(userAnswers).length} of {generatedQuiz.length}{" "}
									Answered
								</div>
								<button
									onClick={handleSubmitQuiz}
									disabled={
										Object.keys(userAnswers).length !== generatedQuiz.length
									}
									className="px-8 py-3 bg-classly-green text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-md"
								>
									Submit Quiz
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const QuizQuestion = ({
	question,
	index,
	showAnswer,
	userAnswer,
	onAnswerSelect,
	isSubmitted,
}) => {
	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
			<div className="p-6">
				<div className="flex gap-4">
					<span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 font-medium text-sm">
						{index + 1}
					</span>
					<p className="font-medium text-gray-900 text-lg flex-1 pt-0.5">
						{question.question}
					</p>
				</div>

				<div className="mt-6 space-y-3 pl-12">
					{question.options.map((option, optIdx) => {
						const isSelected = userAnswer === optIdx;
						const isCorrect = optIdx === question.correctIndex;

						const showCorrect = showAnswer && isCorrect;
						const showWrong = showAnswer && isSelected && !isCorrect;
						const isDimmed = showAnswer && !isCorrect && !isSelected;

						let borderClass = "border-gray-200";
						let bgClass = "bg-white";
						let textClass = "text-gray-700";
						let icon = null;

						if (showCorrect) {
							borderClass = "border-emerald-500 ring-1 ring-emerald-500";
							bgClass = "bg-emerald-50/30";
							textClass = "text-emerald-700 font-medium";
							icon = <Check size={18} className="text-emerald-600" />;
						} else if (showWrong) {
							borderClass = "border-red-500 ring-1 ring-red-500";
							bgClass = "bg-red-50/30";
							textClass = "text-red-700 font-medium";
							icon = <X size={18} className="text-red-600" />;
						} else if (isSelected) {
							borderClass = "border-classly-green ring-1 ring-classly-green";
							bgClass = "bg-gray-50";
							textClass = "text-gray-900 font-medium";
						}

						return (
							<button
								key={optIdx}
								onClick={() => onAnswerSelect(index, optIdx)}
								disabled={isSubmitted}
								className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative group
                  ${borderClass} ${bgClass} ${
										isDimmed ? "opacity-50" : "opacity-100"
									}
                  ${
										!isSubmitted && !isSelected
											? "hover:border-classly-green hover:bg-gray-50"
											: ""
									}
                `}
							>
								<div className="flex items-center justify-between gap-3">
									<span className={textClass}>{option}</span>
									{icon && <span>{icon}</span>}

									{/* Selection Indicator for when answering */}
									{!isSubmitted && isSelected && (
										<div className="w-4 h-4 rounded-full bg-classly-green animate-in zoom-in duration-200" />
									)}
									{!isSubmitted && !isSelected && (
										<div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-classly-green transition-colors" />
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{showAnswer && question.explanation && (
				<div className="bg-gray-50 px-6 py-4 border-t border-gray-100 ml-12 border-l border-l-gray-200">
					<p className="text-sm text-gray-600">
						<span className="font-semibold text-gray-900">Explanation:</span>{" "}
						{question.explanation}
					</p>
				</div>
			)}
		</div>
	);
};

export default QuizTab;