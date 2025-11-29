import React, { useState, useEffect, useCallback } from "react";
import {
	Clock,
	MoreHorizontal,
	CheckCircle,
	ArrowRight,
	Plus,
	AlertCircle,
	BookOpen,
	Loader2,
	X,
	Check,
} from "lucide-react";
import { db } from "../../lib/supabase";

const StudentDashboard = ({ onNavigate, userId }) => {
	const [joinModal, setJoinModal] = useState(false);
	const [joinCode, setJoinCode] = useState("");
	const [joinLoading, setJoinLoading] = useState(false);
	const [joinError, setJoinError] = useState("");

	const [initialLoading, setInitialLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);

	const [enrollments, setEnrollments] = useState([]);
	const [upcomingAssignments, setUpcomingAssignments] = useState([]);

	const loadDashboardData = useCallback(
		async (isBackgroundRefresh = false) => {
			try {
				if (!isBackgroundRefresh) {
					setInitialLoading(true);
				} else {
					setRefreshing(true);
				}

				setError(null);

				const { data: enrollmentsData, error: enrollError } =
					await db.enrollments.getByStudent(userId);

				if (enrollError) {
					console.error("Enrollments error:", enrollError);
				} else {
					setEnrollments(enrollmentsData || []);
				}

				try {
					const { data: assignmentsData, error: assignError } =
						await db.assignments.getUpcomingForStudent(userId, 5);

					if (assignError) {
						console.warn("Assignments error:", assignError);
						setUpcomingAssignments([]);
					} else {
						setUpcomingAssignments(assignmentsData || []);
					}
				} catch (assignErr) {
					console.warn("Assignments feature not available:", assignErr);
					setUpcomingAssignments([]);
				}
			} catch (err) {
				console.error("Dashboard load error:", err);
				if (!isBackgroundRefresh) {
					setError(err.message || "Failed to load dashboard data");
				}
			} finally {
				setInitialLoading(false);
				setRefreshing(false);
			}
		},
		[userId]
	);

	useEffect(() => {
		if (userId) {
			loadDashboardData(false);
		}
	}, [userId, loadDashboardData]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && userId && !initialLoading) {
				loadDashboardData(true);
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () =>
			document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [userId, initialLoading, loadDashboardData]);

	// ============================================
	// JOIN SUBJECT
	// ============================================
	const handleJoinSubject = async () => {
		if (!joinCode.trim()) {
			setJoinError("Please enter a subject code");
			return;
		}

		try {
			setJoinLoading(true);
			setJoinError("");

			const { data: subject, error: subjectError } =
				await db.subjects.getByCode(joinCode.trim());

			if (subjectError || !subject) {
				setJoinError("Subject not found. Check the code and try again.");
				setJoinLoading(false);
				return;
			}

			const { data: existingEnrollment } = await db.enrollments.checkEnrollment(
				userId,
				subject.id
			);

			if (existingEnrollment) {
				setJoinError("You're already enrolled in this subject");
				setJoinLoading(false);
				return;
			}

			const { error: enrollError } = await db.enrollments.enroll(
				userId,
				subject.id
			);

			if (enrollError) throw enrollError;

			await loadDashboardData(true);
			setJoinModal(false);
			setJoinCode("");
		} catch (err) {
			console.error("Join error:", err);
			setJoinError(err.message || "Failed to join subject");
		} finally {
			setJoinLoading(false);
		}
	};

	// ============================================
	// UNENROLL FROM SUBJECT
	// ============================================
	const handleUnenroll = async (subjectId, subjectName) => {
		const confirmed = window.confirm(
			`Are you sure you want to unenroll from "${subjectName}"? This action cannot be undone.`
		);

		if (!confirmed) return;

		try {
			const { error } = await db.enrollments.unenroll(userId, subjectId);
			if (error) throw error;
			await loadDashboardData(true);
		} catch (err) {
			console.error("Unenroll error:", err);
			alert(`Failed to unenroll: ${err.message}`);
		}
	};

	if (initialLoading && enrollments.length === 0) {
		return (
			<div className="max-w-7xl mx-auto">
				<LoadingSkeleton />
			</div>
		);
	}

	if (error && enrollments.length === 0) {
		return (
			<div className="max-w-7xl mx-auto">
				<div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
					<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
					<div>
						<h3 className="font-semibold text-red-900 mb-1">
							Failed to load dashboard
						</h3>
						<p className="text-sm text-red-700">{error}</p>
						<button
							onClick={() => loadDashboardData(false)}
							className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
						>
							Try Again
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ============================================
	// RENDER DASHBOARD
	// ============================================
	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{refreshing && (
				<div className="fixed top-20 right-6 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 z-50 animate-in slide-in-from-right duration-200">
					<Loader2 size={16} className="animate-spin text-classly-green" />
					<span className="text-sm text-gray-600">Updating...</span>
				</div>
			)}

			{/* Upcoming Assignments Banner */}
			{upcomingAssignments.length > 0 ? (
				<div className="flex items-center gap-3 flex-wrap">
					<div className="flex items-center gap-2 text-sm text-gray-600">
						<CheckCircle size={16} className="text-classly-green" />
						<span className="font-medium">Due soon:</span>
					</div>

					{upcomingAssignments.slice(0, 3).map((assignment) => {
						const dueDate = new Date(assignment.due_date);
						const today = new Date();
						const tomorrow = new Date(today);
						tomorrow.setDate(tomorrow.getDate() + 1);

						const isToday = dueDate.toDateString() === today.toDateString();
						const isTomorrow =
							dueDate.toDateString() === tomorrow.toDateString();

						const urgency = isToday
							? "today"
							: isTomorrow
							? "tomorrow"
							: "upcoming";
						const urgencyColors = {
							today: "red",
							tomorrow: "orange",
							upcoming: "yellow",
						};
						const color = urgencyColors[urgency];

						return (
							<div
								key={assignment.id}
								className={`flex items-center gap-2 px-3 py-2 bg-${color}-50 border border-${color}-100 rounded-lg hover:bg-${color}-100 transition-colors cursor-pointer group`}
							>
								<div className="flex items-center gap-2 flex-1">
									<span
										className={`text-sm font-semibold text-gray-900 group-hover:text-${color}-700 transition-colors`}
									>
										{assignment.title}
									</span>
									<span className="text-xs text-gray-400">•</span>
									<span className="text-xs text-gray-500">
										{assignment.subject?.code}
									</span>
								</div>
								<span
									className={`text-xs font-bold text-${color}-600 bg-${color}-100 px-2 py-0.5 rounded`}
								>
									{isToday
										? "Today"
										: isTomorrow
										? "Tomorrow"
										: formatDate(dueDate)}
								</span>
							</div>
						);
					})}

					{upcomingAssignments.length > 3 && (
						<button className="ml-auto text-sm font-medium text-classly-green hover:text-classly-green/80 flex items-center gap-1 transition-colors">
							View all <ArrowRight size={14} />
						</button>
					)}
				</div>
			) : (
				<div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-2">
					<Check size={16} className="text-green-600" />
					<span className="text-sm text-green-700 font-medium">
						All caught up! No upcoming assignments.
					</span>
				</div>
			)}

			{/* Enrolled Subjects */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
						Your Subjects
						<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
							{enrollments.length}
						</span>
					</h2>
					<button
						onClick={() => setJoinModal(true)}
						className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-classly-green hover:bg-green-50 rounded-lg transition-all"
					>
						<Plus size={16} strokeWidth={2.5} />
						Join Subject
					</button>
				</div>

				{/* Empty State */}
				{enrollments.length === 0 ? (
					<div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<BookOpen size={28} className="text-gray-400" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							No subjects yet
						</h3>
						<p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
							Get started by joining a subject using a code from your instructor
						</p>
						<button
							onClick={() => setJoinModal(true)}
							className="inline-flex items-center gap-2 px-5 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-all shadow-sm"
						>
							<Plus size={18} strokeWidth={2.5} />
							Join Your First Subject
						</button>
					</div>
				) : (
					/* Subject Cards Grid */
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
						{enrollments.map((enrollment) => (
							<SubjectCard
								key={enrollment.id}
								enrollment={enrollment}
								onNavigate={onNavigate}
								onUnenroll={handleUnenroll}
							/>
						))}
					</div>
				)}
			</div>

			{/* Join Subject Modal */}
			{joinModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-gray-100">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-xl font-bold text-gray-900">
										Join a Subject
									</h2>
									<p className="text-sm text-gray-500 mt-1">
										Enter the subject code from your instructor
									</p>
								</div>
								<button
									onClick={() => {
										setJoinModal(false);
										setJoinCode("");
										setJoinError("");
									}}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									<X size={20} />
								</button>
							</div>
						</div>
						<div className="p-6">
							<input
								type="text"
								placeholder="e.g., CS101-A"
								value={joinCode}
								onChange={(e) => {
									setJoinCode(e.target.value.toUpperCase());
									setJoinError("");
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !joinLoading) {
										handleJoinSubject();
									}
								}}
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all uppercase font-mono tracking-wider"
								autoFocus
								disabled={joinLoading}
							/>
							{joinError && (
								<div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
									<AlertCircle size={16} className="shrink-0 mt-0.5" />
									<span>{joinError}</span>
								</div>
							)}
						</div>
						<div className="p-6 pt-0 flex gap-3">
							<button
								onClick={() => {
									setJoinModal(false);
									setJoinCode("");
									setJoinError("");
								}}
								disabled={joinLoading}
								className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={handleJoinSubject}
								disabled={joinLoading || !joinCode.trim()}
								className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{joinLoading ? (
									<>
										<Loader2 size={16} className="animate-spin" />
										Joining...
									</>
								) : (
									"Join Subject"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

// ============================================
// SUBJECT CARD COMPONENT
// ============================================
const SubjectCard = ({ enrollment, onNavigate, onUnenroll }) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const [colorPickerOpen, setColorPickerOpen] = useState(false);
	const [accentColor, setAccentColor] = useState(
		enrollment.accent_color || "classly-green"
	);

	const subject = enrollment.subject;
	const instructor = subject?.instructor;

	const colors = [
		{ name: "Green", value: "classly-green" },
		{ name: "Gold", value: "classly-gold" },
		{ name: "Blue", value: "blue-500" },
		{ name: "Purple", value: "purple-500" },
		{ name: "Pink", value: "pink-500" },
		{ name: "Red", value: "red-500" },
	];

	const getColorClasses = (color) => {
		const colorMap = {
			"classly-green": {
				border: "border-t-classly-green",
				badge: "text-classly-green bg-green-50",
				swatch: "bg-classly-green",
			},
			"classly-gold": {
				border: "border-t-classly-gold",
				badge: "text-classly-gold bg-orange-50",
				swatch: "bg-classly-gold",
			},
			"blue-500": {
				border: "border-t-blue-500",
				badge: "text-blue-600 bg-blue-50",
				swatch: "bg-blue-500",
			},
			"purple-500": {
				border: "border-t-purple-500",
				badge: "text-purple-600 bg-purple-50",
				swatch: "bg-purple-500",
			},
			"pink-500": {
				border: "border-t-pink-500",
				badge: "text-pink-600 bg-pink-50",
				swatch: "bg-pink-500",
			},
			"red-500": {
				border: "border-t-red-500",
				badge: "text-red-600 bg-red-50",
				swatch: "bg-red-500",
			},
		};
		return colorMap[color] || colorMap["classly-green"];
	};

	const currentColors = getColorClasses(accentColor);

	const handleColorChange = async (newColor) => {
		setAccentColor(newColor);
		// TODO: Persist to database
		// await db.enrollments.update(enrollment.id, { accent_color: newColor });
	};

	return (
		<div
			onClick={() => onNavigate(subject.id)}
			className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden border-t-4 ${currentColors.border}`}
		>
			<div className="flex justify-between items-start mb-4">
				<span
					className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${currentColors.badge}`}
				>
					{subject.code}
				</span>
				<div className="relative">
					<button
						onClick={(e) => {
							e.stopPropagation();
							setMenuOpen(!menuOpen);
						}}
						className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<MoreHorizontal size={18} />
					</button>

					{menuOpen && (
						<>
							<div
								className="fixed inset-0 z-10"
								onClick={() => {
									setMenuOpen(false);
									setColorPickerOpen(false);
								}}
							></div>
							<div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
								<button
									onClick={(e) => {
										e.stopPropagation();
										setColorPickerOpen(!colorPickerOpen);
									}}
									className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
								>
									Change Color
								</button>

								{colorPickerOpen && (
									<div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
										<div className="grid grid-cols-6 gap-2">
											{colors.map((color) => {
												const colorClasses = getColorClasses(color.value);
												return (
													<button
														key={color.name}
														onClick={(e) => {
															e.stopPropagation();
															handleColorChange(color.value);
															setColorPickerOpen(false);
															setMenuOpen(false);
														}}
														className={`w-7 h-7 rounded-full ${
															colorClasses.swatch
														} hover:ring-2 hover:ring-gray-300 transition-all ${
															accentColor === color.value
																? "ring-2 ring-gray-400"
																: ""
														}`}
														title={color.name}
													/>
												);
											})}
										</div>
									</div>
								)}

								<button
									onClick={(e) => {
										e.stopPropagation();
										setMenuOpen(false);
										onUnenroll(subject.id, subject.name);
									}}
									className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors"
								>
									Unenroll
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			<div>
				<h3 className="text-lg font-bold text-gray-900 mb-6 group-hover:text-classly-green transition-colors line-clamp-2">
					{subject.name}
				</h3>

				<div className="flex items-center gap-3 pt-4 border-t border-gray-50">
					<img
						src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
							instructor?.full_name || "User"
						}`}
						alt={instructor?.full_name}
						className="w-8 h-8 rounded-full bg-gray-100"
					/>
					<div className="flex flex-col">
						<span className="text-sm font-medium text-gray-700">
							{instructor?.full_name || "Unknown"}
						</span>
						<span className="text-xs text-gray-400 flex items-center gap-1">
							<Clock size={10} /> {subject.schedule || "TBA"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

// ============================================
// LOADING SKELETON
// ============================================
const LoadingSkeleton = () => {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="flex gap-3">
				<div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
				<div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
			</div>

			<div className="flex justify-between items-center">
				<div className="h-8 w-40 bg-gray-200 rounded"></div>
				<div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
					>
						<div className="h-6 w-20 bg-gray-200 rounded"></div>
						<div className="h-8 w-full bg-gray-200 rounded"></div>
						<div className="flex items-center gap-3 pt-4">
							<div className="w-8 h-8 bg-gray-200 rounded-full"></div>
							<div className="space-y-2 flex-1">
								<div className="h-4 w-3/4 bg-gray-200 rounded"></div>
								<div className="h-3 w-1/2 bg-gray-200 rounded"></div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (date) => {
	const options = { month: "short", day: "numeric" };
	return date.toLocaleDateString("en-US", options);
};

export default StudentDashboard;
