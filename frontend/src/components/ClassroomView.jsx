import React, { useState } from "react";
import {
	ArrowLeft,
	MessageSquare,
	FileText,
	Users,
	Paperclip,
	Send,
	Download,
	MoreVertical,
	BookOpen,
	CheckCircle,
	Clock,
	Pin,
} from "lucide-react";

const ClassroomView = ({ onBack }) => {
	const [activeTab, setActiveTab] = useState("stream");

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-30">
				<div className="px-6 py-4 max-w-7xl mx-auto">
					<div className="flex items-center gap-4 mb-4">
						<button
							onClick={onBack}
							className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
						>
							<ArrowLeft size={20} />
						</button>
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-xs font-bold text-classly-green bg-green-50 px-2 py-0.5 rounded uppercase tracking-wide">
									IT 101
								</span>
								<span className="text-xs text-gray-400">Section A</span>
							</div>
							<h1 className="text-2xl font-bold text-gray-900">
								Intro to Computing
							</h1>
						</div>
					</div>

					{/* Tabs */}
					<div className="flex gap-1">
						{["stream", "modules", "people"].map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`px-4 py-2 text-sm font-medium capitalize transition-all cursor-pointer ${
									activeTab === tab
										? "text-classly-green border-b-2 border-classly-green"
										: "text-gray-500 hover:text-gray-900"
								}`}
							>
								{tab}
							</button>
						))}
					</div>
				</div>
			</header>

			{/* Content */}
			<div className="max-w-5xl mx-auto">
				{activeTab === "stream" && <StreamTab />}
				{activeTab === "modules" && <ModulesTab />}
				{activeTab === "people" && <PeopleTab />}
			</div>
		</div>
	);
};

/* Stream Tab */
const StreamTab = () => {
	return (
		<div>
			<div className="px-6 pb-6 space-y-4 mt-3">
				{/* Announcement Input */}
				<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
					<div className="flex gap-3">
						<img
							src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
							alt="You"
							className="w-10 h-10 rounded-full bg-gray-100"
						/>
						<div className="flex-1">
							<input
								type="text"
								placeholder="Share with your class..."
								className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all text-sm"
							/>
							<div className="flex items-center gap-2 mt-2">
								<button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
									<Paperclip size={16} />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Pinned Post */}
				<div className="bg-linear-to-r from-green-50 to-emerald-50 border-l-4 border-classly-green rounded-xl p-5 shadow-sm">
					<div className="flex items-start gap-3">
						<Pin size={16} className="text-classly-green mt-1 shrink-0" />
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-2">
								<img
									src="https://api.dicebear.com/7.x/avataaars/svg?seed=Val"
									alt="Prof. Val"
									className="w-8 h-8 rounded-full"
								/>
								<div className="flex items-center gap-1.5">
									<p className="text-sm font-semibold text-gray-900">
										Prof. Val
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
								<span className="text-xs text-gray-500">• 2 days ago</span>
							</div>
							<p className="text-sm text-gray-700 leading-relaxed">
								Welcome to IT 101! Please review the syllabus and complete the
								introductory survey by Friday. Looking forward to a great
								semester!
							</p>
						</div>
					</div>
				</div>

				{/* Regular Post */}
				<div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
					<div className="flex items-start gap-3">
						<img
							src="https://api.dicebear.com/7.x/avataaars/svg?seed=Val"
							alt="Prof. Val"
							className="w-10 h-10 rounded-full"
						/>
						<div className="flex-1">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-1.5">
									<p className="text-sm font-semibold text-gray-900">
										Prof. Val
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
									<span className="text-xs text-gray-500">• 5 hours ago</span>
								</div>
								<button className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors cursor-pointer">
									<MoreVertical size={16} />
								</button>
							</div>
							<p className="text-sm text-gray-700 leading-relaxed mb-3">
								Reminder: Final Project Proposal is due tonight at 11:59 PM.
								Make sure to submit via the Modules section.
							</p>
							<div className="flex items-center gap-4 text-xs text-gray-500">
								<button className="flex items-center gap-1 hover:text-classly-green transition-colors cursor-pointer">
									<MessageSquare size={14} />
									<span>3 comments</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Assignment Post with File */}
				<div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
					<div className="flex items-start gap-3">
						<div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
							<FileText size={18} className="text-red-600" />
						</div>
						<div className="flex-1">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-1.5">
									<p className="text-sm font-semibold text-gray-900">
										New Assignment Posted
									</p>
									<span className="text-xs text-gray-500">• Yesterday</span>
								</div>
							</div>
							<p className="text-sm font-medium text-gray-900 mb-1">
								Final Project Proposal
							</p>
							<p className="text-sm text-gray-600 mb-3">
								Submit a 2-page proposal outlining your final project idea.
							</p>
							<div className="flex items-center gap-3 text-xs flex-wrap">
								<span className="flex items-center gap-1 text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
									<Clock size={12} />
									Due today, 11:59 PM
								</span>
								<span className="text-gray-500">100 points</span>
								<span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded">
									<Paperclip size={12} />1 attachment
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

