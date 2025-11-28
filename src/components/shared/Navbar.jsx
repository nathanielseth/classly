import React, { useState, useRef, useEffect } from "react";
import {
	Menu,
	Plus,
	Bell,
	ChevronDown,
	Sparkles,
	User,
	Moon,
	Settings,
	LogOut,
	MessageSquare,
} from "lucide-react";

const Navbar = ({ toggleSidebar, onLogout, userRole, profile }) => {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [joinCourseModal, setJoinCourseModal] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const profileRef = useRef(null);
	const notifRef = useRef(null);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (profileRef.current && !profileRef.current.contains(event.target)) {
				setIsProfileOpen(false);
			}
			if (notifRef.current && !notifRef.current.contains(event.target)) {
				setNotificationsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleLogoutClick = () => {
		setIsProfileOpen(false);
		onLogout();
	};

	return (
		<>
			<header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-50 sticky top-0">
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-3">
						<button
							onClick={toggleSidebar}
							className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
							aria-label="Toggle sidebar"
						>
							<Menu size={20} />
						</button>

						<div className="flex items-center gap-2">
							<div className="w-8 h-8 bg-classly-green rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
								C
							</div>
							<span className="font-bold text-xl text-gray-900 tracking-tight hidden md:block">
								Classly
							</span>
						</div>
					</div>

					{/* Ask AI */}
					<button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">
						<Sparkles size={14} className="text-classly-gold" />
						<span className="text-sm font-semibold text-gray-700">Ask AI</span>
					</button>
				</div>

				<div className="flex items-center gap-2">
					{/* Messages */}
					<button
						className="relative p-2 text-gray-500 hover:text-classly-green hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
						aria-label="Messages"
					>
						<MessageSquare size={20} />
						<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
					</button>

					{/* Notifications */}
					<div className="relative" ref={notifRef}>
						<button
							onClick={() => setNotificationsOpen(!notificationsOpen)}
							className="relative p-2 text-gray-500 hover:text-classly-green hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
							aria-label="Notifications"
						>
							<Bell size={20} />
							<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
						</button>

						{/* Notifications Dropdown */}
						{notificationsOpen && (
							<div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
								<div className="p-4 border-b border-gray-100">
									<h3 className="font-semibold text-gray-900">Notifications</h3>
									<p className="text-xs text-gray-500 mt-0.5">
										You have 2 unread notifications
									</p>
								</div>
								<div className="max-h-96 overflow-y-auto">
									<div className="p-4 hover:bg-gray-50 border-b border-gray-50 cursor-pointer transition-colors">
										<div className="flex gap-3">
											<div className="w-2 h-2 rounded-full bg-classly-green mt-2 shrink-0"></div>
											<div className="flex-1">
												<p className="text-sm font-medium text-gray-900">
													Assignment Due Soon
												</p>
												<p className="text-xs text-gray-500 mt-1">
													Final Project Proposal is due in 2 hours
												</p>
												<p className="text-xs text-gray-400 mt-1">
													2 hours ago
												</p>
											</div>
										</div>
									</div>
									<div className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
										<div className="flex gap-3">
											<div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0"></div>
											<div className="flex-1">
												<p className="text-sm font-medium text-gray-900">
													New Announcement
												</p>
												<p className="text-xs text-gray-500 mt-1">
													Prof. Val posted a new announcement in IT 101
												</p>
												<p className="text-xs text-gray-400 mt-1">
													5 hours ago
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Profile Dropdown */}
					<div className="relative" ref={profileRef}>
						<button
							onClick={() => setIsProfileOpen(!isProfileOpen)}
							className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 cursor-pointer"
						>
							<img
								src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
									profile?.full_name || "User"
								}`}
								alt="User"
								className="w-8 h-8 rounded-full bg-gray-200"
							/>
							<ChevronDown
								size={14}
								className={`text-gray-400 mr-1 transition-transform duration-200 ${
									isProfileOpen ? "rotate-180" : ""
								}`}
							/>
						</button>

						{/* Profile Dropdown Menu */}
						{isProfileOpen && (
							<div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
								<div className="p-4 border-b border-gray-100">
									<p className="font-semibold text-gray-900">
										{profile?.full_name || "User"}
									</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{profile?.email || "user@classly.edu"}
									</p>
									{userRole && (
										<p className="text-xs text-classly-green font-medium mt-1 capitalize">
											{userRole}
										</p>
									)}
								</div>
								<div className="py-2">
									<button
										onClick={() => {
											setIsProfileOpen(false);
											// Handle account settings
										}}
										className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
									>
										<Settings size={16} />
										<span>Account Settings</span>
									</button>
									<button
										onClick={() => {
											setIsProfileOpen(false);
											// Handle dark mode toggle
										}}
										className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
									>
										<Moon size={16} />
										<span>Dark Mode</span>
									</button>
								</div>
								<div className="border-t border-gray-100">
									<button
										onClick={handleLogoutClick}
										className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
									>
										<LogOut size={16} />
										<span>Log Out</span>
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</header>

			{/* Join Course Modal */}
			{joinCourseModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-gray-100">
							<h2 className="text-xl font-bold text-gray-900">Join a Course</h2>
							<p className="text-sm text-gray-500 mt-1">
								Enter the course code to enroll
							</p>
						</div>
						<div className="p-6">
							<input
								type="text"
								placeholder="Enter course code (e.g., ABC123)"
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
								autoFocus
							/>
						</div>
						<div className="p-6 pt-0 flex gap-3">
							<button
								onClick={() => setJoinCourseModal(false)}
								className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all cursor-pointer"
							>
								Cancel
							</button>
							<button
								onClick={() => {
									// Handle join course
									setJoinCourseModal(false);
								}}
								className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md cursor-pointer"
							>
								Join Course
							</button>
						</div>
					</div>
				</div>
			)}

			<style>{`
				@keyframes rotate-border {
					0% {
						transform: rotate(0deg);
					}
					100% {
						transform: rotate(360deg);
					}
				}

				.animate-rotate-border {
					animation: rotate-border 4s linear infinite;
				}

				@keyframes in {
					from {
						opacity: 0;
						transform: translateY(-4px) scale(0.96);
					}
					to {
						opacity: 1;
						transform: translateY(0) scale(1);
					}
				}

				.animate-in {
					animation: in 0.2s ease-out;
				}

				.fade-in {
					animation: fade-in 0.2s ease-out;
				}

				@keyframes fade-in {
					from { opacity: 0; }
					to { opacity: 1; }
				}

				.slide-in-from-top-2 {
					animation: slide-in-from-top 0.2s ease-out;
				}

				@keyframes slide-in-from-top {
					from {
						transform: translateY(-8px);
						opacity: 0;
					}
					to {
						transform: translateY(0);
						opacity: 1;
					}
				}

				.zoom-in-95 {
					animation: zoom-in 0.2s ease-out;
				}

				@keyframes zoom-in {
					from {
						transform: scale(0.95);
						opacity: 0;
					}
					to {
						transform: scale(1);
						opacity: 1;
					}
				}
			`}</style>
		</>
	);
};

export default Navbar;
