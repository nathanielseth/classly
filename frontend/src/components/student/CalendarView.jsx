import React, { useState } from "react";
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
} from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Clock,
	AlertCircle,
	Calendar as CalendarIcon,
	Filter,
} from "lucide-react";

const CalendarView = () => {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(new Date());

	// --- PROFESSIONAL DATA MOCKING ---
	// In a real app, this comes from an API.
	// Notice the structure: distinct types for styling logic.
	const events = [
		{
			id: 1,
			title: "IT 101 - Lecture",
			date: new Date(2023, 10, 20), // Note: Month is 0-indexed in JS Date (0=Jan, 10=Nov)
			type: "class",
			time: "08:00 AM - 11:00 AM",
			color: "bg-blue-50 text-blue-700 border-blue-100",
		},
		{
			id: 2,
			title: "Final Project Proposal",
			date: new Date(), // Today
			type: "deadline",
			time: "11:59 PM",
			color: "bg-red-50 text-red-700 border-red-100",
		},
		{
			id: 3,
			title: "University Week Opening",
			date: new Date(2023, 10, 24),
			type: "event",
			time: "All Day",
			color: "bg-classly-green text-white",
		},
		{
			id: 4,
			title: "MATH 104 - Quiz",
			date: addDays(new Date(), 2),
			type: "exam",
			time: "10:00 AM",
			color: "bg-classly-gold text-white",
		},
	];

	// --- LOGIC: GENERATE THE GRID ---
	const renderHeader = () => {
		return (
			<div className="flex items-center justify-between mb-8">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">
						{format(currentMonth, "MMMM yyyy")}
					</h2>
					<p className="text-gray-500 text-sm">Manage your academic schedule</p>
				</div>

				<div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
					<button
						onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
						className="p-2 hover:bg-gray-50 rounded-md text-gray-500 transition"
					>
						<ChevronLeft size={20} />
					</button>
					<button
						onClick={() => setCurrentMonth(new Date())}
						className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition"
					>
						Today
					</button>
					<button
						onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
						className="p-2 hover:bg-gray-50 rounded-md text-gray-500 transition"
					>
						<ChevronRight size={20} />
					</button>
				</div>
			</div>
		);
	};

	const renderDays = () => {
		const dateFormat = "EEEE"; // "Monday", "Tuesday"...
		const days = [];
		let startDate = startOfWeek(currentMonth);

		for (let i = 0; i < 7; i++) {
			days.push(
				<div
					key={i}
					className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center py-3"
				>
					{format(addDays(startDate, i), dateFormat)}
				</div>
			);
		}
		return (
			<div className="grid grid-cols-7 mb-2 border-b border-gray-200">
				{days}
			</div>
		);
	};

	const renderCells = () => {
		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(monthStart);
		const startDate = startOfWeek(monthStart);
		const endDate = endOfWeek(monthEnd);

		const dateFormat = "d";
		const rows = [];
		let days = [];
		let day = startDate;
		let formattedDate = "";

		while (day <= endDate) {
			for (let i = 0; i < 7; i++) {
				formattedDate = format(day, dateFormat);
				const cloneDay = day; // Capture for closure

				// Find events for this specific day
				const dayEvents = events.filter((e) => isSameDay(e.date, day));

				days.push(
					<div
						key={day}
						onClick={() => setSelectedDate(cloneDay)}
						className={`min-h-[140px] border-r border-b border-gray-100 p-2 transition-colors hover:bg-gray-50 cursor-pointer flex flex-col gap-1 ${
							!isSameMonth(day, monthStart)
								? "bg-gray-50/50 text-gray-300" // Days outside month
								: "bg-white text-gray-700"
						} ${
							isSameDay(day, selectedDate)
								? "ring-2 ring-inset ring-classly-green/50"
								: ""
						}`}
					>
						{/* Date Number */}
						<div
							className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
								isToday(day) ? "bg-classly-green text-white shadow-md" : ""
							}`}
						>
							{formattedDate}
						</div>

						{/* Event Pills */}
						<div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
							{dayEvents.map((ev) => (
								<div
									key={ev.id}
									className={`text-[10px] px-2 py-1 rounded border truncate font-medium ${
										ev.color
									} ${
										ev.type === "event" || ev.type === "exam" ? "shadow-sm" : ""
									}`}
								>
									{ev.type === "deadline" && (
										<span className="font-bold mr-1">!</span>
									)}
									{ev.time !== "All Day" && (
										<span className="opacity-75 mr-1">
											{ev.time.split(" ")[0]}
										</span>
									)}
									{ev.title}
								</div>
							))}
						</div>
					</div>
				);
				day = addDays(day, 1);
			}
			rows.push(
				<div
					key={day}
					className="grid grid-cols-7 border-l border-t border-gray-200 rounded-lg overflow-hidden shadow-sm"
				>
					{days}
				</div>
			);
			days = [];
		}
		return <div className="bg-white rounded-xl">{rows}</div>;
	};

	// --- RENDER ---
	return (
		<div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col lg:flex-row gap-8">
			{/* Left: Main Calendar Grid */}
			<div className="flex-1">
				{renderHeader()}
				{renderDays()}
				{renderCells()}
			</div>

			{/* Right: Side Panel (Agenda / Details) */}
			<div className="w-full lg:w-80 flex flex-col gap-6">
				{/* Selected Date Details */}
				<div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
					<h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
						<CalendarIcon size={18} className="text-classly-green" />
						{format(selectedDate, "EEEE, MMMM do")}
					</h3>

					<div className="space-y-4">
						{events.filter((e) => isSameDay(e.date, selectedDate)).length >
						0 ? (
							events
								.filter((e) => isSameDay(e.date, selectedDate))
								.map((e) => (
									<div key={e.id} className="flex gap-3 items-start">
										<div
											className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
												e.type === "deadline"
													? "bg-red-500"
													: e.type === "class"
													? "bg-blue-500"
													: "bg-classly-gold"
											}`}
										></div>
										<div>
											<p className="text-sm font-bold text-gray-800">
												{e.title}
											</p>
											<p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
												<Clock size={12} /> {e.time}
											</p>
										</div>
									</div>
								))
						) : (
							<div className="text-center py-8 text-gray-400 text-sm">
								No events scheduled.
								<button className="block mx-auto mt-2 text-classly-green font-medium hover:underline">
									+ Add Event
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Upcoming Deadlines Widget (Reused Style) */}
				<div className="bg-linear-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
					<div className="relative z-10">
						<div className="flex items-center gap-2 mb-4">
							<AlertCircle size={18} className="text-classly-gold" />
							<span className="font-bold text-sm uppercase tracking-wide">
								Next Deadline
							</span>
						</div>
						<h4 className="text-lg font-semibold">Final Project Proposal</h4>
						<p className="text-gray-400 text-sm mt-1">
							IT 101 • Due Today, 11:59 PM
						</p>

						<div className="mt-6 flex gap-2">
							<button className="flex-1 py-2 bg-white text-gray-900 text-xs font-bold rounded hover:bg-gray-100 transition">
								Submit Now
							</button>
							<button className="px-3 py-2 bg-white/10 text-white text-xs font-bold rounded hover:bg-white/20 transition">
								View Details
							</button>
						</div>
					</div>
					{/* Decoration */}
					<div className="absolute -right-4 -top-4 w-24 h-24 bg-classly-gold rounded-full blur-3xl opacity-20"></div>
				</div>

				{/* Filters */}
				<div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
					<div className="flex items-center justify-between mb-3">
						<h4 className="text-sm font-bold text-gray-900">Filters</h4>
						<Filter size={14} className="text-gray-400" />
					</div>
					<div className="space-y-2">
						<label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
							<input
								type="checkbox"
								defaultChecked
								className="rounded text-classly-green focus:ring-classly-green"
							/>
							Classes
						</label>
						<label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
							<input
								type="checkbox"
								defaultChecked
								className="rounded text-red-500 focus:ring-red-500"
							/>
							Assignments
						</label>
						<label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
							<input
								type="checkbox"
								defaultChecked
								className="rounded text-classly-gold focus:ring-classly-gold"
							/>
							Exams
						</label>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CalendarView;
