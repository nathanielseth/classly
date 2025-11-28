export const StudentCard = ({ student, userRole, onMessage, onRemove }) => {
	return (
		<div className="p-4 hover:bg-gray-50 transition-colors">
			<div className="flex items-center gap-3">
				<img
					src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.full_name}`}
					alt={student.full_name}
					className="w-10 h-10 rounded-full bg-gray-100"
				/>
				<div className="flex-1">
					<p className="text-sm font-medium text-gray-900">
						{student.full_name}
					</p>
					{userRole === "instructor" && (
						<p className="text-xs text-gray-500">{student.email}</p>
					)}
				</div>
				{userRole === "instructor" && (
					<div className="flex items-center gap-2">
						<button
							onClick={onMessage}
							className="px-3 py-1.5 text-xs font-medium text-classly-green hover:bg-green-50 rounded-lg transition-colors"
						>
							Message
						</button>
						<button
							onClick={onRemove}
							className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
							title="Remove Student"
						>
							<Trash2 size={14} />
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
