import React, { useState } from "react";
import {
	Clock,
	MoreHorizontal,
	CheckCircle,
	ArrowRight,
	Plus,
} from "lucide-react";

const StudentDashboard = ({ onNavigate }) => {
	const [joinModal, setJoinModal] = useState(false);

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* To-Do Banner - Modern Inline Pills */}
			<div className="flex items-center gap-3 flex-wrap">
				<div className="flex items-center gap-2 text-sm text-gray-600">
					<CheckCircle size={16} className="text-classly-green" />
					<span className="font-medium">Due soon:</span>
				</div>

				<div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors cursor-pointer group">
					<div className="flex items-center gap-2 flex-1">
						<span className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
							Final Project Proposal
						</span>
						<span className="text-xs text-gray-400">•</span>
						<span className="text-xs text-gray-500">IT 101</span>
					</div>
					<span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
						Today
					</span>
				</div>

				<div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer group">
					<div className="flex items-center gap-2 flex-1">
						<span className="text-sm font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
							Calculus Problem Set 3
						</span>
						<span className="text-xs text-gray-400">•</span>
						<span className="text-xs text-gray-500">MATH 104</span>
					</div>
					<span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
						Tomorrow
					</span>
				</div>

				<button className="ml-auto text-sm font-medium text-classly-green hover:text-classly-green/80 flex items-center gap-1 transition-colors cursor-pointer">
					View all <ArrowRight size={14} />
				</button>
			</div>

			{/* Subject Grid */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
						Your Subjects
						<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
							3
						</span>
					</h2>
					<button
						onClick={() => setJoinModal(true)}
						className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-classly-green hover:bg-green-50 rounded-lg transition-all cursor-pointer"
					>
						<Plus size={16} strokeWidth={2.5} />
						Join Subject
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					<SubjectCard
						code="IT 101"
						title="Intro to Computing"
						instructor="Prof. Val"
						schedule="Mon/Thu • 8:00 AM"
						avatar="Val"
						accentColor="classly-green"
						onClick={onNavigate}
					/>

					<SubjectCard
						code="MATH 104"
						title="Calculus I"
						instructor="Dr. Aris"
						schedule="Tue/Fri • 10:00 AM"
						avatar="Aris"
						accentColor="classly-gold"
						onClick={onNavigate}
					/>

					<SubjectCard
						code="HIST 12"
						title="Readings in PH History"
						instructor="Ms. Reyes"
						schedule="Wed • 1:00 PM"
						avatar="Reyes"
						accentColor="blue-500"
						onClick={onNavigate}
					/>
				</div>
			</div>

			{/* Join Subject Modal */}
			{joinModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-gray-100">
							<h2 className="text-xl font-bold text-gray-900">
								Join a Subject
							</h2>
							<p className="text-sm text-gray-500 mt-1">
								Enter the subject code to enroll
							</p>
						</div>
						<div className="p-6">
							<input
								type="text"
								placeholder="Enter subject code (e.g., ABC123)"
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
								autoFocus
							/>
						</div>
						<div className="p-6 pt-0 flex gap-3">
							<button
								onClick={() => setJoinModal(false)}
								className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all cursor-pointer"
							>
								Cancel
							</button>
							<button
								onClick={() => {
									setJoinModal(false);
								}}
								className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md cursor-pointer"
							>
								Join Subject
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const SubjectCard = ({
	code,
	title,
	instructor,
	schedule,
	avatar,
	accentColor: initialAccentColor,
	onClick,
}) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const [colorPickerOpen, setColorPickerOpen] = useState(false);
	const [accentColor, setAccentColor] = useState(initialAccentColor);

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

	return (
		<div
			className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden border-t-4 ${currentColors.border}`}
		>
			{/* Header: Code Badge & Menu */}
			<div className="flex justify-between items-start mb-4">
				<span
					className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${currentColors.badge}`}
				>
					{code}
				</span>
				<div className="relative">
					<button
						onClick={(e) => {
							e.stopPropagation();
							setMenuOpen(!menuOpen);
						}}
						className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
					>
						<MoreHorizontal size={18} />
					</button>

					{/* Dropdown Menu */}
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
									className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
								>
									Change Color
								</button>

								{/* Color Picker Submenu */}
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
															setAccentColor(color.value);
															setColorPickerOpen(false);
															setMenuOpen(false);
														}}
														className={`w-7 h-7 rounded-full ${
															colorClasses.swatch
														} hover:ring-2 hover:ring-gray-300 transition-all cursor-pointer ${
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
										// Handle unenroll
										setMenuOpen(false);
									}}
									className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 transition-colors cursor-pointer"
								>
									Unenroll
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			{/* Title */}
			<div onClick={onClick}>
				<h3 className="text-lg font-bold text-gray-900 mb-6 group-hover:text-classly-green transition-colors line-clamp-2">
					{title}
				</h3>

				{/* Footer: Instructor & Meta */}
				<div className="flex items-center gap-3 pt-4 border-t border-gray-50">
					<img
						src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar}`}
						alt={instructor}
						className="w-8 h-8 rounded-full bg-gray-100"
					/>
					<div className="flex flex-col">
						<span className="text-sm font-medium text-gray-700">
							{instructor}
						</span>
						<span className="text-xs text-gray-400 flex items-center gap-1">
							<Clock size={10} /> {schedule}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StudentDashboard;
