import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import StudentDashboard from "./components/StudentDashboard";
import ClassroomView from "./components/ClassroomView";
import CalendarView from "./components/CalendarView";
import AIAssistant from "./components/AIAssistant";
import AuthPage from "./components/AuthPage";

// ===========================================
// 🚧 DEV MODE - Set to false when Supabase is ready
// ===========================================
const USE_MOCK_AUTH = true;

// Initialize Supabase client (only when ready)
let supabase = null;
if (!USE_MOCK_AUTH) {
	const { createClient } = await import("@supabase/supabase-js");
	supabase = createClient(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_ANON_KEY,
		{
			auth: {
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: true,
			},
		}
	);
}

function App() {
	const [currentView, setCurrentView] = useState("dashboard");
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [session, setSession] = useState(null);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);

	// Auth state management
	useEffect(() => {
		// MOCK AUTH for development
		if (USE_MOCK_AUTH) {
			setLoading(false);
			return;
		}

		// Real Supabase auth
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session?.user) {
				setUserRole(session.user.user_metadata?.role || "student");
			}
			setLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log("Auth event:", event);

			setSession(session);

			if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
				if (session?.user) {
					setUserRole(session.user.user_metadata?.role || "student");
				}
			} else if (event === "SIGNED_OUT") {
				setUserRole(null);
				setCurrentView("dashboard");
			} else if (event === "TOKEN_REFRESHED") {
				// Session refreshed automatically
			}

			setLoading(false);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	// Auth handlers
	const handleLogin = async (email, password, role) => {
		// MOCK AUTH for development
		if (USE_MOCK_AUTH) {
			console.log("🚧 MOCK LOGIN:", { email, role });
			setSession({ user: { email, user_metadata: { role } } });
			setUserRole(role);
			return;
		}

		// Real Supabase auth
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) throw error;

			// TODO: Verify role matches user metadata
			console.log("Login successful:", data);
		} catch (error) {
			console.error("Login error:", error.message);
			// TODO: Show error toast/notification
		}
	};

	const handleRegister = async (email, password, role, fullName) => {
		// MOCK AUTH for development
		if (USE_MOCK_AUTH) {
			console.log("🚧 MOCK REGISTER:", { email, role, fullName });
			setSession({
				user: { email, user_metadata: { role, full_name: fullName } },
			});
			setUserRole(role);
			return;
		}

		// Real Supabase auth
		try {
			const isCvsuEmail = email.toLowerCase().endsWith("@cvsu.edu.ph");

			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: fullName,
						role: role,
						email_verified: isCvsuEmail && role === "student",
						pending_approval: !isCvsuEmail && role === "student",
					},
				},
			});

			if (error) throw error;

			console.log("Registration successful:", data);
		} catch (error) {
			console.error("Registration error:", error.message);
		}
	};

	const handleLogout = async () => {
		// MOCK AUTH for development
		if (USE_MOCK_AUTH) {
			console.log("🚧 MOCK LOGOUT");
			setSession(null);
			setUserRole(null);
			return;
		}

		// Real Supabase auth
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
		} catch (error) {
			console.error("Logout error:", error.message);
		}
	};

	// Loading state
	if (loading) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB]">
				<div className="flex flex-col items-center gap-3">
					<div className="w-12 h-12 border-4 border-classly-green border-t-transparent rounded-full animate-spin" />
					<p className="text-gray-500 text-sm">Loading...</p>
				</div>
			</div>
		);
	}

	// Show auth page if no session
	if (!session) {
		return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
	}

	// Main app (authenticated view)
	return (
		<div className="h-screen flex flex-col bg-[#F9FAFB]">
			<Navbar
				toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
				isSidebarOpen={isSidebarOpen}
				onLogout={handleLogout}
				userRole={userRole}
			/>
			<div className="flex flex-1 overflow-hidden">
				<Sidebar
					currentView={currentView}
					setView={setCurrentView}
					isOpen={isSidebarOpen}
					userRole={userRole}
				/>
				<main className="flex-1 overflow-y-auto p-6 md:p-8 transition-all">
					{currentView === "dashboard" && (
						<StudentDashboard onNavigate={() => setCurrentView("classroom")} />
					)}
					{currentView === "classroom" && <ClassroomView />}
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
