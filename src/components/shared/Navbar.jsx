import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	Menu,
	Bell,
	ChevronDown,
	Sparkles,
	Moon,
	Settings,
	LogOut,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";

const Navbar = ({ toggleSidebar, onLogout, userRole, profile }) => {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const profileRef = useRef(null);
	const notifRef = useRef(null);

	// Track the primitive ID for clean dependencies
	const profileId = profile?.id;

	// ============================================
	// 1. PURE DATA FETCHING (No Direct State Updates)
	// ============================================
	const fetchNotifications = useCallback(async () => {
		if (!profileId) return [];

		try {
			let items = [];

			if (userRole === "student") {
				// Get announcements from enrolled subjects
				const { data: enrollments } = await supabase
					.from("enrollments")
					.select("subject_id")
					.eq("student_id", profileId);

				const subjectIds = (enrollments || []).map((e) => e.subject_id);

				if (subjectIds.length > 0) {
					const { data: announcements } = await supabase
						.from("announcements")
						.select(
							`
              id, title, content, created_at,
              subject:subjects!announcements_subject_id_fkey(name, code)
            `,
						)
						.in("subject_id", subjectIds)
						.order("created_at", { ascending: false })
						.limit(10);

					items = (announcements || []).map((a) => ({
						id: a.id,
						title: a.title || "New Announcement",
						body: `${a.subject?.name || ""} · ${a.content?.slice(0, 60)}${a.content?.length > 60 ? "..." : ""}`,
						created_at: a.created_at,
						type: "announcement",
					}));
				}
			} else if (userRole === "instructor") {
				// Get recent submissions on their materials
				const { data: subjects } = await supabase
					.from("subjects")
					.select("id, name")
					.eq("instructor_id", profileId);

				const subjectIds = (subjects || []).map((s) => s.id);

				if (subjectIds.length > 0) {
					const { data: materials } = await supabase
						.from("materials")
						.select("id, title")
						.in("subject_id", subjectIds);

					const materialIds = (materials || []).map((m) => m.id);
					const materialMap = Object.fromEntries(
						(materials || []).map((m) => [m.id, m.title]),
					);

					if (materialIds.length > 0) {
						const { data: submissions } = await supabase
							.from("submissions")
							.select(
								`
                id, submitted_at, material_id,
                student:profiles!submissions_student_id_fkey(full_name)
              `,
							)
							.in("material_id", materialIds)
							.eq("status", "submitted")
							.order("submitted_at", { ascending: false })
							.limit(10);

						items = (submissions || []).map((s) => ({
							id: s.id,
							title: "New Submission",
							body: `${s.student?.full_name} submitted ${materialMap[s.material_id] || "an assignment"}`,
							created_at: s.submitted_at,
							type: "submission",
						}));
					}
				}
			} else if (userRole === "admin") {
				// Show pending approval requests
				const { data: pending } = await supabase
					.from("profiles")
					.select("id, full_name, email, role, created_at")
					.eq("status", "pending")
					.order("created_at", { ascending: false })
					.limit(10);

				items = (pending || []).map((u) => ({
					id: u.id,
					title: "Pending Approval",
					body: `${u.full_name} (${u.role}) is waiting for approval`,
					created_at: u.created_at,
					type: "pending",
				}));
			}

			return items;
		} catch (err) {
			console.error("Notification load error:", err);
			return [];
		}
	}, [profileId, userRole]);

	// ============================================
	// 2. INTERACTION EVENT HANDLER
	// ============================================
	const loadNotifications = useCallback(async () => {
		const items = await fetchNotifications();
		setNotifications(items);
		setUnreadCount(items.length);
	}, [fetchNotifications]);

	// ============================================
	// 3. SAFE EFFECT SYNCHRONIZATION (Fixes Error & Race Conditions)
	// ============================================
	useEffect(() => {
		let ignore = false;

		const syncNotifications = async () => {
			const items = await fetchNotifications();
			// Only set state if the component hasn't unmounted or props haven't changed mid-flight
			if (!ignore) {
				setNotifications(items);
				setUnreadCount(items.length);
			}
		};

		syncNotifications();

		return () => {
			ignore = true; // Clean up token to discard stale network responses
		};
	}, [fetchNotifications]);

	// ============================================
	// CLICK OUTSIDE
	// ============================================
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

	const formatTime = (ts) => {
		if (!ts) return "";
		const date = new Date(ts);
		const now = new Date();
		const diff = Math.floor((now - date) / 1000);
		if (diff < 60) return "just now";
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	};

	const notifDotColor = {
		announcement: "bg-classly-green",
		submission: "bg-blue-500",
		pending: "bg-amber-500",
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

					<button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">
						<Sparkles size={14} className="text-classly-gold" />
						<span className="text-sm font-semibold text-gray-700">Ask AI</span>
					</button>
				</div>

				<div className="flex items-center gap-2">
					{/* Notifications */}
					<div className="relative" ref={notifRef}>
						<button
							onClick={() => {
								setNotificationsOpen(!notificationsOpen);
								if (!notificationsOpen) {
									setUnreadCount(0);
									loadNotifications();
								}
							}}
							className="relative p-2 text-gray-500 hover:text-classly-green hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
						>
							<Bell size={20} />
							{unreadCount > 0 && (
								<span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
									{unreadCount > 9 ? "9+" : unreadCount}
								</span>
							)}
						</button>

						{notificationsOpen && (
							<div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
								<div className="p-4 border-b border-gray-100 flex items-center justify-between">
									<h3 className="font-semibold text-gray-900">Notifications</h3>
									<span className="text-xs text-gray-400">
										{notifications.length === 0
											? "All caught up"
											: `${notifications.length} items`}
									</span>
								</div>
								<div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
									{notifications.length === 0 ? (
										<div className="p-6 text-center text-sm text-gray-400">
											Nothing new right now
										</div>
									) : (
										notifications.map((n) => (
											<div
												key={n.id}
												className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
											>
												<div className="flex gap-3">
													<div
														className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notifDotColor[n.type] || "bg-gray-400"}`}
													/>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-gray-900 truncate">
															{n.title}
														</p>
														<p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
															{n.body}
														</p>
														<p className="text-xs text-gray-400 mt-1">
															{formatTime(n.created_at)}
														</p>
													</div>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						)}
					</div>

					{/* Profile */}
					<div className="relative" ref={profileRef}>
						<button
							onClick={() => setIsProfileOpen(!isProfileOpen)}
							className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 cursor-pointer"
						>
							<img
								src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || "User"}`}
								alt="User"
								className="w-8 h-8 rounded-full bg-gray-200"
							/>
							<ChevronDown
								size={14}
								className={`text-gray-400 mr-1 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`}
							/>
						</button>

						{isProfileOpen && (
							<div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
								<div className="p-4 border-b border-gray-100">
									<p className="font-semibold text-gray-900">
										{profile?.full_name || "User"}
									</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{profile?.email || ""}
									</p>
									{userRole && (
										<p className="text-xs text-classly-green font-medium mt-1 capitalize">
											{userRole}
										</p>
									)}
								</div>
								<div className="py-2">
									<button
										onClick={() => setIsProfileOpen(false)}
										className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
									>
										<Settings size={16} />
										<span>Account Settings</span>
									</button>
									<button
										onClick={() => setIsProfileOpen(false)}
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
		</>
	);
};

export default Navbar;