import React, { useState, useEffect } from "react";
import {
	ArrowLeft,
	MessageSquare,
	FileText,
	Users,
	Clock,
	Pin,
	Loader2,
	AlertCircle,
	BookOpen,
	MoreVertical,
} from "lucide-react";
import { db } from "../../lib/supabase";

const StudentClassroomView = ({ subjectId, onBack }) => {
	const [activeTab, setActiveTab] = useState("stream");
	const [subject, setSubject] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (subjectId) {
			loadSubject();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [subjectId]);

	const loadSubject = async () => {
		try {
			setLoading(true);
			const { data, error: subjectError } = await db.subjects.getById(
				subjectId
			);

			if (subjectError) throw subjectError;
			if (!data) throw new Error("Subject not found");

			setSubject(data);
		} catch (err) {
			console.error("Subject load error:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Loader2 className="w-8 h-8 text-classly-green animate-spin" />
			</div>
		);
	}

	if (error || !subject) {
		return (
			<div className="min-h-screen bg-gray-50 p-6">
				<div className="max-w-md mx-auto mt-20">
					<div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
						<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
						<div>
							<h3 className="font-semibold text-red-900 mb-1">
								Unable to load classroom
							</h3>
							<p className="text-sm text-red-700">
								{error || "No subject found"}
							</p>
							<button
								onClick={onBack}
								className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
							>
								Go Back
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<header className="bg-linear-to-r from-classly-green to-emerald-600 text-white shadow-md">
				<div className="px-6 py-6 max-w-7xl mx-auto">
					<div className="flex items-center gap-4 mb-4">
						<button
							onClick={onBack}
							className="p-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
						>
							<ArrowLeft size={20} />
						</button>
						<div className="flex-1">
							<div className="flex items-center gap-3 mb-2">
								<span className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full uppercase tracking-wide">
									{subject.code}
								</span>
								<span className="text-xs text-white/70 flex items-center gap-1">
									<Clock size={12} />
									{subject.schedule || "TBA"}
								</span>
								{subject.room && (
									<span className="text-xs text-white/70">
										• {subject.room}
									</span>
								)}
							</div>
							<h1 className="text-3xl font-bold text-white">{subject.name}</h1>
							{subject.instructor && (
								<p className="text-sm text-white/80 mt-1">
									{subject.instructor.full_name}
								</p>
							)}
						</div>
					</div>

					<div className="flex gap-1 border-b border-white/20">
						{["stream", "modules", "people"].map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`px-6 py-3 text-sm font-medium capitalize transition-all ${
									activeTab === tab
										? "text-white border-b-2 border-white"
										: "text-white/60 hover:text-white/90"
								}`}
							>
								{tab}
							</button>
						))}
					</div>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto">
				<div className="max-w-5xl mx-auto py-6">
					{activeTab === "stream" && <StreamTab subjectId={subject.id} />}
					{activeTab === "modules" && <ModulesTab subjectId={subject.id} />}
					{activeTab === "people" && (
						<PeopleTab subjectId={subject.id} subject={subject} />
					)}
				</div>
			</div>
		</div>
	);
};

