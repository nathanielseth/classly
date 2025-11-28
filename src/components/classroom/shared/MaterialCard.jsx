import {
	FileText,
	Trash2,
	Paperclip,
	Download,
	Clock,
	CheckCircle,
	AlertCircle,
	Edit,
} from "lucide-react";

export const MaterialCard = ({
	material,
	userRole,
	onDelete,
	onEdit,
	onClick,
	submission, // Optional: student's submission for this material
}) => {
	const dueDate = material.due_date ? new Date(material.due_date) : null;
	const isOverdue = dueDate && dueDate < new Date();
	const isPast = dueDate && dueDate < new Date();

	// Type icons mapping
	const typeIcons = {
		assignment: FileText,
		quiz: FileText,
		exam: FileText,
		project: FileText,
		module: FileText,
		material: FileText,
	};

	const TypeIcon = typeIcons[material.type] || FileText;

	// Type colors - using direct color classes
	const getTypeColor = (type) => {
		const colors = {
			assignment: {
				bg: "bg-blue-50",
				text: "text-blue-600",
				badge: "bg-blue-50 text-blue-700",
			},
			quiz: {
				bg: "bg-purple-50",
				text: "text-purple-600",
				badge: "bg-purple-50 text-purple-700",
			},
			exam: {
				bg: "bg-red-50",
				text: "text-red-600",
				badge: "bg-red-50 text-red-700",
			},
			project: {
				bg: "bg-green-50",
				text: "text-green-600",
				badge: "bg-green-50 text-green-700",
			},
			module: {
				bg: "bg-indigo-50",
				text: "text-indigo-600",
				badge: "bg-indigo-50 text-indigo-700",
			},
			material: {
				bg: "bg-gray-50",
				text: "text-gray-600",
				badge: "bg-gray-50 text-gray-700",
			},
		};
		return colors[type] || colors.assignment;
	};

	const colorClasses = getTypeColor(material.type);

	const handleCardClick = (e) => {
		// Don't navigate if clicking action buttons
		if (e.target.closest("button")) return;
		if (onClick) onClick(material);
	};

	const handleDownload = async (e) => {
		e.stopPropagation();
		if (!material.file_url) return;

		try {
			window.open(material.file_url, "_blank");
		} catch (err) {
			console.error("Download error:", err);
			alert("Failed to download file");
		}
	};

	const handleDelete = (e) => {
		e.stopPropagation();
		if (onDelete) onDelete();
	};

	const handleEdit = (e) => {
		e.stopPropagation();
		if (onEdit) onEdit();
	};

	return (
		<div
			onClick={handleCardClick}
			className="group p-4 hover:bg-gray-50 transition-all cursor-pointer border-l-4 border-transparent hover:border-classly-green"
		>
			<div className="flex items-start gap-3">
				{/* Icon */}
				<div
					className={`w-10 h-10 rounded-lg ${colorClasses.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
				>
					<TypeIcon size={18} className={colorClasses.text} />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2">
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-semibold text-gray-900 group-hover:text-classly-green transition-colors">
								{material.title}
							</h3>
							{material.description && (
								<p className="text-xs text-gray-600 mt-1 line-clamp-2">
									{material.description}
								</p>
							)}
						</div>

						{/* Action buttons - Instructor only */}
						{userRole === "instructor" && (
							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									onClick={handleEdit}
									className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
									title="Edit"
								>
									<Edit size={16} />
								</button>
								<button
									onClick={handleDelete}
									className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
									title="Delete"
								>
									<Trash2 size={16} />
								</button>
							</div>
						)}
					</div>

					{/* Meta information */}
					<div className="flex flex-wrap items-center gap-2 mt-3">
						{/* Due date badge */}
						{dueDate && (
							<div
								className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
									isOverdue
										? "text-red-700 bg-red-50"
										: isPast
										? "text-gray-600 bg-gray-100"
										: "text-orange-700 bg-orange-50"
								}`}
							>
								<Clock size={12} />
								{isOverdue
									? "Overdue"
									: `Due ${dueDate.toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
									  })}`}
							</div>
						)}

						{/* Points */}
						{material.max_points > 0 && (
							<span className="text-xs text-gray-600 font-medium">
								{material.max_points} points
							</span>
						)}

						{/* Type badge */}
						<span
							className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses.badge} capitalize`}
						>
							{material.type}
						</span>

						{/* Posted date */}
						{material.created_at && !dueDate && (
							<span className="text-xs text-gray-500">
								Posted{" "}
								{new Date(material.created_at).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								})}
							</span>
						)}

						{/* File attachment indicator */}
						{material.file_url && (
							<button
								onClick={handleDownload}
								className="ml-auto flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-all"
							>
								<Paperclip size={12} />
								<span>Attachment</span>
								<Download size={12} />
							</button>
						)}
					</div>

					{/* Student submission status */}
					{userRole === "student" && submission && (
						<div className="mt-2 pt-2 border-t border-gray-100">
							<div className="flex items-center gap-2">
								{submission.status === "graded" && (
									<>
										<CheckCircle size={14} className="text-green-600" />
										<span className="text-xs font-medium text-green-700">
											Graded: {submission.grade}/{material.max_points}
										</span>
									</>
								)}
								{submission.status === "submitted" && (
									<>
										<CheckCircle size={14} className="text-blue-600" />
										<span className="text-xs font-medium text-blue-700">
											Turned in
										</span>
									</>
								)}
								{submission.status === "late" && (
									<>
										<AlertCircle size={14} className="text-orange-600" />
										<span className="text-xs font-medium text-orange-700">
											Turned in late
										</span>
									</>
								)}
								{submission.status === "returned" && (
									<>
										<CheckCircle size={14} className="text-green-600" />
										<span className="text-xs font-medium text-green-700">
											Returned: {submission.grade}/{material.max_points}
										</span>
									</>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
