import { useState, useEffect } from "react";
import {
	ArrowLeft,
	Clock,
	Paperclip,
	Download,
	Upload,
	X,
	Loader2,
	FileText,
	CheckCircle,
	AlertCircle,
	Sparkles,
	ClipboardList,
} from "lucide-react";
import { QuizBuilderModal } from "../components/classroom/modal/QuizBuilderModal";
import { QuizView } from "../components/classroom/shared/QuizView";
import { db } from "../lib/supabase";

const MaterialDetailPageInner = ({
	userRole,
	onBack,
	material,
	submission,
	subject,
	subjectId,
	onSubmit,
	onUnsubmit,
	userId,
}) => {
	const [selectedFile, setSelectedFile] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [content, setContent] = useState(submission?.content ?? "");
	const [showQuizBuilder, setShowQuizBuilder] = useState(null); // null | "generate" | "digitize" | "manual"
	const [showQuizView, setShowQuizView] = useState(false);

	const [questionCount, setQuestionCount] = useState(null); // null = loading

	useEffect(() => {
		let cancelled = false;
		if (material?.type !== "quiz") {
			setQuestionCount(null);
			return;
		}
		(async () => {
			const { data } = await db.quizQuestions.getByMaterial(material.id);
			if (!cancelled) setQuestionCount(data?.length ?? 0);
		})();
		return () => {
			cancelled = true;
		};
	}, [material?.id, material?.type]);

	const refreshQuestionCount = async () => {
		if (material?.type !== "quiz") return;
		const { data } = await db.quizQuestions.getByMaterial(material.id);
		setQuestionCount(data?.length ?? 0);
	};

	const dueDate = material?.due_date ? new Date(material.due_date) : null;
	const isOverdue = dueDate && dueDate < new Date();
	const canSubmit = !isOverdue || material?.allow_late_submission;

	const handleFileSelect = (e) => {
		const file = e.target.files?.[0];
		if (file) {
			if (file.size > 10 * 1024 * 1024) {
				alert("File size must be less than 10MB");
				return;
			}
			setSelectedFile(file);
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
	};

	const handleTurnIn = async () => {
		if (!content.trim() && !selectedFile && !submission?.file_url) {
			alert("Please add some content or attach a file");
			return;
		}

		try {
			setSubmitting(true);
			await onSubmit({
				content: content.trim(),
				file: selectedFile,
			});
			setSelectedFile(null);
		} catch (err) {
			console.error("Submit error:", err);
			alert("Failed to submit work");
		} finally {
			setSubmitting(false);
		}
	};

	const handleUnsubmit = async () => {
		if (!window.confirm("Are you sure you want to unsubmit this work?")) return;

		try {
			setSubmitting(true);
			await onUnsubmit();
		} catch (err) {
			console.error("Unsubmit error:", err);
			alert("Failed to unsubmit");
		} finally {
			setSubmitting(false);
		}
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	};

	if (!material) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
			</div>
		);
	}

	const isSubmitted =
		submission?.status === "submitted" ||
		submission?.status === "late" ||
		submission?.status === "graded" ||
		submission?.status === "returned";
	const isGraded =
		submission?.status === "graded" || submission?.status === "returned";

	const hasDigitizedQuestions = (questionCount ?? 0) > 0;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-4xl mx-auto px-6 py-4">
					<button
						onClick={onBack}
						className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
					>
						<ArrowLeft size={16} />
						Back to Classwork
					</button>

					<div className="flex items-start justify-between gap-4">
						<div className="flex-1">
							<h1 className="text-2xl font-bold text-gray-900">
								{material.title}
							</h1>
							<div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
								{subject && <span className="font-medium">{subject.name}</span>}
								{dueDate && (
									<div className="flex items-center gap-1">
										<Clock size={14} />
										<span
											className={isOverdue ? "text-red-600 font-medium" : ""}
										>
											Due{" "}
											{dueDate.toLocaleString("en-US", {
												month: "short",
												day: "numeric",
												year: "numeric",
												hour: "numeric",
												minute: "2-digit",
											})}
										</span>
									</div>
								)}
								{material.max_points > 0 && (
									<span>{material.max_points} points</span>
								)}
								<span className="capitalize text-gray-500">
									• {material.type}
								</span>
							</div>
						</div>

						{/* Grade display for students */}
						{userRole === "student" && isGraded && (
							<div className="text-right">
								<div className="text-3xl font-bold text-classly-green">
									{submission.grade}
								</div>
								<div className="text-sm text-gray-600">
									out of {material.max_points}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
				{/* Instructions */}
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-3">
						Instructions
					</h2>
					<div className="text-gray-700 whitespace-pre-wrap">
						{material.instructions ||
							material.description ||
							"No instructions provided."}
					</div>

					{/* Attached files from instructor */}
					{material.file_url && (
						<div className="mt-4 pt-4 border-t border-gray-100">
							<h3 className="text-sm font-medium text-gray-900 mb-2">
								Attached Files
							</h3>
							<a
								href={material.file_url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors w-fit"
							>
								<Paperclip size={16} />
								<span>{material.file_name || "Download attachment"}</span>
								<Download size={16} />
							</a>
						</div>
					)}
				</div>

				{/* Student Work Section */}
				{userRole === "student" && (
					<>
						{material.type === "quiz" ? (
							<div className="bg-white rounded-lg border border-gray-200 p-6">
								{questionCount === null ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 size={20} className="animate-spin text-gray-400" />
									</div>
								) : hasDigitizedQuestions ? (
									showQuizView ? (
										<QuizView
											material={material}
											userId={userId}
											onBack={() => setShowQuizView(false)}
										/>
									) : (
										<div className="text-center py-8">
											<div className="w-14 h-14 bg-classly-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
												<ClipboardList
													size={28}
													className="text-classly-green"
												/>
											</div>
											<h3 className="text-lg font-semibold text-gray-900 mb-2">
												{material.title}
											</h3>
											<p className="text-sm text-gray-500 mb-6">
												{material.max_points} points · Multiple choice
											</p>
											<button
												onClick={() => setShowQuizView(true)}
												className="px-6 py-3 bg-classly-green text-white font-medium rounded-xl hover:bg-classly-green/90 transition-all shadow-sm"
											>
												Start Quiz
											</button>
										</div>
									)
								) : (
									<div className="text-center py-8">
										<div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
											<Clock size={24} className="text-amber-600" />
										</div>
										<h3 className="text-lg font-semibold text-gray-900 mb-2">
											Quiz not ready yet
										</h3>
										<p className="text-sm text-gray-500">
											Your instructor hasn't published questions for this quiz
											yet.
										</p>
									</div>
								)}
							</div>
						) : (
							<div className="bg-white rounded-lg border border-gray-200">
								<div className="p-6 border-b border-gray-100 flex items-center justify-between">
									<h2 className="text-lg font-semibold text-gray-900">
										Your Work
									</h2>
									{isSubmitted && !isGraded && canSubmit && (
										<button
											onClick={handleUnsubmit}
											disabled={submitting}
											className="text-sm text-gray-600 hover:text-gray-900 underline disabled:opacity-50"
										>
											Unsubmit
										</button>
									)}
								</div>

								<div className="p-6 space-y-4">
									{/* Status indicator */}
									{isSubmitted && (
										<div
											className={`flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg ${
												isGraded
													? "bg-green-50 text-green-700"
													: submission?.is_late
														? "bg-orange-50 text-orange-700"
														: "bg-blue-50 text-blue-700"
											}`}
										>
											{isGraded ? (
												<CheckCircle size={16} />
											) : submission?.is_late ? (
												<AlertCircle size={16} />
											) : (
												<CheckCircle size={16} />
											)}
											<span>
												{isGraded
													? "Graded and returned"
													: submission?.is_late
														? "Turned in late"
														: "Turned in"}
											</span>
											{submission?.submitted_at && (
												<span className="text-xs ml-auto">
													{new Date(submission.submitted_at).toLocaleString()}
												</span>
											)}
										</div>
									)}

									{/* Grade and feedback */}
									{isGraded && (
										<div className="bg-green-50 border border-green-200 rounded-lg p-4">
											<div className="flex items-center justify-between mb-2">
												<span className="text-sm font-medium text-green-900">
													Grade
												</span>
												<span className="text-2xl font-bold text-green-700">
													{submission.grade} / {material.max_points}
												</span>
											</div>
											{submission.feedback && (
												<div className="mt-3 pt-3 border-t border-green-200">
													<p className="text-sm font-medium text-green-900 mb-1">
														Feedback
													</p>
													<p className="text-sm text-green-800 whitespace-pre-wrap">
														{submission.feedback}
													</p>
												</div>
											)}
										</div>
									)}

									{/* Content input */}
									{!isGraded && (
										<>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													Your answer
												</label>
												<textarea
													value={content}
													onChange={(e) => setContent(e.target.value)}
													className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none"
													rows={6}
													placeholder="Type your answer here..."
													disabled={submitting}
												/>
											</div>

											{/* File upload */}
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													Attach file (optional)
												</label>

												{!selectedFile && !submission?.file_url ? (
													<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-classly-green transition-colors">
														<input
															type="file"
															id="file-upload"
															className="hidden"
															onChange={handleFileSelect}
															disabled={submitting}
															accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.jpg,.jpeg,.png"
														/>
														<label
															htmlFor="file-upload"
															className="cursor-pointer flex flex-col items-center gap-2"
														>
															<Upload className="w-8 h-8 text-gray-400" />
															<div>
																<p className="text-sm font-medium text-gray-700">
																	Click to upload
																</p>
																<p className="text-xs text-gray-500 mt-1">
																	PDF, DOC, PPT, Images (Max 10MB)
																</p>
															</div>
														</label>
													</div>
												) : (
													<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
														<div className="flex items-center gap-3">
															<div className="p-2 bg-blue-50 rounded-lg">
																<FileText className="w-5 h-5 text-blue-600" />
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-sm font-medium text-gray-900 truncate">
																	{selectedFile?.name || submission?.file_name}
																</p>
																<p className="text-xs text-gray-500">
																	{selectedFile
																		? formatFileSize(selectedFile.size)
																		: submission?.file_size
																			? formatFileSize(submission.file_size)
																			: ""}
																</p>
															</div>
															{!submitting && (
																<button
																	onClick={handleRemoveFile}
																	className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
																>
																	<X size={16} />
																</button>
															)}
														</div>
													</div>
												)}
											</div>

											{/* Submit button */}
											<div className="flex justify-end pt-4">
												<button
													onClick={handleTurnIn}
													disabled={submitting || !canSubmit}
													className="px-6 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
												>
													{submitting ? (
														<>
															<Loader2 size={16} className="animate-spin" />
															Submitting...
														</>
													) : (
														"Turn in"
													)}
												</button>
											</div>
										</>
									)}

									{/* View submitted work when graded */}
									{isGraded && submission?.content && (
										<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
											<p className="text-sm font-medium text-gray-900 mb-2">
												Your submitted answer
											</p>
											<p className="text-sm text-gray-700 whitespace-pre-wrap">
												{submission.content}
											</p>
										</div>
									)}

									{isGraded && submission?.file_url && (
										<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
											<p className="text-sm font-medium text-gray-900 mb-2">
												Your submitted file
											</p>
											<a
												href={submission.file_url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 w-fit"
											>
												<Paperclip size={16} />
												<span>{submission.file_name || "Download file"}</span>
												<Download size={16} />
											</a>
										</div>
									)}
								</div>
							</div>
						)}
					</>
				)}

				{/* Instructor View - Submission Stats */}
				{userRole === "instructor" && (
					<div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold text-gray-900">
								Student Work
							</h2>
							<div className="flex gap-2">
								{/* Generate a quiz FROM this module/lecture material */}
								{["module", "material", "assignment", "others"].includes(
									material.type,
								) &&
									material.file_url && (
										<button
											onClick={() => setShowQuizBuilder("generate")}
											className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors"
										>
											<Sparkles size={16} />
											Generate Quiz from this
										</button>
									)}

								{/* Digitize an existing quiz PDF that has no questions yet */}
								{material.type === "quiz" &&
									material.file_url &&
									!hasDigitizedQuestions && (
										<button
											onClick={() => setShowQuizBuilder("digitize")}
											className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
										>
											<Sparkles size={16} />
											Digitize Quiz PDF
										</button>
									)}

								{/* Build/edit quiz questions manually, or re-edit an
								    already-digitized/generated quiz */}
								{material.type === "quiz" &&
									(!material.file_url || hasDigitizedQuestions) && (
										<button
											onClick={() => setShowQuizBuilder("manual")}
											className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors"
										>
											<Sparkles size={16} />
											{hasDigitizedQuestions ? "Edit Questions" : "Build Quiz"}
										</button>
									)}
							</div>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-gray-900">0</div>
								<div className="text-sm text-gray-600">Turned in</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-gray-900">0</div>
								<div className="text-sm text-gray-600">Graded</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-gray-900">0</div>
								<div className="text-sm text-gray-600">Assigned</div>
							</div>
						</div>
						<button className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							View all submissions
						</button>
					</div>
				)}

				{showQuizBuilder && (
					<QuizBuilderModal
						material={material}
						subjectId={subjectId ?? subject?.id}
						mode={showQuizBuilder}
						onClose={() => setShowQuizBuilder(null)}
						onSaved={(newMaterialTitle) => {
							const mode = showQuizBuilder;
							setShowQuizBuilder(null);
							refreshQuestionCount();
							if (mode === "generate") {
								alert(
									`Quiz "${newMaterialTitle}" has been created and added to this subject's materials!`,
								);
							} else {
								// digitize / manual save straight to this material —
								// the modal just closes with no other feedback, so
								// confirm explicitly that it saved.
								alert("Quiz saved! Students can now take this quiz.");
							}
						}}
					/>
				)}
			</div>
		</div>
	);
};

export const MaterialDetailPage = (props) => (
	<MaterialDetailPageInner
		key={`${props.material?.id ?? "none"}:${props.submission?.id ?? "new"}`}
		{...props}
	/>
);