import React, { useState, useEffect } from "react";
import {
	LayoutDashboard,
	BookOpen,
	Calendar,
	MessageSquare,
	Bot,
	LogOut,
	ChevronDown,
	Settings,
	Loader2,
} from "lucide-react";
import { db } from "../../lib/supabase";

const Sidebar = ({ currentView, setView, isOpen, onLogout, userRole, userId, onSubjectSelect }) => {
	const [isHovered, setIsHovered] = useState(false);
	const [subjectsExpanded, setSubjectsExpanded] = useState(true);
	const [subjects, setSubjects] = useState([]);
	const [loading, setLoading] = useState(true);

	const showFull = isOpen || isHovered;

	const menuItems = [
		{ id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
		{ id: "calendar", name: "Calendar", icon: Calendar },
		{ id: "messages", name: "Messages", icon: MessageSquare },
		{ id: "ai", name: "AI Assistant", icon: Bot },
	];

	// Get appropriate label based on role
	const subjectsLabel = userRole === "instructor" ? "My Subjects" : "Enrolled";

	// Load subjects based on user role
	useEffect(() => {
		const loadSubjects = async () => {
			if (!userId) return;

			try {
				setLoading(true);
				
				if (userRole === "instructor") {
					// Load subjects taught by instructor
					const { data, error } = await db.subjects.getByInstructor(userId);
					if (error) throw error;
					setSubjects(data || []);
				} else if (userRole === "student") {
					// Load enrolled subjects
					const { data, error } = await db.enrollments.getByStudent(userId);
					if (error) throw error;
					// Extract subjects from enrollments
					const subjectsList = (data || [])
						.map(enrollment => enrollment.subject)
						.filter(Boolean);
					setSubjects(subjectsList);
				}
			} catch (err) {
				console.error("Error loading subjects:", err);
				setSubjects([]);
			} finally {
				setLoading(false);
			}
		};

		loadSubjects();
	}, [userId, userRole]);

	const handleSubjectClick = (subjectId) => {
		setView("classroom");
		if (onSubjectSelect) {
			onSubjectSelect(subjectId);
		}
	};

	return (
		<aside
			onMouseEnter={() => !isOpen && setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={`flex flex-col bg-white border-r border-gray-200 transition-[width] duration-200 ease-in-out z-30 ${
				showFull ? "w-64" : "w-20"
			}`}
		>
			{/* Main Navigation */}
			<nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
				<div className="space-y-1 mt-2">
					{menuItems.map((item) => (
						<button
							key={item.id}
							onClick={() => setView(item.id)}
							className={`relative w-full flex items-center ${
								showFull ? "gap-3 px-3" : "justify-center px-0"
							} py-2.5 rounded-lg transition-all group cursor-pointer ${
								currentView === item.id
									? "bg-classly-green/10 text-classly-green font-medium"
									: "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
							}`}
						>
							<item.icon
								size={20}
								strokeWidth={currentView === item.id ? 2.5 : 2}
								className="shrink-0"
							/>

							<span
								className={`text-sm whitespace-nowrap transition-opacity ${
									showFull ? "opacity-100" : "opacity-0 w-0"
								}`}
							>
								{item.name}
							</span>

							{/* Tooltip for collapsed state */}
							{!showFull && (
								<div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
									{item.name}
								</div>
							)}
						</button>
					))}
				</div>

				{/* Subjects Section */}
				<div className="mt-6">
					<button
						onClick={() => setSubjectsExpanded(!subjectsExpanded)}
						className={`relative w-full flex items-center py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer group ${
							showFull ? "justify-between px-3 gap-3" : "justify-center"
						}`}
					>
						<div className={`flex items-center ${showFull ? "gap-3" : ""}`}>
							<BookOpen size={20} strokeWidth={2} className="shrink-0" />
							<span
								className={`text-sm font-medium transition-opacity ${
									showFull ? "opacity-100" : "opacity-0 w-0"
								}`}
							>
								{subjectsLabel}
							</span>
						</div>
						<ChevronDown
							size={16}
							className={`transition-all duration-200 ${
								subjectsExpanded ? "rotate-0" : "-rotate-90"
							} ${showFull ? "opacity-100" : "opacity-0 w-0"}`}
						/>

						{/* Tooltip for collapsed state */}
						{!showFull && (
							<div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
								{subjectsLabel}
							</div>
						)}
					</button>

					<div
						className={`overflow-hidden transition-all duration-300 ${
							subjectsExpanded && showFull
								? "max-h-96 opacity-100"
								: "max-h-0 opacity-0"
						}`}
					>
						{loading ? (
							<div className="flex items-center justify-center py-4">
								<Loader2 size={16} className="animate-spin text-gray-400" />
							</div>
						) : subjects.length === 0 ? (
							<div className="px-3 py-2 text-xs text-gray-400 text-center">
								{userRole === "instructor" ? "No subjects created" : "No enrollments"}
							</div>
						) : (
							<div className="space-y-0.5 mt-1">
								{subjects.map((subject) => (
									<button
										key={subject.id}
										onClick={() => handleSubjectClick(subject.id)}
										className="w-full flex items-center gap-3 pl-9 pr-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-classly-green rounded-lg transition-colors cursor-pointer group"
										title={subject.name}
									>
										<div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-classly-green transition-colors shrink-0"></div>
										<span className="truncate text-left">
											{subject.name}
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</nav>

			{/* Footer Actions */}
			<div className="p-3 border-t border-gray-100 space-y-1">
				<button
					className={`relative w-full flex items-center ${
						showFull ? "gap-3 px-3" : "justify-center px-0"
					} py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer group`}
				>
					<Settings size={20} className="shrink-0" />
					<span
						className={`text-sm whitespace-nowrap transition-opacity ${
							showFull ? "opacity-100" : "opacity-0 w-0"
						}`}
					>
						Settings
					</span>

					{!showFull && (
						<div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
							Settings
						</div>
					)}
				</button>

				<button
					onClick={onLogout}
					className={`relative w-full flex items-center ${
						showFull ? "gap-3 px-3" : "justify-center px-0"
					} py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer group`}
				>
					<LogOut size={20} className="shrink-0" />
					<span
						className={`text-sm whitespace-nowrap transition-opacity ${
							showFull ? "opacity-100" : "opacity-0 w-0"
						}`}
					>
						Log Out
					</span>

					{!showFull && (
						<div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
							Log Out
						</div>
					)}
				</button>
			</div>
		</aside>
	);
};

export default Sidebar;