import { ArrowLeft, Clock, Settings, Trash2 } from "lucide-react";

export const ClassroomHeader = ({
	subject,
	onBack,
	userRole,
	onEdit,
	onDelete,
}) => {
	return (
		<header className="bg-linear-to-r from-classly-green to-emerald-600 text-white shadow-md">
			<div className="px-6 py-6 max-w-7xl mx-auto">
				<div className="flex items-center gap-4 mb-4">
					<button
						onClick={onBack}
						className="p-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
					>
						<ArrowLeft size={20} />
					</button>
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<span className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full uppercase tracking-wide">
								{subject.code}
							</span>
							<span className="text-xs text-white/70 flex items-center gap-1">
								<Clock size={12} />
								{subject.schedule || "TBA"}
							</span>
							{subject.room && (
								<span className="text-xs text-white/70">• {subject.room}</span>
							)}
						</div>
						<h1 className="text-3xl font-bold text-white">{subject.name}</h1>
						{subject.instructor && (
							<p className="text-sm text-white/80 mt-1">
								{subject.instructor.full_name}
							</p>
						)}
					</div>
					{userRole === "instructor" && (
						<div className="flex gap-2">
							<button
								onClick={onEdit}
								className="p-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
								title="Edit Subject"
							>
								<Settings size={20} />
							</button>
							<button
								onClick={onDelete}
								className="p-2 text-white/80 hover:bg-red-500/20 rounded-lg transition-colors"
								title="Delete Subject"
							>
								<Trash2 size={20} />
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};
