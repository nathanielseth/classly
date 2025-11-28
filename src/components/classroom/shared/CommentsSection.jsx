import { useState } from "react";
import { Send, Loader2, MessageSquare, Lock } from "lucide-react";

export const CommentsSection = ({
	comments = [],
	currentUser,
	onAddComment,
	loading = false,
	type = "class", // "class" or "private"
}) => {
	const [newComment, setNewComment] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [showComments, setShowComments] = useState(type === "private");

	const handleSubmit = async () => {
		if (!newComment.trim()) {
			return;
		}

		try {
			setSubmitting(true);
			await onAddComment({
				content: newComment.trim(),
				is_private: type === "private",
			});
			setNewComment("");
		} catch (err) {
			console.error("Add comment error:", err);
			alert("Failed to post comment");
		} finally {
			setSubmitting(false);
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			handleSubmit();
		}
	};

	const formatTimestamp = (timestamp) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
		});
	};

	const isPrivate = type === "private";
	const filteredComments = comments.filter((c) =>
		isPrivate ? c.is_private : !c.is_private
	);

	return (
		<div className="bg-white rounded-lg border border-gray-200">
			{/* Header */}
			<div className="p-4 border-b border-gray-100">
				<button
					onClick={() => setShowComments(!showComments)}
					className="w-full flex items-center justify-between text-left"
				>
					<div className="flex items-center gap-2">
						{isPrivate ? (
							<Lock className="w-5 h-5 text-gray-600" />
						) : (
							<MessageSquare className="w-5 h-5 text-gray-600" />
						)}
						<h3 className="font-semibold text-gray-900">
							{isPrivate ? "Private Comments" : "Class Comments"}
						</h3>
						{filteredComments.length > 0 && (
							<span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
								{filteredComments.length}
							</span>
						)}
					</div>
					<span className="text-sm text-gray-500">
						{showComments ? "Hide" : "Show"}
					</span>
				</button>
				{isPrivate && (
					<p className="text-xs text-gray-500 mt-1 ml-7">
						Only you and your instructor can see these comments
					</p>
				)}
			</div>

			{/* Comments Content */}
			{showComments && (
				<div className="p-4 space-y-4">
					{/* Comment Input */}
					<div className="space-y-3">
						<div className="flex gap-3">
							<div className="w-8 h-8 bg-classly-green rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
								{currentUser?.full_name?.[0]?.toUpperCase() || "U"}
							</div>
							<div className="flex-1">
								<textarea
									value={newComment}
									onChange={(e) => setNewComment(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder={
										isPrivate
											? "Add a private comment..."
											: "Add a class comment..."
									}
									className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none text-sm"
									rows={3}
									disabled={submitting}
								/>
								<div className="flex items-center justify-between mt-2">
									<span className="text-xs text-gray-500">
										Ctrl+Enter to post
									</span>
									<button
										onClick={handleSubmit}
										disabled={submitting || !newComment.trim()}
										className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{submitting ? (
											<>
												<Loader2 size={14} className="animate-spin" />
												Posting...
											</>
										) : (
											<>
												<Send size={14} />
												Post
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					</div>

					{/* Comments List */}
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
						</div>
					) : filteredComments.length === 0 ? (
						<div className="text-center py-8">
							<MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
							<p className="text-sm text-gray-500">
								{isPrivate
									? "No private comments yet"
									: "No class comments yet"}
							</p>
							<p className="text-xs text-gray-400 mt-1">
								Be the first to comment
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{filteredComments.map((comment) => {
								const isOwnComment = comment.author_id === currentUser?.id;
								const isInstructor = comment.author?.role === "instructor";

								return (
									<div key={comment.id} className="flex gap-3">
										<div
											className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${
												isInstructor ? "bg-purple-500" : "bg-blue-500"
											}`}
										>
											{comment.author?.full_name?.[0]?.toUpperCase() || "U"}
										</div>
										<div className="flex-1 min-w-0">
											<div className="bg-gray-50 rounded-lg p-3">
												<div className="flex items-center gap-2 mb-1">
													<span className="font-medium text-sm text-gray-900">
														{comment.author?.full_name || "Unknown"}
													</span>
													{isInstructor && (
														<span className="text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
															Instructor
														</span>
													)}
													{isOwnComment && (
														<span className="text-xs text-gray-500">(You)</span>
													)}
												</div>
												<p className="text-sm text-gray-700 whitespace-pre-wrap">
													{comment.content}
												</p>
											</div>
											<span className="text-xs text-gray-500 ml-3 mt-1 inline-block">
												{formatTimestamp(comment.created_at)}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
