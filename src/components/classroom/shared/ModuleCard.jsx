import { FileText, Trash2 } from "lucide-react";

export const ModuleCard = ({ module, userRole, onDelete }) => {
	const dueDate = new Date(module.due_date);
	const isOverdue = dueDate < new Date();

	return (
		<div className="p-4 hover:bg-gray-50 transition-colors">
			<div className="flex items-center gap-3">
				<div
					className={`w-9 h-9 rounded-lg ${
						isOverdue ? "bg-red-50" : "bg-blue-50"
					} flex items-center justify-center shrink-0`}
				>
					<FileText
						size={16}
						className={isOverdue ? "text-red-600" : "text-blue-600"}
					/>
				</div>
				<div className="flex-1">
					<p className="text-sm font-medium text-gray-900">{module.title}</p>
					<div className="flex items-center gap-2 mt-1">
						<span
							className={`text-xs font-medium ${
								isOverdue
									? "text-red-600 bg-red-50"
									: "text-orange-600 bg-orange-50"
							} px-2 py-0.5 rounded`}
						>
							{isOverdue ? "Overdue" : `Due ${dueDate.toLocaleDateString()}`}
						</span>
						<span className="text-xs text-gray-500">
							{module.max_points} points
						</span>
						<span className="text-xs text-gray-400 capitalize">
							• {module.type}
						</span>
					</div>
				</div>
				{userRole === "instructor" && (
					<button
						onClick={onDelete}
						className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
						title="Delete Module"
					>
						<Trash2 size={16} />
					</button>
				)}
			</div>
		</div>
	);
};
