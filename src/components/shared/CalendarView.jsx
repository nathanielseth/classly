import React, { useState, useEffect, useCallback } from "react";
import {
	format,
	addMonths,
	subMonths,
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	addDays,
	isSameMonth,
	isSameDay,
	isToday,
	parseISO,
} from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Clock,
	AlertCircle,
	Calendar as CalendarIcon,
	Plus,
	Trash2,
	X,
	Loader2,
} from "lucide-react";
import { db } from "../../lib/supabase";

const CalendarView = ({ userId, userRole }) => {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [events, setEvents] = useState([]);
	const [dueDates, setDueDates] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showAddModal, setShowAddModal] = useState(false);

	// ============================================
	// LOAD DATA
	// ============================================
	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			// Always load system events
			const { data: eventsData } = await db.events.getAll();
			setEvents(
				(eventsData || []).map((e) => ({
					...e,
					dateObj: parseISO(e.event_date),
					source: "event",
				})),
			);

			// Load due dates based on role
			if (userRole === "student") {
				const { data: materials } = await db.materials.getUpcomingForStudent(
					userId,
					50,
				);
				setDueDates(
					(materials || [])
						.filter((m) => m.due_date)
						.map((m) => ({
							id: m.id,
							title: m.title,
							dateObj: parseISO(m.due_date),
							subjectName: m.subject?.name || "",
							subjectCode: m.subject?.code || "",
							type: m.type,
							source: "due_date",
						})),
				);
			} else if (userRole === "instructor") {
				const { data: subjects } = await db.subjects.getByInstructor(userId);
				const subjectIds = (subjects || []).map((s) => s.id);
				if (subjectIds.length > 0) {
					const allMaterials = await Promise.all(
						subjectIds.map((sid) => db.materials.getBySubject(sid)),
					);
					const flat = allMaterials.flatMap(({ data }) => data || []);
					setDueDates(
						flat
							.filter((m) => m.due_date)
							.map((m) => ({
								id: m.id,
								title: m.title,
								dateObj: parseISO(m.due_date),
								subjectName: m.subject_name || "",
								type: m.type,
								source: "due_date",
							})),
					);
				}
			}
		} catch (err) {
			console.error("Calendar load error:", err);
		} finally {
			setLoading(false);
		}
	}, [userId, userRole]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		loadData();
	}, [loadData]);

	// ============================================
	// HELPERS
	// ============================================
	const getAllItemsForDay = (day) => {
		const dayEvents = events.filter((e) => isSameDay(e.dateObj, day));
		const dayDues = dueDates.filter((d) => isSameDay(d.dateObj, day));
		return [...dayEvents, ...dayDues];
	};

	const getItemColor = (item) => {
		if (item.source === "event") {
			if (item.type === "holiday")
				return "bg-red-50 text-red-700 border-red-100";
			if (item.type === "announcement")
				return "bg-blue-50 text-blue-700 border-blue-100";
			return "bg-classly-green/10 text-classly-green border-classly-green/20";
		}
		// due dates
		if (item.type === "exam") return "bg-red-50 text-red-700 border-red-100";
		if (item.type === "quiz")
			return "bg-amber-50 text-amber-700 border-amber-100";
		if (item.type === "project")
			return "bg-purple-50 text-purple-700 border-purple-100";
		return "bg-blue-50 text-blue-700 border-blue-100";
	};

	const getUpcomingItems = () => {
		const now = new Date();
		const allItems = [...events, ...dueDates];
		return allItems
			.filter((i) => i.dateObj >= now)
			.sort((a, b) => a.dateObj - b.dateObj)
			.slice(0, 5);
	};

	const selectedDayItems = getAllItemsForDay(selectedDate);
	const upcomingItems = getUpcomingItems();

	// ============================================
	// RENDER HEADER
	// ============================================
	const renderHeader = () => (
		<div className="flex items-center justify-between mb-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">
					{format(currentMonth, "MMMM yyyy")}
				</h2>
				<p className="text-gray-500 text-sm">Academic schedule</p>
			</div>
			<div className="flex items-center gap-2">
				{userRole === "admin" && (
					<button
						onClick={() => setShowAddModal(true)}
						className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-all"
					>
						<Plus size={16} />
						Add Event
					</button>
				)}
				<div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
					<button
						onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
						className="p-2 hover:bg-gray-50 rounded-md text-gray-500 transition"
					>
						<ChevronLeft size={18} />
					</button>
					<button
						onClick={() => setCurrentMonth(new Date())}
						className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition"
					>
						Today
					</button>
					<button
						onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
						className="p-2 hover:bg-gray-50 rounded-md text-gray-500 transition"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		</div>
	);

	// ============================================
	// RENDER DAYS ROW
	// ============================================
	const renderDays = () => {
		const days = [];
		const startDate = startOfWeek(currentMonth);
		for (let i = 0; i < 7; i++) {
			days.push(
				<div
					key={i}
					className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center py-3"
				>
					{format(addDays(startDate, i), "EEE")}
				</div>,
			);
		}
		return (
			<div className="grid grid-cols-7 mb-1 border-b border-gray-200">
				{days}
			</div>
		);
	};

	// ============================================
	// RENDER CELLS
	// ============================================
	const renderCells = () => {
		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(monthStart);
		const startDate = startOfWeek(monthStart);
		const endDate = endOfWeek(monthEnd);

		const rows = [];
		let days = [];
		let day = startDate;

		while (day <= endDate) {
			for (let i = 0; i < 7; i++) {
				const cloneDay = day;
				const dayItems = getAllItemsForDay(day);
				const isCurrentMonth = isSameMonth(day, monthStart);

				days.push(
					<div
						key={day.toString()}
						onClick={() => setSelectedDate(cloneDay)}
						className={`min-h-27.5 border-r border-b border-gray-100 p-2 cursor-pointer flex flex-col gap-1 transition-colors
              ${!isCurrentMonth ? "bg-gray-50/50" : "bg-white hover:bg-gray-50"}
              ${isSameDay(day, selectedDate) ? "ring-2 ring-inset ring-classly-green/40" : ""}
            `}
					>
						<div
							className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-0.5
              ${isToday(day) ? "bg-classly-green text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-300"}
            `}
						>
							{format(day, "d")}
						</div>
						<div className="flex flex-col gap-0.5 overflow-hidden">
							{dayItems.slice(0, 2).map((item) => (
								<div
									key={item.id}
									className={`text-[10px] px-1.5 py-0.5 rounded border truncate font-medium ${getItemColor(item)}`}
								>
									{item.title}
								</div>
							))}
							{dayItems.length > 2 && (
								<div className="text-[10px] text-gray-400 pl-1">
									+{dayItems.length - 2} more
								</div>
							)}
						</div>
					</div>,
				);
				day = addDays(day, 1);
			}
			rows.push(
				<div
					key={day.toString()}
					className="grid grid-cols-7 border-l border-t border-gray-100"
				>
					{days}
				</div>,
			);
			days = [];
		}
		return (
			<div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
				{rows}
			</div>
		);
	};

	// ============================================
	// MAIN RENDER
	// ============================================
	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 size={24} className="animate-spin text-classly-green" />
			</div>
		);
	}

	return (
		<div className="p-6 max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
			{/* Left: Calendar Grid */}
			<div className="flex-1 min-w-0">
				{renderHeader()}
				{renderDays()}
				{renderCells()}

				{/* Legend */}
				<div className="flex items-center gap-4 mt-4 flex-wrap">
					<div className="flex items-center gap-1.5 text-xs text-gray-500">
						<div className="w-3 h-3 rounded bg-classly-green/20 border border-classly-green/30" />
						System event
					</div>
					<div className="flex items-center gap-1.5 text-xs text-gray-500">
						<div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
						Assignment
					</div>
					<div className="flex items-center gap-1.5 text-xs text-gray-500">
						<div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
						Quiz
					</div>
					<div className="flex items-center gap-1.5 text-xs text-gray-500">
						<div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
						Exam
					</div>
					<div className="flex items-center gap-1.5 text-xs text-gray-500">
						<div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
						Project
					</div>
				</div>
			</div>

			{/* Right: Side Panel */}
			<div className="w-full lg:w-72 flex flex-col gap-4 shrink-0">
				{/* Selected Date */}
				<div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
					<h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4 text-sm">
						<CalendarIcon size={16} className="text-classly-green" />
						{format(selectedDate, "EEEE, MMMM do")}
					</h3>
					<div className="space-y-3">
						{selectedDayItems.length > 0 ? (
							selectedDayItems.map((item) => (
								<div key={item.id} className="flex items-start gap-3">
									<div
										className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
											item.source === "event"
												? "bg-classly-green"
												: item.type === "exam"
													? "bg-red-500"
													: item.type === "quiz"
														? "bg-amber-500"
														: item.type === "project"
															? "bg-purple-500"
															: "bg-blue-500"
										}`}
									/>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-800 truncate">
											{item.title}
										</p>
										<p className="text-xs text-gray-500 mt-0.5">
											{item.source === "event"
												? item.event_time || "All day"
												: item.subjectName || item.subjectCode || item.type}
										</p>
									</div>
									{userRole === "admin" && item.source === "event" && (
										<button
											onClick={async () => {
												await db.events.delete(item.id);
												loadData();
											}}
											className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
										>
											<Trash2 size={14} />
										</button>
									)}
								</div>
							))
						) : (
							<p className="text-sm text-gray-400 text-center py-6">
								Nothing scheduled.
							</p>
						)}
					</div>
				</div>

				{/* Upcoming */}
				<div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
					<h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4 text-sm">
						<AlertCircle size={16} className="text-amber-500" />
						Upcoming
					</h3>
					<div className="space-y-3">
						{upcomingItems.length > 0 ? (
							upcomingItems.map((item) => (
								<div key={item.id} className="flex items-start gap-3">
									<div
										className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
											item.source === "event"
												? "bg-classly-green"
												: item.type === "exam"
													? "bg-red-500"
													: item.type === "quiz"
														? "bg-amber-500"
														: "bg-blue-500"
										}`}
									/>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-800 truncate">
											{item.title}
										</p>
										<p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
											<Clock size={10} />
											{format(item.dateObj, "MMM d")}
											{item.event_time ? ` · ${item.event_time}` : ""}
										</p>
									</div>
								</div>
							))
						) : (
							<p className="text-sm text-gray-400 text-center py-4">
								Nothing upcoming.
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Add Event Modal (admin only) */}
			{showAddModal && (
				<AddEventModal
					userId={userId}
					onClose={() => setShowAddModal(false)}
					onSuccess={() => {
						setShowAddModal(false);
						loadData();
					}}
				/>
			)}
		</div>
	);
};

// ============================================
// ADD EVENT MODAL
// ============================================
const AddEventModal = ({ userId, onClose, onSuccess }) => {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		event_date: format(new Date(), "yyyy-MM-dd"),
		event_time: "",
		type: "event",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async () => {
		if (!formData.title.trim() || !formData.event_date) {
			setError("Title and date are required.");
			return;
		}
		setLoading(true);
		setError("");
		const { error: err } = await db.events.create({
			...formData,
			created_by: userId,
		});
		if (err) {
			setError(err.message);
			setLoading(false);
			return;
		}
		onSuccess();
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
				<div className="p-6 border-b border-gray-100 flex items-center justify-between">
					<h2 className="text-lg font-bold text-gray-900">Add System Event</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X size={20} />
					</button>
				</div>
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1.5">
							Title *
						</label>
						<input
							type="text"
							value={formData.title}
							onChange={(e) =>
								setFormData({ ...formData, title: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 text-sm"
							placeholder="e.g. University Foundation Day"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1.5">
							Type
						</label>
						<select
							value={formData.type}
							onChange={(e) =>
								setFormData({ ...formData, type: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm bg-white"
						>
							<option value="event">Event</option>
							<option value="holiday">Holiday</option>
							<option value="announcement">Announcement</option>
						</select>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1.5">
								Date *
							</label>
							<input
								type="date"
								value={formData.event_date}
								onChange={(e) =>
									setFormData({ ...formData, event_date: e.target.value })
								}
								className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1.5">
								Time
							</label>
							<input
								type="time"
								value={formData.event_time}
								onChange={(e) =>
									setFormData({ ...formData, event_time: e.target.value })
								}
								className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm"
							/>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1.5">
							Description
						</label>
						<textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							rows={3}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm resize-none"
							placeholder="Optional details..."
						/>
					</div>
					{error && (
						<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
							{error}
						</p>
					)}
				</div>
				<div className="p-6 pt-0 flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						disabled={loading}
						className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{loading ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<Plus size={16} />
						)}
						Create Event
					</button>
				</div>
			</div>
		</div>
	);
};

export default CalendarView;