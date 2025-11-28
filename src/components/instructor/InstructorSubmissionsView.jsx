import { useState } from "react";
import {
	ArrowLeft,
	Loader2,
	CheckCircle,
	Clock,
	AlertCircle,
	FileText,
	Download,
	Paperclip,
	User,
} from "lucide-react";

export const InstructorSubmissionsView = ({
	material,
	submissions = [],
	students = [],
	onBack,
	onGradeSubmission,
	loading = false,
}) => {
	const [filter, setFilter] = useState("all"); // all, assigned, turned_in, graded

	// Calculate statistics
	const stats = {
		total: students.length,
		turnedIn: submissions.filter(
			(s) =>
				s.status === "submitted" ||
				s.status === "late" ||
				s.status === "graded" ||
				s.status === "returned"
		).length,
		graded: submissions.filter(
			(s) => s.status === "graded" || s.status === "returned"
		).length,
		assigned:
			students.length -
			submissions.filter(
				(s) =>
					s.status === "submitted" ||
					s.status === "late" ||
					s.status === "graded" ||
					s.status === "returned"
			).length,
	};

	// Create a map of submissions by student_id for easy lookup
	const submissionMap = {};
	submissions.forEach((sub) => {
		submissionMap[sub.student_id] = sub;
	});

	// Build complete list with all students
	const allStudentSubmissions = students.map((student) => {
		const submission = submissionMap[student.id];
		return {
			student,
			submission: submission || {
				status: "not_submitted",
				student_id: student.id,
			},
		};
	});

	// Filter submissions based on selected filter
	const filteredSubmissions = allStudentSubmissions.filter((item) => {
		const { submission } = item;
		switch (filter) {
			case "assigned":
				return submission.status === "not_submitted";
			case "turned_in":
				return (
					submission.status === "submitted" || submission.status === "late"
				);
			case "graded":
				return (
					submission.status === "graded" || submission.status === "returned"
				);
			default:
				return true;
		}
	});

	// Sort: not submitted first, then by submission date
	filteredSubmissions.sort((a, b) => {
		if (
			a.submission.status === "not_submitted" &&
			b.submission.status !== "not_submitted"
		) {
			return 1;
		}
		if (
			a.submission.status !== "not_submitted" &&
			b.submission.status === "not_submitted"
		) {
			return -1;
		}
		if (a.submission.submitted_at && b.submission.submitted_at) {
			return (
				new Date(b.submission.submitted_at) -
				new Date(a.submission.submitted_at)
			);
		}
		return 0;
	});

	const getStatusBadge = (submission) => {
		if (!submission || submission.status === "not_submitted") {
			return {
				text: "Assigned",
				icon: Clock,
				classes: "bg-gray-100 text-gray-600",
			};
		}

		switch (submission.status) {
			case "submitted":
				return {
					text: "Turned in",
					icon: CheckCircle,
					classes: "bg-blue-100 text-blue-700",
				};
			case "late":
				return {
					text: "Turned in late",
					icon: AlertCircle,
					classes: "bg-orange-100 text-orange-700",
				};
			case "graded":
			case "returned":
				return {
					text: `Graded (${submission.grade}/${material.max_points})`,
					icon: CheckCircle,
					classes: "bg-green-100 text-green-700",
				};
			default:
				return {
					text: "Unknown",
					icon: AlertCircle,
					classes: "bg-gray-100 text-gray-600",
				};
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-6xl mx-auto px-6 py-4">
					<button
						onClick={onBack}
						className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
					>
						<ArrowLeft size={16} />
						Back to Material
					</button>

					<div className="flex items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								{material.title}
							</h1>
							<p className="text-sm text-gray-600 mt-1">
								{stats.turnedIn} / {stats.total} turned in
							</p>
						</div>

						{/* Stats */}
						<div className="flex gap-6">
							<div className="text-center">
								<div className="text-2xl font-bold text-gray-900">
									{stats.assigned}
								</div>
								<div className="text-xs text-gray-600">Assigned</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">
									{stats.turnedIn}
								</div>
								<div className="text-xs text-gray-600">Turned in</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">
									{stats.graded}
								</div>
								<div className="text-xs text-gray-600">Graded</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-6xl mx-auto px-6">
					<div className="flex gap-6">
						{[
							{ key: "all", label: "All", count: stats.total },
							{ key: "assigned", label: "Assigned", count: stats.assigned },
							{ key: "turned_in", label: "Turned in", count: stats.turnedIn },
							{ key: "graded", label: "Graded", count: stats.graded },
						].map((tab) => (
							<button
								key={tab.key}
								onClick={() => setFilter(tab.key)}
								className={`py-3 px-1 border-b-2 transition-colors ${
									filter === tab.key
										? "border-classly-green text-classly-green font-medium"
										: "border-transparent text-gray-600 hover:text-gray-900"
								}`}
							>
								{tab.label} ({tab.count})
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Submissions List */}
			<div className="max-w-6xl mx-auto px-6 py-6">
				<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
					{filteredSubmissions.length === 0 ? (
						<div className="p-12 text-center">
							<FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
							<p className="text-gray-600">No submissions in this category</p>
						</div>
					) : (
						<div className="divide-y divide-gray-100">
							{filteredSubmissions.map(({ student, submission }) => {
								const statusBadge = getStatusBadge(submission);
								const StatusIcon = statusBadge.icon;
								const isSubmitted =
									submission.status !== "not_submitted" &&
									submission.status !== undefined;

								return (
									<div
										key={student.id}
										className="p-4 hover:bg-gray-50 transition-colors"
									>
										<div className="flex items-center gap-4">
											{/* Student Avatar */}
											<div className="w-10 h-10 bg-classly-green rounded-full flex items-center justify-center text-white font-semibold shrink-0">
												{student.full_name?.[0]?.toUpperCase() || "S"}
											</div>

											{/* Student Info */}
											<div className="flex-1 min-w-0">
												<p className="font-medium text-gray-900">
													{student.full_name}
												</p>
												<p className="text-sm text-gray-600">{student.email}</p>
											</div>

											{/* Status & Actions */}
											<div className="flex items-center gap-3">
												{/* Submission Info */}
												<div className="text-right">
													<div
														className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge.classes}`}
													>
														<StatusIcon size={12} />
														{statusBadge.text}
													</div>
													{submission.submitted_at && (
														<p className="text-xs text-gray-500 mt-1">
															{new Date(
																submission.submitted_at
															).toLocaleDateString("en-US", {
																month: "short",
																day: "numeric",
																hour: "numeric",
																minute: "2-digit",
															})}
														</p>
													)}
												</div>

												{/* File indicator */}
												{submission.file_url && (
													<div className="text-gray-400">
														<Paperclip size={16} />
													</div>
												)}

												{/* Action Button */}
												{isSubmitted ? (
													<button
														onClick={() =>
															onGradeSubmission(submission, student)
														}
														className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
															submission.status === "graded" ||
															submission.status === "returned"
																? "border border-gray-300 text-gray-700 hover:bg-gray-50"
																: "bg-classly-green text-white hover:bg-classly-green/90 shadow-sm"
														}`}
													>
														{submission.status === "graded" ||
														submission.status === "returned"
															? "Review"
															: "Grade"}
													</button>
												) : (
													<button className="px-4 py-2 border border-gray-300 text-gray-500 rounded-lg text-sm cursor-not-allowed opacity-60">
														Not submitted
													</button>
												)}
											</div>
										</div>

										{/* Preview of submission content */}
										{isSubmitted && submission.content && (
											<div className="mt-3 pl-14">
												<p className="text-sm text-gray-600 line-clamp-2">
													{submission.content}
												</p>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
