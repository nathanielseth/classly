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
// STORAGE HELPERS
// ============================================

export const storage = {
	upload: async (bucket, path, file, options = {}) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.upload(path, file, {
				cacheControl: "3600",
				upsert: false,
				...options,
			});
		return { data, error };
	},

	getPublicUrl: (bucket, path) => {
		const { data } = supabase.storage.from(bucket).getPublicUrl(path);
		return data.publicUrl;
	},

	delete: async (bucket, paths) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.remove(Array.isArray(paths) ? paths : [paths]);
		return { data, error };
	},

	list: async (bucket, path = "", options = {}) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.list(path, options);
		return { data, error };
	},

	download: async (bucket, path) => {
		const { data, error } = await supabase.storage.from(bucket).download(path);
		return { data, error };
	},

	createSignedUrl: async (bucket, path, expiresIn = 3600) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.createSignedUrl(path, expiresIn);
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

	// ENROLLMENTS
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
          student:profiles!enrollments_student_id_fkey(id, full_name, email, role)
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

	// TOPICS - NEW!
	topics: {
		getBySubject: async (subjectId) => {
			const { data, error } = await supabase
				.from("topics")
				.select("*")
				.eq("subject_id", subjectId)
				.order("order_index", { ascending: true })
				.order("created_at", { ascending: true });
			return { data, error };
		},

		getById: async (id) => {
			const { data, error } = await supabase
				.from("topics")
				.select("*")
				.eq("id", id)
				.single();
			return { data, error };
		},

		create: async (topic) => {
			const { data, error } = await supabase
				.from("topics")
				.insert(topic)
				.select()
				.single();
			return { data, error };
		},

		update: async (id, updates) => {
			const { data, error } = await supabase
				.from("topics")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},

		delete: async (id) => {
			// Before deleting, set all materials in this topic to topic_id = null
			await supabase
				.from("assignments")
				.update({ topic_id: null })
				.eq("topic_id", id);

			const { error } = await supabase.from("topics").delete().eq("id", id);
			return { error };
		},

		reorder: async (topicIds) => {
			// Update order_index for multiple topics
			const updates = topicIds.map((id, index) => ({ id, order_index: index }));
			const { error } = await supabase.from("topics").upsert(updates);
			return { error };
		},
	},

	// ASSIGNMENTS (Course Materials) - ENHANCED!
	assignments: {
		getBySubject: async (subjectId) => {
			const { data, error } = await supabase
				.from("assignments")
				.select("*")
				.eq("subject_id", subjectId)
				.order("created_at", { ascending: false });
			return { data, error };
		},

		// Get materials with student's submission status
		getBySubjectWithSubmissions: async (subjectId, studentId) => {
			const { data, error } = await supabase
				.from("assignments")
				.select(
					`
          *,
          submissions!left(
            id,
            status,
            grade,
            submitted_at,
            is_late
          )
        `
				)
				.eq("subject_id", subjectId)
				.eq("submissions.student_id", studentId)
				.order("created_at", { ascending: false });
			return { data, error };
		},

		getUpcomingForStudent: async (studentId, limit = 10) => {
			const { data: enrollments } = await supabase
				.from("enrollments")
				.select("subject_id")
				.eq("student_id", studentId);

			if (!enrollments || enrollments.length === 0) {
				return { data: [], error: null };
			}

			const subjectIds = enrollments.map((e) => e.subject_id);

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

		// Get material with student's submission
		getByIdWithSubmission: async (materialId, studentId) => {
			const { data, error } = await supabase
				.from("assignments")
				.select(
					`
          *,
          subject:subjects(*),
          submissions!left(*)
        `
				)
				.eq("id", materialId)
				.eq("submissions.student_id", studentId)
				.single();

			// Extract single submission from array
			if (data && data.submissions) {
				data.submission = data.submissions[0] || null;
				delete data.submissions;
			}

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

		// Get submission statistics for an assignment
		getSubmissionStats: async (assignmentId) => {
			const { data: submissions, error } = await supabase
				.from("submissions")
				.select("status")
				.eq("assignment_id", assignmentId);

			if (error) return { data: null, error };

			const stats = {
				total: submissions.length,
				submitted: submissions.filter(
					(s) =>
						s.status === "submitted" ||
						s.status === "late" ||
						s.status === "graded" ||
						s.status === "returned"
				).length,
				graded: submissions.filter(
					(s) => s.status === "graded" || s.status === "returned"
				).length,
			};

			return { data: stats, error: null };
		},
	},

	// SUBMISSIONS - ENHANCED!
	submissions: {
		getByStudent: async (studentId, assignmentId) => {
			const { data, error } = await supabase
				.from("submissions")
				.select("*")
				.eq("student_id", studentId)
				.eq("assignment_id", assignmentId)
				.maybeSingle();
			return { data, error };
		},

		getByAssignment: async (assignmentId) => {
			const { data, error } = await supabase
				.from("submissions")
				.select(
					`
          *,
          student:profiles!submissions_student_id_fkey(id, full_name, email, role)
        `
				)
				.eq("assignment_id", assignmentId)
				.order("submitted_at", { ascending: false });
			return { data, error };
		},

		// Get all submissions with student details for grading view
		getAllWithStudents: async (assignmentId, enrolledStudentIds) => {
			const { data: submissions, error } = await supabase
				.from("submissions")
				.select(
					`
          *,
          student:profiles!submissions_student_id_fkey(id, full_name, email, role)
        `
				)
				.eq("assignment_id", assignmentId);

			if (error) return { data: null, error };

			// Create a map of existing submissions
			const submissionMap = {};
			submissions.forEach((sub) => {
				submissionMap[sub.student_id] = sub;
			});

			// Get all enrolled students
			const { data: students, error: studentsError } = await supabase
				.from("profiles")
				.select("id, full_name, email, role")
				.in("id", enrolledStudentIds);

			if (studentsError) return { data: null, error: studentsError };

			return { data: { submissions, students }, error: null };
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

		// Submit work (create or update)
		submit: async (
			assignmentId,
			studentId,
			content,
			fileUrl,
			fileName,
			fileSize
		) => {
			// Check if submission exists
			const { data: existing } = await supabase
				.from("submissions")
				.select("id")
				.eq("assignment_id", assignmentId)
				.eq("student_id", studentId)
				.maybeSingle();

			// Get assignment to check due date
			const { data: assignment } = await supabase
				.from("assignments")
				.select("due_date")
				.eq("id", assignmentId)
				.single();

			const now = new Date();
			const dueDate = assignment?.due_date
				? new Date(assignment.due_date)
				: null;
			const isLate = dueDate && now > dueDate;

			const submissionData = {
				assignment_id: assignmentId,
				student_id: studentId,
				content: content || null,
				file_url: fileUrl || null,
				file_name: fileName || null,
				file_size: fileSize || null,
				status: isLate ? "late" : "submitted",
				is_late: isLate,
				submitted_at: now.toISOString(),
			};

			if (existing) {
				// Update existing submission
				const { data, error } = await supabase
					.from("submissions")
					.update(submissionData)
					.eq("id", existing.id)
					.select()
					.single();
				return { data, error };
			} else {
				// Create new submission
				const { data, error } = await supabase
					.from("submissions")
					.insert(submissionData)
					.select()
					.single();
				return { data, error };
			}
		},

		// Unsubmit work
		unsubmit: async (submissionId) => {
			const { data, error } = await supabase
				.from("submissions")
				.update({
					status: "not_submitted",
					submitted_at: null,
				})
				.eq("id", submissionId)
				.select()
				.single();
			return { data, error };
		},

		// Grade submission
		grade: async (submissionId, grade, feedback) => {
			const { data, error } = await supabase
				.from("submissions")
				.update({
					grade,
					feedback: feedback || null,
					status: "graded",
					graded_at: new Date().toISOString(),
				})
				.eq("id", submissionId)
				.select()
				.single();
			return { data, error };
		},

		// Return graded work to student
		returnWork: async (submissionId) => {
			const { data, error } = await supabase
				.from("submissions")
				.update({
					status: "returned",
					returned_at: new Date().toISOString(),
				})
				.eq("id", submissionId)
				.select()
				.single();
			return { data, error };
		},
	},

	// MATERIAL COMMENTS - NEW!
	materialComments: {
		getByMaterial: async (materialId) => {
			const { data, error } = await supabase
				.from("material_comments")
				.select(
					`
          *,
          author:profiles!material_comments_author_id_fkey(id, full_name, email, role)
        `
				)
				.eq("assignment_id", materialId)
				.order("created_at", { ascending: true });
			return { data, error };
		},

		// Get only class comments (public)
		getClassComments: async (materialId) => {
			const { data, error } = await supabase
				.from("material_comments")
				.select(
					`
          *,
          author:profiles!material_comments_author_id_fkey(id, full_name, email, role)
        `
				)
				.eq("assignment_id", materialId)
				.eq("is_private", false)
				.order("created_at", { ascending: true });
			return { data, error };
		},

		// Get private comments (student-instructor only)
		getPrivateComments: async (materialId, studentId, instructorId) => {
			const { data, error } = await supabase
				.from("material_comments")
				.select(
					`
          *,
          author:profiles!material_comments_author_id_fkey(id, full_name, email, role)
        `
				)
				.eq("assignment_id", materialId)
				.eq("is_private", true)
				.or(`author_id.eq.${studentId},author_id.eq.${instructorId}`)
				.order("created_at", { ascending: true });
			return { data, error };
		},

		create: async (comment) => {
			const { data, error } = await supabase
				.from("material_comments")
				.insert(comment)
				.select(
					`
          *,
          author:profiles!material_comments_author_id_fkey(id, full_name, email, role)
        `
				)
				.single();
			return { data, error };
		},

		delete: async (id) => {
			const { error } = await supabase
				.from("material_comments")
				.delete()
				.eq("id", id);
			return { error };
		},

		// Get comment count for a material
		getCount: async (materialId, isPrivate = false) => {
			const { count, error } = await supabase
				.from("material_comments")
				.select("*", { count: "exact", head: true })
				.eq("assignment_id", materialId)
				.eq("is_private", isPrivate);
			return { data: count, error };
		},
	},

	// ANNOUNCEMENTS
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
				callback
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
				callback
			)
			.subscribe();
	},

	unsubscribe: (channel) => {
		return supabase.removeChannel(channel);
	},
};
