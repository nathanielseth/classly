import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Send, Paperclip, ImageIcon } from "lucide-react";
import { db } from "../../../lib/supabase";
import { AnnouncementCard } from "../../classroom/shared/AnnouncementCard";
import { EmptyState } from "../../classroom/shared/EmptyState";
import { MessageSquare } from "lucide-react";

export const InstructorStreamTab = ({ subjectId, userId }) => {
	const [announcements, setAnnouncements] = useState([]);
	const [loading, setLoading] = useState(true);
	const [newAnnouncement, setNewAnnouncement] = useState("");
	const [posting, setPosting] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [editContent, setEditContent] = useState("");

	const loadAnnouncements = useCallback(async () => {
		try {
			setLoading(true);
			const { data, error } = await db.announcements.getBySubject(subjectId);
			if (error) throw error;
			setAnnouncements(data || []);
		} catch (err) {
			console.error("Announcements load error:", err);
		} finally {
			setLoading(false);
		}
	}, [subjectId]);

	useEffect(() => {
		loadAnnouncements();
	}, [loadAnnouncements]);

	const handlePost = async () => {
		if (!newAnnouncement.trim()) return;

		try {
			setPosting(true);
			const { error } = await db.announcements.create({
				subject_id: subjectId,
				author_id: userId,
				content: newAnnouncement,
			});
			if (error) throw error;
			setNewAnnouncement("");
			await loadAnnouncements();
		} catch (err) {
			console.error("Post error:", err);
			alert("Failed to post announcement");
		} finally {
			setPosting(false);
		}
	};

	const handleEdit = async (id) => {
		try {
			const { error } = await db.announcements.update(id, {
				content: editContent,
			});
			if (error) throw error;
			setEditingId(null);
			setEditContent("");
			await loadAnnouncements();
		} catch (err) {
			console.error("Edit error:", err);
			alert("Failed to edit announcement");
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Delete this announcement?")) return;

		try {
			const { error } = await db.announcements.delete(id);
			if (error) throw error;
			await loadAnnouncements();
		} catch (err) {
			console.error("Delete error:", err);
			alert("Failed to delete announcement");
		}
	};

	const handleTogglePin = async (id, currentPinned) => {
		try {
			const { error } = await db.announcements.update(id, {
				pinned: !currentPinned,
			});
			if (error) throw error;
			await loadAnnouncements();
		} catch (err) {
			console.error("Pin error:", err);
			alert("Failed to pin/unpin announcement");
		}
	};

	if (loading) {
		return (
			<div className="px-6 py-6 flex items-center justify-center">
				<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="px-6 space-y-4">
			{/* Post Input */}
			<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
				<div className="flex gap-3">
					<img
						src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
						alt="You"
						className="w-10 h-10 rounded-full bg-gray-100"
					/>
					<div className="flex-1">
						<textarea
							value={newAnnouncement}
							onChange={(e) => setNewAnnouncement(e.target.value)}
							placeholder="Share with your class..."
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all text-sm resize-none"
							rows={3}
							disabled={posting}
						/>
						<div className="flex items-center justify-between mt-3">
							<div className="flex gap-2">
								<button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
									<Paperclip size={16} />
								</button>
								<button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
									<ImageIcon size={16} />
								</button>
							</div>
							<button
								onClick={handlePost}
								disabled={!newAnnouncement.trim() || posting}
								className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{posting ? (
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

			{/* Announcements */}
			{editingId ? (
				<div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
					<textarea
						value={editContent}
						onChange={(e) => setEditContent(e.target.value)}
						className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 text-sm resize-none"
						rows={3}
					/>
					<div className="flex gap-2 mt-2">
						<button
							onClick={() => handleEdit(editingId)}
							className="px-3 py-1.5 bg-classly-green text-white text-xs font-medium rounded-lg hover:bg-classly-green/90"
						>
							Save
						</button>
						<button
							onClick={() => {
								setEditingId(null);
								setEditContent("");
							}}
							className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50"
						>
							Cancel
						</button>
					</div>
				</div>
			) : null}

			{announcements.map((announcement) => (
				<AnnouncementCard
					key={announcement.id}
					announcement={announcement}
					userRole="instructor"
					onEdit={() => {
						setEditingId(announcement.id);
						setEditContent(announcement.content);
					}}
					onDelete={() => handleDelete(announcement.id)}
					onTogglePin={() =>
						handleTogglePin(announcement.id, announcement.pinned)
					}
					onComment={() => {}}
				/>
			))}

			{announcements.length === 0 && (
				<EmptyState
					icon={MessageSquare}
					title="No posts yet"
					description="Share your first announcement with the class"
				/>
			)}
		</div>
	);
};
