import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./Components/Sidebar";
import StudentDashboard from "./Components/StudentDashboard";
import ClassroomView from "./Components/ClassroomView";
import CalendarView from "./components/CalendarView";
import AIAssistant from "./components/AIAssistant";

function App() {
	const [currentView, setCurrentView] = useState("dashboard");
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	return (
		<div className="h-screen flex flex-col bg-[#F9FAFB]">
			<Navbar
				toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
				isSidebarOpen={isSidebarOpen}
			/>

			<div className="flex flex-1 overflow-hidden">
				<Sidebar
					currentView={currentView}
					setView={setCurrentView}
					isOpen={isSidebarOpen}
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