/* Modules Tab */
const ModulesTab = () => {
	return (
		<div className="px-6 py-6 space-y-4">
			{/* Module 1 - Completed */}
			<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
				<div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
					<h3 className="font-semibold text-gray-900">
						Module 1: History of Computing
					</h3>
					<span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded uppercase tracking-wide">
						Completed
					</span>
				</div>
				<div className="divide-y divide-gray-100">
					<div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
								<BookOpen size={16} className="text-blue-600" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">
									Reading: The Turing Machine
								</p>
								<p className="text-xs text-gray-500 mt-0.5">15 min read</p>
							</div>
							<CheckCircle size={18} className="text-classly-green" />
						</div>
					</div>
					<div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
								<FileText size={16} className="text-purple-600" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">
									Assignment: Reflection Paper
								</p>
								<p className="text-xs text-gray-500 mt-0.5">
									Submitted 2 days ago
								</p>
							</div>
							<CheckCircle size={18} className="text-classly-green" />
						</div>
					</div>
				</div>
			</div>

			{/* Module 2 - Current */}
			<div className="bg-white border-2 border-classly-green rounded-xl overflow-hidden shadow-sm">
				<div className="p-4 bg-green-50 border-b border-green-100 flex justify-between items-center">
					<h3 className="font-semibold text-gray-900">
						Module 2: Hardware Basics
					</h3>
					<span className="text-xs font-bold text-classly-green bg-white px-2 py-1 rounded uppercase tracking-wide">
						Current
					</span>
				</div>
				<div className="divide-y divide-gray-100">
					<div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
								<BookOpen size={16} className="text-blue-600" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">
									Lecture: Motherboard Components
								</p>
								<p className="text-xs text-gray-500 mt-0.5">Video • 24 mins</p>
							</div>
						</div>
					</div>
					<div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
								<FileText size={16} className="text-red-600" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">
									Assignment: Final Project Proposal
								</p>
								<div className="flex items-center gap-2 mt-1">
									<span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
										Due today
									</span>
									<span className="text-xs text-gray-500">100 points</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Module 3 */}
			<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
				<div className="p-4 bg-gray-50 border-b border-gray-100">
					<h3 className="font-semibold text-gray-900">
						Module 3: Software Fundamentals
					</h3>
				</div>
				<div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
							<BookOpen size={16} className="text-gray-400" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-500">
								Introduction to Programming
							</p>
							<p className="text-xs text-gray-400 mt-0.5">Coming soon</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

/* People Tab */
const PeopleTab = () => {
	const instructors = [
		{
			name: "Prof. Val",
			role: "Lead Instructor",
			email: "val@university.edu",
			avatar: "Val",
			verified: true,
		},
		{
			name: "TA Sarah",
			role: "Teaching Assistant",
			email: "sarah@university.edu",
			avatar: "Sarah",
			verified: true,
		},
	];

	const classmates = [
		{ name: "Alex Chen", avatar: "Alex", verified: true },
		{ name: "Maria Garcia", avatar: "Maria", verified: false },
		{ name: "James Wilson", avatar: "James", verified: true },
		{ name: "Priya Patel", avatar: "Priya", verified: false },
		{ name: "Mohammed Ali", avatar: "Mohammed", verified: true },
		{ name: "Sofia Rodriguez", avatar: "Sofia", verified: false },
	];

	return (
		<div className="px-6 py-6 space-y-6">
			{/* Instructors */}
			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-3">
					Instructors
				</h2>
				<div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-sm">
					{instructors.map((instructor) => (
						<div
							key={instructor.email}
							className="p-4 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<img
									src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${instructor.avatar}`}
									alt={instructor.name}
									className="w-12 h-12 rounded-full bg-gray-100"
								/>
								<div className="flex-1">
									<div className="flex items-center gap-1.5">
										<p className="text-sm font-semibold text-gray-900">
											{instructor.name}
										</p>
										{instructor.verified && (
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
										)}
									</div>
									<p className="text-xs text-gray-500 mt-0.5">
										{instructor.role}
									</p>
									<p className="text-xs text-gray-400 mt-0.5">
										{instructor.email}
									</p>
								</div>
								<button className="px-3 py-1.5 text-sm font-medium text-classly-green hover:bg-green-50 rounded-lg transition-colors cursor-pointer">
									Message
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Classmates */}
			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
					Classmates
					<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
						{classmates.length}
					</span>
				</h2>
				<div className="bg-white border border-gray-200 rounded-xl shadow-sm">
					<div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
						{classmates.map((classmate, index) => (
							<div
								key={classmate.name}
								className={`p-4 hover:bg-gray-50 transition-colors ${
									index % 2 === 0 && index !== classmates.length - 1
										? "sm:border-b sm:border-gray-100"
										: ""
								} ${
									index === classmates.length - 2 && classmates.length % 2 === 0
										? "sm:border-b-0"
										: ""
								}`}
							>
								<div className="flex items-center gap-3">
									<img
										src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${classmate.avatar}`}
										alt={classmate.name}
										className="w-10 h-10 rounded-full bg-gray-100"
									/>
									<div className="flex items-center gap-1.5">
										<p className="text-sm font-medium text-gray-900">
											{classmate.name}
										</p>
										{classmate.verified && (
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
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ClassroomView;
