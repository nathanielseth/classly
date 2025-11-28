import { useState, useEffect, useCallback } from "react";
import { db } from "../../../lib/supabase";

export const StreamTab = ({ subjectId }) => {
	const [announcements, setAnnouncements] = useState([]);
	const [loading, setLoading] = useState(true);

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

	if (loading) {
		return (
			<div className="px-6 py-6 flex items-center justify-center">
				<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="px-6 space-y-4">
			{announcements.map((announcement) => (
				<AnnouncementCard
					key={announcement.id}
					announcement={announcement}
					userRole="student"
					onComment={() => {}}
				/>
			))}

			{announcements.length === 0 && (
				<EmptyState
					// icon={MessageSquare}
					title="No posts yet"
					description="Check back later for announcements"
				/>
			)}
		</div>
	);
};
