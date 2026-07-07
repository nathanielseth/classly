import { supabase } from "./client";

export const subscriptions = {
	subscribeTomaterials: (subjectId, callback) => {
		return supabase
			.channel(`materials:${subjectId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "materials",
					filter: `subject_id=eq.${subjectId}`,
				},
				callback,
			)
			.subscribe();
	},

	subscribeToAnnouncements: (subjectId, callback) => {
		return supabase
			.channel(`announcements:${subjectId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "announcements",
					filter: `subject_id=eq.${subjectId}`,
				},
				callback,
			)
			.subscribe();
	},

	subscribeToComments: (materialId, callback) => {
		return supabase
			.channel(`comments:${materialId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "material_comments",
					filter: `assignment_id=eq.${materialId}`,
				},
				callback,
			)
			.subscribe();
	},

	subscribeToSubmissions: (assignmentId, callback) => {
		return supabase
			.channel(`submissions:${assignmentId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "submissions",
					filter: `assignment_id=eq.${assignmentId}`,
				},
				callback,
			)
			.subscribe();
	},

	subscribeToMessages: (conversationId, callback) => {
		return supabase
			.channel(`messages:${conversationId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `conversation_id=eq.${conversationId}`,
				},
				callback,
			)
			.subscribe();
	},

	subscribeToGroupMessages: (conversationId, callback) => {
		return supabase
			.channel(`group_messages:${conversationId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "group_messages",
					filter: `conversation_id=eq.${conversationId}`,
				},
				callback,
			)
			.subscribe();
	},

	unsubscribe: (channel) => {
		return supabase.removeChannel(channel);
	},
};