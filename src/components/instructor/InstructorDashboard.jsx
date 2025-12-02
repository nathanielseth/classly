import React, { useState, useEffect, useCallback } from "react";
import {
	Plus,
	Users,
	BookOpen,
	Bell,
	MoreVertical,
	Loader2,
	AlertCircle,
	X,
	Copy,
	Check,
	Trash2,
} from "lucide-react";
import { db } from "../../lib/supabase";

const InstructorDashboard = ({ onNavigate, userId }) => {
	const [createModal, setCreateModal] = useState(false);
	const [subjects, setSubjects] = useState([]);

	const [initialLoading, setInitialLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);

	const [formData, setFormData] = useState({
		code: "",
		name: "",
		description: "",
		schedule: "",
		room: "",
	});
	const [formLoading, setFormLoading] = useState(false);
	const [formError, setFormError] = useState("");

	const loadSubjects = useCallback(
		async (isBackgroundRefresh = false) => {
			try {
				if (!isBackgroundRefresh) {
					setInitialLoading(true);
				} else {
					setRefreshing(true);
				}

				setError(null);

				const { data, error: fetchError } = await db.subjects.getByInstructor(
					userId
				);

				if (fetchError) throw fetchError;

				const subjectsWithStats = await Promise.all(
					(data || []).map(async (subject) => {
						const [enrollments, materials, announcements] = await Promise.all(
							[
								db.enrollments.getBySubject(subject.id),
								db.materials.getBySubject(subject.id),
								db.announcements.getBySubject(subject.id, 999),
							]
						);

						return {
							...subject,
							studentCount: enrollments.data?.length || 0,
							assignmentCount: materials.data?.length || 0,
							announcementCount: announcements.data?.length || 0,
						};
					})
				);

				setSubjects(subjectsWithStats);
			} catch (err) {
				console.error("Load subjects error:", err);
				if (!isBackgroundRefresh) {
					setError(err.message || "Failed to load subjects");
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
			loadSubjects(false);
		}
	}, [userId, loadSubjects]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && userId && !initialLoading) {
				loadSubjects(true);
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () =>
			document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [userId, initialLoading, loadSubjects]);

	const generateCode = () => {
		const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		let code = "";
		for (let i = 0; i < 6; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return code;
	};

	const handleCreateSubject = async () => {
		if (!formData.code.trim() || !formData.name.trim()) {
			setFormError("Subject code and name are required");
			return;
		}

		try {
			setFormLoading(true);
			setFormError("");

			const { error: createError } = await db.subjects.create({
				code: formData.code.toUpperCase(),
				name: formData.name,
				description: formData.description || null,
				schedule: formData.schedule || null,
				room: formData.room || null,
				instructor_id: userId,
			});

			if (createError) {
				if (createError.code === "23505") {
					throw new Error(
						"Subject code already exists. Please use a different code."
					);
				}
				throw createError;
			}

			await loadSubjects(true);
			setCreateModal(false);
			setFormData({
				code: "",
				name: "",
				description: "",
				schedule: "",
				room: "",
			});
		} catch (err) {
			console.error("Create subject error:", err);
			setFormError(err.message || "Failed to create subject");
		} finally {
			setFormLoading(false);
		}
	};

	const handleDeleteSubject = async (subjectId, subjectName) => {
		const confirmed = window.confirm(
			`Are you sure you want to delete "${subjectName}"? This will remove all materials, announcements, and enrollments. This action cannot be undone.`
		);

		if (!confirmed) return;

		try {
			const { error: deleteError } = await db.subjects.delete(subjectId);
			if (deleteError) throw deleteError;

			await loadSubjects(true);
		} catch (err) {
			console.error("Delete subject error:", err);
			alert(`Failed to delete subject: ${err.message}`);
		}
	};

	if (initialLoading && subjects.length === 0) {
		return (
			<div className="max-w-7xl mx-auto">
				<LoadingSkeleton />
			</div>
		);
	}

	if (error && subjects.length === 0) {
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
							onClick={() => loadSubjects(false)}
							className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
						>
							Try Again
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Background Refresh Indicator */}
			{refreshing && (
				<div className="fixed top-20 right-6 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 z-50 animate-in slide-in-from-right duration-200">
					<Loader2 size={16} className="animate-spin text-classly-green" />
					<span className="text-sm text-gray-600">Updating...</span>
				</div>
			)}

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Your Subjects</h1>
					<p className="text-sm text-gray-500 mt-1">
						Manage your classes and materials
					</p>
				</div>
				<button
					onClick={() => {
						setCreateModal(true);
						setFormData({ ...formData, code: generateCode() });
					}}
					className="flex items-center gap-2 px-4 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-all shadow-sm hover:shadow-md"
				>
					<Plus size={18} strokeWidth={2.5} />
					Create Subject
				</button>
			</div>

			{subjects.length === 0 ? (
				<div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<BookOpen size={28} className="text-gray-400" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No subjects yet
					</h3>
					<p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
						Create your first subject to start managing classes and materials
					</p>
					<button
						onClick={() => {
							setCreateModal(true);
							setFormData({ ...formData, code: generateCode() });
						}}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-all shadow-sm"
					>
						<Plus size={18} strokeWidth={2.5} />
						Create Your First Subject
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{subjects.map((subject) => (
						<SubjectCard
							key={subject.id}
							subject={subject}
							onNavigate={onNavigate}
							onDelete={handleDeleteSubject}
						/>
					))}
				</div>
			)}

			{createModal && (
				<CreateSubjectModal
					formData={formData}
					setFormData={setFormData}
					formLoading={formLoading}
					formError={formError}
					onClose={() => {
						setCreateModal(false);
						setFormData({
							code: "",
							name: "",
							description: "",
							schedule: "",
							room: "",
						});
						setFormError("");
					}}
					onSubmit={handleCreateSubject}
					onRegenerateCode={() =>
						setFormData({ ...formData, code: generateCode() })
					}
				/>
			)}
		</div>
	);
};

const SubjectCard = ({ subject, onNavigate, onDelete }) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleCopyCode = (e) => {
		e.stopPropagation();
		navigator.clipboard.writeText(subject.code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div
			onClick={() => onNavigate(subject.id)}
			className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden border-t-4 border-t-classly-green"
		>
			<div className="flex justify-between items-start mb-4">
				<button
					onClick={handleCopyCode}
					className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded bg-green-50 text-classly-green hover:bg-green-100 transition-colors"
				>
					{subject.code}
					{copied ? <Check size={12} /> : <Copy size={12} />}
				</button>

				<div className="relative">
					<button
						onClick={(e) => {
							e.stopPropagation();
							setMenuOpen(!menuOpen);
						}}
						className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<MoreVertical size={18} />
					</button>

					{menuOpen && (
						<>
							<div
								className="fixed inset-0 z-10"
								onClick={() => setMenuOpen(false)}
							/>
							<div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
								<button
									onClick={(e) => {
										e.stopPropagation();
										setMenuOpen(false);
										onDelete(subject.id, subject.name);
									}}
									className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
								>
									<Trash2 size={14} />
									Delete
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			<h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-classly-green transition-colors line-clamp-2">
				{subject.name}
			</h3>

			{subject.description && (
				<p className="text-sm text-gray-500 mb-4 line-clamp-2">
					{subject.description}
				</p>
			)}

			<div className="flex items-center gap-4 pt-4 border-t border-gray-50">
				<div className="flex items-center gap-1.5 text-gray-600">
					<Users size={14} />
					<span className="text-xs font-medium">{subject.studentCount}</span>
				</div>
				<div className="flex items-center gap-1.5 text-gray-600">
					<BookOpen size={14} />
					<span className="text-xs font-medium">{subject.assignmentCount}</span>
				</div>
				<div className="flex items-center gap-1.5 text-gray-600">
					<Bell size={14} />
					<span className="text-xs font-medium">
						{subject.announcementCount}
					</span>
				</div>
			</div>

			{(subject.schedule || subject.room) && (
				<div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
					{subject.schedule && <div>{subject.schedule}</div>}
					{subject.room && <div>Room: {subject.room}</div>}
				</div>
			)}
		</div>
	);
};

const CreateSubjectModal = ({
	formData,
	setFormData,
	formLoading,
	formError,
	onClose,
	onSubmit,
	onRegenerateCode,
}) => {
	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
				<div className="p-6 border-b border-gray-100">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-bold text-gray-900">
								Create New Subject
							</h2>
							<p className="text-sm text-gray-500 mt-1">
								Fill in the details for your new class
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Subject Code <span className="text-red-500">*</span>
						</label>
						<div className="flex gap-2">
							<input
								type="text"
								value={formData.code}
								onChange={(e) =>
									setFormData({
										...formData,
										code: e.target.value.toUpperCase(),
									})
								}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all uppercase font-mono"
								placeholder="CS101"
								maxLength={10}
							/>
							<button
								onClick={onRegenerateCode}
								className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
							>
								Generate
							</button>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Subject Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
							placeholder="Introduction to Computer Science"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Description
						</label>
						<textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
							placeholder="Brief description of the subject"
							rows={3}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Schedule
							</label>
							<input
								type="text"
								value={formData.schedule}
								onChange={(e) =>
									setFormData({ ...formData, schedule: e.target.value })
								}
								className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
								placeholder="MWF 10:00 AM"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Room
							</label>
							<input
								type="text"
								value={formData.room}
								onChange={(e) =>
									setFormData({ ...formData, room: e.target.value })
								}
								className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
								placeholder="Room 101"
							/>
						</div>
					</div>

					{formError && (
						<div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
							<AlertCircle size={16} className="shrink-0 mt-0.5" />
							<span>{formError}</span>
						</div>
					)}
				</div>

				<div className="p-6 pt-0 flex gap-3">
					<button
						onClick={onClose}
						disabled={formLoading}
						className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						onClick={onSubmit}
						disabled={
							formLoading || !formData.code.trim() || !formData.name.trim()
						}
						className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{formLoading ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Creating...
							</>
						) : (
							"Create Subject"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

const LoadingSkeleton = () => {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="flex justify-between items-center">
				<div className="space-y-2">
					<div className="h-8 w-48 bg-gray-200 rounded" />
					<div className="h-4 w-64 bg-gray-200 rounded" />
				</div>
				<div className="h-10 w-40 bg-gray-200 rounded-lg" />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
					>
						<div className="flex justify-between">
							<div className="h-6 w-20 bg-gray-200 rounded" />
							<div className="h-6 w-6 bg-gray-200 rounded" />
						</div>
						<div className="h-8 w-full bg-gray-200 rounded" />
						<div className="h-16 w-full bg-gray-200 rounded" />
						<div className="flex gap-4 pt-4">
							<div className="h-5 w-12 bg-gray-200 rounded" />
							<div className="h-5 w-12 bg-gray-200 rounded" />
							<div className="h-5 w-12 bg-gray-200 rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default InstructorDashboard;
