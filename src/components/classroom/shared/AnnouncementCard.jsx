import { useState } from "react";
import { Pin, MoreVertical, MessageSquare } from "lucide-react";

export const AnnouncementCard = ({
	announcement,
	userRole,
	onEdit,
	onDelete,
	onTogglePin,
	onComment,
}) => {
	const [showMenu, setShowMenu] = useState(false);

	const formatTimeAgo = (date) => {
		const seconds = Math.floor((new Date() - new Date(date)) / 1000);
		if (seconds < 60) return "Just now";
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
		return new Date(date).toLocaleDateString();
	};

	return (
		<div
			className={`${
				announcement.pinned
					? "bg-linear-to-r from-green-50 to-emerald-50 border-l-4 border-classly-green"
					: "bg-white border border-gray-200"
			} rounded-xl p-5 shadow-sm`}
		>
			<div className="flex items-start gap-3">
				{announcement.pinned && (
					<Pin size={16} className="text-classly-green mt-1 shrink-0" />
				)}
				<img
					src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${announcement.author?.full_name}`}
					alt={announcement.author?.full_name}
					className="w-10 h-10 rounded-full"
				/>
				<div className="flex-1">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-1.5">
							<p className="text-sm font-semibold text-gray-900">
								{announcement.author?.full_name || "Unknown"}
							</p>
							<svg
								className="w-4 h-4 text-blue-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="text-xs text-gray-500">
								• {formatTimeAgo(announcement.created_at)}
							</span>
							{announcement.updated_at &&
								announcement.updated_at !== announcement.created_at && (
									<span className="text-xs text-gray-400 italic">(edited)</span>
								)}
						</div>
						{userRole === "instructor" && (
							<div className="relative">
								<button
									onClick={() => setShowMenu(!showMenu)}
									className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors"
								>
									<MoreVertical size={16} />
								</button>
								{showMenu && (
									<>
										<div
											className="fixed inset-0 z-10"
											onClick={() => setShowMenu(false)}
										/>
										<div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-40">
											<button
												onClick={() => {
													onTogglePin();
													setShowMenu(false);
												}}
												className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
											>
												<Pin size={14} />
												{announcement.pinned ? "Unpin" : "Pin"}
											</button>
											<button
												onClick={() => {
													onEdit();
													setShowMenu(false);
												}}
												className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
											>
												<Edit2 size={14} />
												Edit
											</button>
											<button
												onClick={() => {
													onDelete();
													setShowMenu(false);
												}}
												className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
											>
												<Trash2 size={14} />
												Delete
											</button>
										</div>
									</>
								)}
							</div>
						)}
					</div>

					{announcement.title && (
						<p className="text-sm font-semibold text-gray-900 mb-1">
							{announcement.title}
						</p>
					)}
					<p className="text-sm text-gray-700 leading-relaxed mb-3">
						{announcement.content}
					</p>

					<div className="flex items-center gap-4 text-xs text-gray-500">
						<button
							onClick={onComment}
							className="flex items-center gap-1 hover:text-classly-green transition-colors"
						>
							<MessageSquare size={14} />
							<span>Comment</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