const StreamTab = ({ subjectId }) => {
	const [announcements, setAnnouncements] = useState([]);
	const [assignments, setAssignments] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadStreamData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [subjectId]);

	const loadStreamData = async () => {
		try {
			setLoading(true);

			const [announcementsResult, assignmentsResult] = await Promise.all([
				db.announcements.getBySubject(subjectId),
				db.assignments.getBySubject(subjectId),
			]);

			setAnnouncements(announcementsResult.data || []);
			setAssignments(assignmentsResult.data || []);
		} catch (err) {
			console.error("Stream load error:", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="px-6 py-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
				</div>
			</div>
		);
	}

	const formatTimeAgo = (date) => {
		const seconds = Math.floor((new Date() - new Date(date)) / 1000);
		if (seconds < 60) return "Just now";
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
		return new Date(date).toLocaleDateString();
	};

	const formatDueDate = (dueDate) => {
		const due = new Date(dueDate);
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const isToday = due.toDateString() === today.toDateString();
		const isTomorrow = due.toDateString() === tomorrow.toDateString();

		if (isToday) return { text: "Due today", color: "red", urgency: "high" };
		if (isTomorrow)
			return { text: "Due tomorrow", color: "orange", urgency: "medium" };
		return {
			text: `Due ${due.toLocaleDateString()}`,
			color: "yellow",
			urgency: "low",
		};
	};

	return (
		<div className="px-6 space-y-4">
			{announcements.map((announcement) => (
				<div
					key={announcement.id}
					className={`${
						announcement.pinned
							? "bg-linear-to-r from-green-50 to-emerald-50 border-l-4 border-classly-green"
							: "bg-white border border-gray-200"
					} rounded-xl p-5 shadow-sm`}
				>
					<div className="flex items-start gap-3">
						{announcement.pinned && (
							<Pin size={16} className="text-classly-green mt-1 shrink-0" />
						)}
						<img
							src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
								announcement.author?.full_name || "Unknown"
							}`}
							alt={announcement.author?.full_name}
							className="w-10 h-10 rounded-full"
						/>
						<div className="flex-1">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-1.5">
									<p className="text-sm font-semibold text-gray-900">
										{announcement.author?.full_name || "Unknown"}
									</p>
									<svg
										className="w-4 h-4 text-blue-500"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
									<span className="text-xs text-gray-500">
										• {formatTimeAgo(announcement.created_at)}
									</span>
								</div>
								<button className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors">
									<MoreVertical size={16} />
								</button>
							</div>
							{announcement.title && (
								<p className="text-sm font-semibold text-gray-900 mb-1">
									{announcement.title}
								</p>
							)}
							<p className="text-sm text-gray-700 leading-relaxed mb-3">
								{announcement.content}
							</p>
							<div className="flex items-center gap-4 text-xs text-gray-500">
								<button className="flex items-center gap-1 hover:text-classly-green transition-colors">
									<MessageSquare size={14} />
									<span>Comment</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			))}

			{assignments.slice(0, 3).map((assignment) => {
				const dueInfo = formatDueDate(assignment.due_date);
				return (
					<div
						key={assignment.id}
						className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
					>
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
								<FileText size={18} className="text-red-600" />
							</div>
							<div className="flex-1">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm font-semibold text-gray-900">
										New Assignment Posted
									</p>
									<span className="text-xs text-gray-500">
										{formatTimeAgo(assignment.created_at)}
									</span>
								</div>
								<p className="text-sm font-medium text-gray-900 mb-1">
									{assignment.title}
								</p>
								{assignment.description && (
									<p className="text-sm text-gray-600 mb-3">
										{assignment.description}
									</p>
								)}
								<div className="flex items-center gap-3 text-xs flex-wrap">
									<span
										className={`flex items-center gap-1 font-medium bg-${dueInfo.color}-50 text-${dueInfo.color}-600 px-2 py-1 rounded`}
									>
										<Clock size={12} />
										{dueInfo.text}
									</span>
									<span className="text-gray-500">
										{assignment.max_points} points
									</span>
								</div>
							</div>
						</div>
					</div>
				);
			})}

			{announcements.length === 0 && assignments.length === 0 && (
				<div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<MessageSquare size={28} className="text-gray-400" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No posts yet
					</h3>
					<p className="text-sm text-gray-500">
						Check back later for announcements and assignments
					</p>
				</div>
			)}
		</div>
	);
};

const ModulesTab = ({ subjectId }) => {
	const [assignments, setAssignments] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadAssignments();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [subjectId]);

	const loadAssignments = async () => {
		try {
			const { data, error } = await db.assignments.getBySubject(subjectId);
			if (error) throw error;
			setAssignments(data || []);
		} catch (err) {
			console.error("Assignments load error:", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="px-6 py-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
				</div>
			</div>
		);
	}

	if (assignments.length === 0) {
		return (
			<div className="px-6 py-6">
				<div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<BookOpen size={28} className="text-gray-400" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No modules yet
					</h3>
					<p className="text-sm text-gray-500">
						Your instructor hasn't posted any content yet
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="px-6 space-y-4">
			<div className="bg-white border-2 border-classly-green rounded-xl overflow-hidden shadow-sm">
				<div className="p-4 bg-green-50 border-b border-green-100 flex justify-between items-center">
					<h3 className="font-semibold text-gray-900">Current Assignments</h3>
					<span className="text-xs font-bold text-classly-green bg-white px-2 py-1 rounded uppercase tracking-wide">
						{assignments.length} Active
					</span>
				</div>
				<div className="divide-y divide-gray-100">
					{assignments.map((assignment) => {
						const dueDate = new Date(assignment.due_date);
						const isOverdue = dueDate < new Date();

						return (
							<div
								key={assignment.id}
								className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
							>
								<div className="flex items-center gap-3">
									<div
										className={`w-9 h-9 rounded-lg ${
											isOverdue ? "bg-red-50" : "bg-blue-50"
										} flex items-center justify-center shrink-0`}
									>
										<FileText
											size={16}
											className={isOverdue ? "text-red-600" : "text-blue-600"}
										/>
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium text-gray-900">
											{assignment.title}
										</p>
										<div className="flex items-center gap-2 mt-1">
											<span
												className={`text-xs font-medium ${
													isOverdue
														? "text-red-600 bg-red-50"
														: "text-orange-600 bg-orange-50"
												} px-2 py-0.5 rounded`}
											>
												{isOverdue
													? "Overdue"
													: `Due ${dueDate.toLocaleDateString()}`}
											</span>
											<span className="text-xs text-gray-500">
												{assignment.max_points} points
											</span>
											<span className="text-xs text-gray-400 capitalize">
												• {assignment.type}
											</span>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

const PeopleTab = ({ subjectId, subject }) => {
	const [enrollments, setEnrollments] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadPeople();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [subjectId]);

	const loadPeople = async () => {
		try {
			const { data, error } = await db.enrollments.getBySubject(subjectId);
			if (error) throw error;
			setEnrollments(data || []);
		} catch (err) {
			console.error("People load error:", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="px-6 py-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
				</div>
			</div>
		);
	}

	const instructor = subject.instructor;

	return (
		<div className="px-6 space-y-6">
			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-3">Instructor</h2>
				<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
					<div className="flex items-center gap-3">
						<img
							src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
								instructor?.full_name || "Instructor"
							}`}
							alt={instructor?.full_name}
							className="w-12 h-12 rounded-full bg-gray-100"
						/>
						<div className="flex-1">
							<div className="flex items-center gap-1.5">
								<p className="text-sm font-semibold text-gray-900">
									{instructor?.full_name || "Unknown"}
								</p>
								<svg
									className="w-4 h-4 text-blue-500"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<p className="text-xs text-gray-500 mt-0.5">Lead Instructor</p>
							<p className="text-xs text-gray-400 mt-0.5">
								{instructor?.email}
							</p>
						</div>
						<button className="px-3 py-1.5 text-sm font-medium text-classly-green hover:bg-green-50 rounded-lg transition-colors">
							Message
						</button>
					</div>
				</div>
			</div>

			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
					Classmates
					<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
						{enrollments.length}
					</span>
				</h2>
				<div className="bg-white border border-gray-200 rounded-xl shadow-sm">
					{enrollments.length === 0 ? (
						<div className="p-8 text-center text-gray-500 text-sm">
							No other students enrolled yet
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
							{enrollments.map((enrollment, index) => (
								<div
									key={enrollment.id}
									className={`p-4 hover:bg-gray-50 transition-colors ${
										index % 2 === 0 && index !== enrollments.length - 1
											? "sm:border-b sm:border-gray-100"
											: ""
									}`}
								>
									<div className="flex items-center gap-3">
										<img
											src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
												enrollment.student?.full_name || "Student"
											}`}
											alt={enrollment.student?.full_name}
											className="w-10 h-10 rounded-full bg-gray-100"
										/>
										<p className="text-sm font-medium text-gray-900">
											{enrollment.student?.full_name || "Unknown Student"}
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default StudentClassroomView;
