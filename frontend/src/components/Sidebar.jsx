import React, { useState } from "react";
import {
	LayoutDashboard,
	BookOpen,
	Calendar,
	MessageSquare,
	Bot,
	LogOut,
	ChevronDown,
	Settings,
	HelpCircle,
} from "lucide-react";

const Sidebar = ({ currentView, setView, isOpen }) => {
	const [isHovered, setIsHovered] = useState(false);
	const [enrolledExpanded, setEnrolledExpanded] = useState(true);

	const showFull = isOpen || isHovered;

	const menuItems = [
		{ id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
		{ id: "calendar", name: "Calendar", icon: Calendar },
		{ id: "messages", name: "Messages", icon: MessageSquare },
		{ id: "ai", name: "AI Assistant", icon: Bot },
	];

	const courses = [
		{ id: "it101", code: "IT 101", name: "Intro to Computing" },
		{ id: "math104", code: "MATH 104", name: "Calculus I" },
		{ id: "hist12", code: "HIST 12", name: "Readings in PH History" },
	];

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
								className={`text-sm whitespace-nowrap ${
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

				{/* Enrolled Courses Section */}
				<div className="mt-6">
					<button
						onClick={() => setEnrolledExpanded(!enrolledExpanded)}
						className={`relative w-full flex items-center py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer group ${
							showFull ? "justify-between px-3 gap-3" : "justify-center"
						}`}
					>
						<div className={`flex items-center ${showFull ? "gap-3" : ""}`}>
							<BookOpen size={20} strokeWidth={2} className="shrink-0" />
							<span
								className={`text-sm font-medium ${
									showFull ? "opacity-100" : "opacity-0 w-0"
								}`}
							>
								Enrolled
							</span>
						</div>
						<ChevronDown
							size={16}
							className={`transition-all duration-200 ${
								enrolledExpanded ? "rotate-0" : "-rotate-90"
							} ${showFull ? "opacity-100" : "opacity-0 w-0"}`}
						/>

						{/* Tooltip for collapsed state */}
						{!showFull && (
							<div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
								Enrolled
							</div>
						)}
					</button>

					<div
						className={`overflow-hidden transition-all duration-300 ${
							enrolledExpanded && showFull
								? "max-h-96 opacity-100"
								: "max-h-0 opacity-0"
						}`}
					>
						<div className="space-y-0.5 mt-1">
							{courses.map((course) => (
								<button
									key={course.id}
									onClick={() => setView(course.id)}
									className="w-full flex items-center gap-3 pl-9 pr-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-classly-green rounded-lg transition-colors cursor-pointer group"
								>
									<div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-classly-green transition-colors shrink-0"></div>
									<span className="truncate text-left">{course.name}</span>
								</button>
							))}
						</div>
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
						className={`text-sm whitespace-nowrap ${
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
					className={`relative w-full flex items-center ${
						showFull ? "gap-3 px-3" : "justify-center px-0"
					} py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer group`}
				>
					<LogOut size={20} className="shrink-0" />
					<span
						className={`text-sm whitespace-nowrap ${
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
