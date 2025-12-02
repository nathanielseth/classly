import React, { useState, useEffect } from "react";
import Navbar from "./components/shared/Navbar";
import Sidebar from "./components/shared/Sidebar";
import StudentDashboard from "./components/student/StudentDashboard";
import InstructorDashboard from "./components/instructor/InstructorDashboard";
import StudentClassroomView from "./components/student/StudentClassroomView";
import InstructorClassroomView from "./components/instructor/InstructorClassroomView";
import CalendarView from "./components/student/CalendarView";
import AIAssistant from "./components/ai/AIAssistant";
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
			}
		} catch (err) {
			console.error("Profile load error:", err);
		} finally {
			setLoading(false);
		}
	};

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

			console.log("✅ Registration successful");
			alert(
				"Registration successful! Please check your email to confirm your account."
			);
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
				/>
				<main
					className={`flex-1 overflow-y-auto transition-all ${
						currentView === "classroom" ? "" : "p-6 md:p-8"
					}`}
				>
					{currentView === "dashboard" && (
						<>
							{userRole === "student" && (
								<StudentDashboard
									onNavigate={(subjectId) => {
										setSelectedSubjectId(subjectId);
										setCurrentView("classroom");
									}}
									userId={session.user.id}
								/>
							)}
							{userRole === "instructor" && (
								<InstructorDashboard
									onNavigate={(subjectId) => {
										setSelectedSubjectId(subjectId);
										setCurrentView("classroom");
									}}
									userId={session.user.id}
								/>
							)}
						</>
					)}
					{currentView === "classroom" && (
						<>
							{userRole === "student" && (
								<StudentClassroomView
									userId={session.user.id}
									userRole={userRole}
									subjectId={selectedSubjectId}
									onBack={() => setCurrentView("dashboard")}
								/>
							)}
							{userRole === "instructor" && (
								<InstructorClassroomView
									userId={session.user.id}
									userRole={userRole}
									subjectId={selectedSubjectId}
									onBack={() => setCurrentView("dashboard")}
								/>
							)}
						</>
					)}
					{currentView === "calendar" && <CalendarView />}
					{currentView === "ai" && <AIAssistant />}
					{currentView === "messages" && (
						<div className="h-full flex flex-col items-center justify-center text-gray-400">
							<p>Module under construction.</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

export default App;
