import React, { useState, useEffect } from "react";
import Navbar from "./components/shared/Navbar";
import Sidebar from "./components/shared/Sidebar";
import StudentDashboard from "./components/student/StudentDashboard";
import InstructorDashboard from "./components/instructor/InstructorDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminUserManagement from "./components/admin/AdminUserManagement";
import StudentClassroomView from "./components/student/StudentClassroomView";
import InstructorClassroomView from "./components/instructor/InstructorClassroomView";
import CalendarView from "./components/shared/CalendarView";
import AIAssistant from "./components/ai/AIAssistant";
import MessagesView from "./components/shared/MessagesView";
import AuthPage from "./components/shared/AuthPage";
import { supabase, auth, db } from "./lib/supabase";

function App() {
	const [currentView, setCurrentView] = useState("dashboard");
	const [selectedSubjectId, setSelectedSubjectId] = useState(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [session, setSession] = useState(null);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [profile, setProfile] = useState(null);

	// ============================================
	// LOAD USER PROFILE
	// ============================================
	const loadUserProfile = async (userId) => {
		try {
			const { data, error } = await db.profiles.getById(userId);

			if (error) {
				console.error("Error loading profile:", error);
				setLoading(false);
				return;
			}

			if (data) {
				setProfile(data);
				setUserRole(data.role);
			} else {
				await auth.signOut();
			}
		} catch (err) {
			console.error("Profile load error:", err);
		} finally {
			setLoading(false);
		}
	};

	// ============================================
	// AUTH STATE MANAGEMENT
	// ============================================
	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session?.user) {
				loadUserProfile(session.user.id);
			} else {
				setLoading(false);
			}
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log("Auth event:", event);
			setSession(session);

			if (event === "SIGNED_IN" && session?.user) {
				loadUserProfile(session.user.id);
			} else if (event === "SIGNED_OUT") {
				setUserRole(null);
				setProfile(null);
				setCurrentView("dashboard");
				setLoading(false);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	// ============================================
	// AUTH HANDLERS
	// ============================================
	const handleLogin = async (email, password) => {
		try {
			const { error } = await auth.signIn({ email, password });

			if (error) {
				alert(`Login failed: ${error.message}`);
				return;
			}

			console.log("✅ Login successful");
		} catch (err) {
			console.error("Login error:", err);
			alert("Login failed. Please try again.");
		}
	};

	const handleRegister = async (email, password, role, fullName) => {
		try {
			const { error } = await auth.signUp({
				email,
				password,
				fullName,
				role,
			});

			if (error) {
				alert(`Registration failed: ${error.message}`);
				return;
			}

			const isCvsuStudent =
				role === "student" && email.toLowerCase().endsWith("@cvsu.edu.ph");

			if (isCvsuStudent) {
				alert("Account created! You can now log in.");
			} else {
				alert(
					"Account created! Your account is pending admin approval. You'll be able to log in once approved.",
				);
			}
		} catch (err) {
			console.error("Registration error:", err);
			alert("Registration failed. Please try again.");
		}
	};

	const handleLogout = async () => {
		try {
			const { error } = await auth.signOut();
			if (error) throw error;
			console.log("✅ Logged out");
		} catch (err) {
			console.error("Logout error:", err);
		}
	};

	// ============================================
	// NAVIGATION HANDLERS
	// ============================================
	const handleSubjectSelect = (subjectId) => {
		setSelectedSubjectId(subjectId);
		setCurrentView("classroom");
	};

	const handleNavigateToSubject = (subjectId) => {
		setSelectedSubjectId(subjectId);
		setCurrentView("classroom");
	};

	const handleNavigate = (view) => {
		setCurrentView(view);
	};

	// ============================================
	// LOADING STATE
	// ============================================
	if (loading) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB]">
				<div className="flex flex-col items-center gap-3">
					<div className="w-12 h-12 border-4 border-classly-green border-t-transparent rounded-full animate-spin" />
				</div>
			</div>
		);
	}

	// ============================================
	// AUTH PAGE (not logged in)
	// ============================================
	if (!session) {
		return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
	}

	// ============================================
	// PENDING / REJECTED GATE
	// ============================================
	if (profile?.status === "pending") {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB]">
				<div className="max-w-md w-full mx-4 bg-white rounded-2xl border border-gray-200 p-8 text-center">
					<div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-7 h-7 text-amber-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold text-gray-900 mb-2">
						Awaiting Approval
					</h2>
					<p className="text-gray-500 text-sm mb-6">
						Your account is pending admin approval. You'll get access once an
						admin reviews your registration.
					</p>
					<button
						onClick={handleLogout}
						className="text-sm text-gray-400 hover:text-gray-600 underline"
					>
						Sign out
					</button>
				</div>
			</div>
		);
	}

	if (profile?.status === "rejected") {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB]">
				<div className="max-w-md w-full mx-4 bg-white rounded-2xl border border-gray-200 p-8 text-center">
					<div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-7 h-7 text-red-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold text-gray-900 mb-2">
						Account Rejected
					</h2>
					<p className="text-gray-500 text-sm mb-6">
						Your account registration was not approved. Contact your
						administrator for more information.
					</p>
					<button
						onClick={handleLogout}
						className="text-sm text-gray-400 hover:text-gray-600 underline"
					>
						Sign out
					</button>
				</div>
			</div>
		);
	}

	// ============================================
	// MAIN APP (authenticated)
	// ============================================
	return (
		<div className="h-screen flex flex-col bg-[#F9FAFB]">
			<Navbar
				toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
				isSidebarOpen={isSidebarOpen}
				onLogout={handleLogout}
				userRole={userRole}
				profile={profile}
			/>
			<div className="flex flex-1 overflow-hidden">
				<Sidebar
					currentView={currentView}
					setView={setCurrentView}
					isOpen={isSidebarOpen}
					onLogout={handleLogout}
					userRole={userRole}
					userId={session?.user?.id}
					onSubjectSelect={handleSubjectSelect}
				/>
				<main
					className={`flex-1 overflow-y-auto transition-all ${
						currentView === "classroom" || currentView === "messages"
							? ""
							: "p-6 md:p-8"
					}`}
				>
					{/* ADMIN VIEWS */}
					{userRole === "admin" && (
						<>
							{currentView === "dashboard" && (
								<AdminDashboard onNavigate={handleNavigate} />
							)}
							{currentView === "admin-users" && (
								<AdminUserManagement
									onBack={() => setCurrentView("dashboard")}
								/>
							)}
							{currentView === "admin-subjects" && (
								<div className="h-full flex flex-col items-center justify-center text-gray-400">
									<p>Subject Management - Coming Soon</p>
								</div>
							)}
							{currentView === "admin-analytics" && (
								<div className="h-full flex flex-col items-center justify-center text-gray-400">
									<p>Analytics - Coming Soon</p>
								</div>
							)}
							{currentView === "calendar" && (
								<CalendarView userId={session.user.id} userRole={userRole} />
							)}
							{currentView === "ai" && <AIAssistant />}
							{currentView === "messages" && (
								<MessagesView userId={session.user.id} userRole={userRole} />
							)}
						</>
					)}

					{/* STUDENT VIEWS */}
					{userRole === "student" && (
						<>
							{currentView === "dashboard" && (
								<StudentDashboard
									onNavigate={handleNavigateToSubject}
									userId={session.user.id}
								/>
							)}
							{currentView === "classroom" && (
								<StudentClassroomView
									userId={session.user.id}
									userRole={userRole}
									subjectId={selectedSubjectId}
									onBack={() => setCurrentView("dashboard")}
								/>
							)}
							{currentView === "calendar" && (
								<CalendarView userId={session.user.id} userRole={userRole} />
							)}
							{currentView === "ai" && <AIAssistant />}
							{currentView === "messages" && (
								<MessagesView userId={session.user.id} userRole={userRole} />
							)}
						</>
					)}

					{/* INSTRUCTOR VIEWS */}
					{userRole === "instructor" && (
						<>
							{currentView === "dashboard" && (
								<InstructorDashboard
									onNavigate={handleNavigateToSubject}
									userId={session.user.id}
								/>
							)}
							{currentView === "classroom" && (
								<InstructorClassroomView
									userId={session.user.id}
									userRole={userRole}
									subjectId={selectedSubjectId}
									onBack={() => setCurrentView("dashboard")}
								/>
							)}
							{currentView === "calendar" && (
								<CalendarView userId={session.user.id} userRole={userRole} />
							)}
							{currentView === "ai" && <AIAssistant />}
							{currentView === "messages" && (
								<MessagesView userId={session.user.id} userRole={userRole} />
							)}
						</>
					)}
				</main>
			</div>
		</div>
	);
}

export default App;