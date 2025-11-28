// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
});

// ============================================
// AUTH HELPERS
// ============================================

export const auth = {
	signUp: async ({ email, password, fullName, role }) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName,
					role: role,
				},
			},
		});
		return { data, error };
	},

	signIn: async ({ email, password }) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { data, error };
	},

	signOut: async () => {
		const { error } = await supabase.auth.signOut();
		return { error };
	},

	getSession: async () => {
		const { data, error } = await supabase.auth.getSession();
		return { data, error };
	},

	getUser: async () => {
		const { data, error } = await supabase.auth.getUser();
		return { data, error };
	},
};

// ============================================
// DATABASE HELPERS
// ============================================

export const db = {
	// PROFILES
	profiles: {
		getById: async (id) => {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", id)
				.single();
			return { data, error };
		},

		getByRole: async (role) => {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("role", role);
			return { data, error };
		},

		update: async (id, updates) => {
			const { data, error } = await supabase
				.from("profiles")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},
	},

	// SUBJECTS
	subjects: {
		getAll: async () => {
			const { data, error } = await supabase
				.from("subjects")
				.select(
					`
          *,
          instructor:profiles!subjects_instructor_id_fkey(id, full_name, email)
        `
				)
				.order("name");
			return { data, error };
		},

		getById: async (id) => {
			const { data, error } = await supabase
				.from("subjects")
				.select(
					`
          *,
          instructor:profiles!subjects_instructor_id_fkey(id, full_name, email)
        `
				)
				.eq("id", id)
				.single();
			return { data, error };
		},

		getByInstructor: async (instructorId) => {
			const { data, error } = await supabase
				.from("subjects")
				.select("*")
				.eq("instructor_id", instructorId)
				.order("name");
			return { data, error };
		},

		getByCode: async (code) => {
			const { data, error } = await supabase
				.from("subjects")
				.select(
					`
          *,
          instructor:profiles!subjects_instructor_id_fkey(id, full_name, email)
        `
				)
				.eq("code", code.toUpperCase())
				.single();
			return { data, error };
		},

		getDetailedById: async (subjectId) => {
			const { data, error } = await supabase
				.from("subjects")
				.select(
					`
          *,
          instructor:profiles!subjects_instructor_id_fkey(id, full_name, email),
          enrollments:enrollments(count),
          assignments:assignments(count),
          announcements:announcements(count)
        `
				)
				.eq("id", subjectId)
				.single();
			return { data, error };
		},

		create: async (subject) => {
			const { data, error } = await supabase
				.from("subjects")
				.insert(subject)
				.select()
				.single();
			return { data, error };
		},

		update: async (id, updates) => {
			const { data, error } = await supabase
				.from("subjects")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},

		delete: async (id) => {
			const { error } = await supabase.from("subjects").delete().eq("id", id);
			return { error };
		},
	},

	// ENROLLMENTS - FIXED WITH EXACT CONSTRAINT NAMES
	enrollments: {
		getByStudent: async (studentId) => {
			const { data, error } = await supabase
				.from("enrollments")
				.select(
					`
          *,
          subject:subjects!enrollments_subject_id_fkey(
            *,
            instructor:profiles!subjects_instructor_id_fkey(id, full_name, email)
          )
        `
				)
				.eq("student_id", studentId)
				.order("enrolled_at", { ascending: false });
			return { data, error };
		},

		getBySubject: async (subjectId) => {
			const { data, error } = await supabase
				.from("enrollments")
				.select(
					`
          *,
          student:profiles!enrollments_student_id_fkey(id, full_name, email)
        `
				)
				.eq("subject_id", subjectId)
				.order("enrolled_at", { ascending: false });
			return { data, error };
		},

		checkEnrollment: async (studentId, subjectId) => {
			const { data, error } = await supabase
				.from("enrollments")
				.select("id")
				.eq("student_id", studentId)
				.eq("subject_id", subjectId)
				.maybeSingle();
			return { data, error };
		},

		enroll: async (studentId, subjectId) => {
			const { data, error } = await supabase
				.from("enrollments")
				.insert({ student_id: studentId, subject_id: subjectId })
				.select()
				.single();
			return { data, error };
		},

		unenroll: async (studentId, subjectId) => {
			const { error } = await supabase
				.from("enrollments")
				.delete()
				.eq("student_id", studentId)
				.eq("subject_id", subjectId);
			return { error };
		},
	},

	// ASSIGNMENTS
	assignments: {
		getBySubject: async (subjectId) => {
			const { data, error } = await supabase
				.from("assignments")
				.select("*")
				.eq("subject_id", subjectId)
				.order("due_date", { ascending: true });
			return { data, error };
		},

		getUpcomingForStudent: async (studentId, limit = 10) => {
			// First get enrolled subject IDs
			const { data: enrollments } = await supabase
				.from("enrollments")
				.select("subject_id")
				.eq("student_id", studentId);

			if (!enrollments || enrollments.length === 0) {
				return { data: [], error: null };
			}

			const subjectIds = enrollments.map((e) => e.subject_id);

			// Then get assignments for those subjects
			const { data, error } = await supabase
				.from("assignments")
				.select(
					`
          *,
          subject:subjects(id, name, code)
        `
				)
				.gte("due_date", new Date().toISOString())
				.in("subject_id", subjectIds)
				.order("due_date", { ascending: true })
				.limit(limit);

			return { data, error };
		},

		getById: async (id) => {
			const { data, error } = await supabase
				.from("assignments")
				.select(
					`
          *,
          subject:subjects(*)
        `
				)
				.eq("id", id)
				.single();
			return { data, error };
		},

		create: async (assignment) => {
			const { data, error } = await supabase
				.from("assignments")
				.insert(assignment)
				.select()
				.single();
			return { data, error };
		},

		update: async (id, updates) => {
			const { data, error } = await supabase
				.from("assignments")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},

		delete: async (id) => {
			const { error } = await supabase
				.from("assignments")
				.delete()
				.eq("id", id);
			return { error };
		},
	},

	// SUBMISSIONS
	submissions: {
		getByStudent: async (studentId, assignmentId) => {
			const { data, error } = await supabase
				.from("submissions")
				.select("*")
				.eq("student_id", studentId)
				.eq("assignment_id", assignmentId)
				.single();
			return { data, error };
		},

		getByAssignment: async (assignmentId) => {
			const { data, error } = await supabase
				.from("submissions")
				.select(
					`
          *,
          student:profiles!submissions_student_id_fkey(id, full_name, email)
        `
				)
				.eq("assignment_id", assignmentId)
				.order("submitted_at", { ascending: false });
			return { data, error };
		},

		create: async (submission) => {
			const { data, error } = await supabase
				.from("submissions")
				.insert(submission)
				.select()
				.single();
			return { data, error };
		},

		update: async (id, updates) => {
			const { data, error } = await supabase
				.from("submissions")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},
	},

	// ANNOUNCEMENTS - FIXED WITH EXACT CONSTRAINT NAMES
	announcements: {
		getBySubject: async (subjectId, limit = 20) => {
			const { data, error } = await supabase
				.from("announcements")
				.select(
					`
          *,
          author:profiles!announcements_author_id_fkey(id, full_name, email)
        `
				)
				.eq("subject_id", subjectId)
				.order("pinned", { ascending: false })
				.order("created_at", { ascending: false })
				.limit(limit);
			return { data, error };
		},

		getRecentForStudent: async (studentId, limit = 10) => {
			const { data: enrollments } = await supabase
				.from("enrollments")
				.select("subject_id")
				.eq("student_id", studentId);

			if (!enrollments || enrollments.length === 0) {
				return { data: [], error: null };
			}

			const subjectIds = enrollments.map((e) => e.subject_id);

			const { data, error } = await supabase
				.from("announcements")
				.select(
					`
          *,
          subject:subjects!announcements_subject_id_fkey(id, name, code),
          author:profiles!announcements_author_id_fkey(id, full_name, email)
        `
				)
				.in("subject_id", subjectIds)
				.order("created_at", { ascending: false })
				.limit(limit);

			return { data, error };
		},

		create: async (announcement) => {
			const { data, error } = await supabase
				.from("announcements")
				.insert(announcement)
				.select()
				.single();
			return { data, error };
		},

		update: async (id, updates) => {
			const { data, error } = await supabase
				.from("announcements")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},

		delete: async (id) => {
			const { error } = await supabase
				.from("announcements")
				.delete()
				.eq("id", id);
			return { error };
		},
	},
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export const subscriptions = {
	subscribeToAssignments: (subjectId, callback) => {
		return supabase
			.channel(`assignments:${subjectId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "assignments",
					filter: `subject_id=eq.${subjectId}`,
				},
				callback
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
				callback
			)
			.subscribe();
	},

	unsubscribe: (channel) => {
		return supabase.removeChannel(channel);
	},
};
