import { supabase } from "./client";

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
        `,
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
        `,
				)
				.eq("id", id)
				.single();
			return { data, error };
		},

		getByInstructor: async (instructorId, includeArchived = false) => {
			let query = supabase
				.from("subjects")
				.select("*")
				.eq("instructor_id", instructorId)
				.order("name");

			if (!includeArchived) {
				query = query.eq("archived", false);
			}

			const { data, error } = await query;
			return { data, error };
		},

		archive: async (id) => {
			const { data, error } = await supabase
				.from("subjects")
				.update({ archived: true, updated_at: new Date().toISOString() })
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},

		unarchive: async (id) => {
			const { data, error } = await supabase
				.from("subjects")
				.update({ archived: false, updated_at: new Date().toISOString() })
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},

		getByCode: async (code) => {
			const { data, error } = await supabase
				.from("subjects")
				.select(
					`
          *,
          instructor:profiles!subjects_instructor_id_fkey(id, full_name, email)
        `,
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
          materials:materials(count),
          announcements:announcements(count)
        `,
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
        `,
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
        `,
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

	// TOPICS
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
				.from("materials")
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

	// materials (Course Materials)
	materials: {
		getBySubject: async (subjectId) => {
			const { data, error } = await supabase
				.from("materials")
				.select("*")
				.eq("subject_id", subjectId)
				.order("created_at", { ascending: false });
			return { data, error };
		},

		// Get materials with student's submission status
		getBySubjectWithSubmissions: async (subjectId, studentId) => {
			const { data, error } = await supabase
				.from("materials")
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
        `,
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
				.from("materials")
				.select(
					`
          *,
          subject:subjects(id, name, code)
        `,
				)
				.gte("due_date", new Date().toISOString())
				.in("subject_id", subjectIds)
				.order("due_date", { ascending: true })
				.limit(limit);

			return { data, error };
		},

		getById: async (id) => {
			const { data, error } = await supabase
				.from("materials")
				.select(
					`
          *,
          subject:subjects(*)
        `,
				)
				.eq("id", id)
				.single();
			return { data, error };
		},

		// Get material with student's submission
		getByIdWithSubmission: async (materialId, studentId) => {
			const { data, error } = await supabase
				.from("materials")
				.select(
					`
          *,
          subject:subjects(*),
          submissions!left(*)
        `,
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
				.from("materials")
				.insert(assignment)
				.select()
				.single();
			return { data, error };
		},

		update: async (id, updates) => {
			const { data, error } = await supabase
				.from("materials")
				.update(updates)
				.eq("id", id)
				.select()
				.single();
			return { data, error };
		},

		delete: async (id) => {
			const { error } = await supabase.from("materials").delete().eq("id", id);
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
						s.status === "returned",
				).length,
				graded: submissions.filter(
					(s) => s.status === "graded" || s.status === "returned",
				).length,
			};

			return { data: stats, error: null };
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
        `,
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
        `,
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
			fileSize,
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
				.from("materials")
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

	// MATERIAL COMMENTS
	materialComments: {
		getByMaterial: async (materialId) => {
			const { data, error } = await supabase
				.from("material_comments")
				.select(
					`
          *,
          author:profiles!material_comments_author_id_fkey(id, full_name, email, role)
        `,
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
        `,
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
        `,
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
        `,
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
        `,
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
        `,
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

	// CONVERSATIONS & MESSAGES
	conversations: {
		getAll: async (userId) => {
			const { data, error } = await supabase
				.from("conversations")
				.select(
					`
					*,
					participant_one_profile:profiles!conversations_participant_one_fkey(id, full_name, email, role, avatar_url),
					participant_two_profile:profiles!conversations_participant_two_fkey(id, full_name, email, role, avatar_url),
					messages(content, created_at, sender_id)
				`,
				)
				.or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
				.order("last_message_at", { ascending: false });
			return { data, error };
		},

		getOrCreate: async (myId, otherId) => {
			// Always store with lower UUID first to respect UNIQUE constraint
			const [p1, p2] = [myId, otherId].sort();

			const { data: existing } = await supabase
				.from("conversations")
				.select("*")
				.eq("participant_one", p1)
				.eq("participant_two", p2)
				.maybeSingle();

			if (existing) return { data: existing, error: null };

			const { data, error } = await supabase
				.from("conversations")
				.insert({ participant_one: p1, participant_two: p2 })
				.select()
				.single();

			return { data, error };
		},
	},

	messages: {
		getByConversation: async (conversationId) => {
			const { data, error } = await supabase
				.from("messages")
				.select(
					`
					*,
					sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
				`,
				)
				.eq("conversation_id", conversationId)
				.order("created_at", { ascending: true });
			return { data, error };
		},

		send: async (conversationId, senderId, content) => {
			const { data, error } = await supabase
				.from("messages")
				.insert({
					conversation_id: conversationId,
					sender_id: senderId,
					content,
				})
				.select(
					`
					*,
					sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
				`,
				)
				.single();

			if (!error) {
				await supabase
					.from("conversations")
					.update({ last_message_at: new Date().toISOString() })
					.eq("id", conversationId);
			}

			return { data, error };
		},

		markRead: async (conversationId, userId) => {
			const { error } = await supabase
				.from("messages")
				.update({ read_at: new Date().toISOString() })
				.eq("conversation_id", conversationId)
				.neq("sender_id", userId)
				.is("read_at", null);
			return { error };
		},
	},

	// EVENTS
	events: {
		getAll: async () => {
			const { data, error } = await supabase
				.from("events")
				.select(
					`
					*,
					creator:profiles!events_created_by_fkey(id, full_name)
				`,
				)
				.order("event_date", { ascending: true });
			return { data, error };
		},

		create: async (event) => {
			const { data, error } = await supabase
				.from("events")
				.insert(event)
				.select()
				.single();
			return { data, error };
		},

		delete: async (id) => {
			const { error } = await supabase.from("events").delete().eq("id", id);
			return { error };
		},
	},

	// GROUP CONVERSATIONS
	groupConversations: {
		getForUser: async (userId, userRole) => {
			if (userRole === "admin") {
				const { data, error } = await supabase
					.from("group_conversations")
					.select(
						`
          *,
          subject:subjects!group_conversations_subject_id_fkey(id, name, code),
          group_members(user_id, is_admin),
          group_messages(content, created_at, sender_id)
        `,
					)
					.order("last_message_at", { ascending: false });
				return { data, error };
			}
			const { data, error } = await supabase
				.from("group_conversations")
				.select(
					`
        *,
        subject:subjects!group_conversations_subject_id_fkey(id, name, code),
        group_members(user_id, is_admin),
        group_messages(content, created_at, sender_id)
      `,
				)
				.order("last_message_at", { ascending: false });
			return { data, error };
		},

		createForSubject: async (subjectId, subjectName, instructorId) => {
			const { data: convo, error: convoError } = await supabase
				.from("group_conversations")
				.insert({ subject_id: subjectId, name: subjectName })
				.select()
				.single();
			if (convoError) return { data: null, error: convoError };

			// Add instructor as admin member
			const { error: memberError } = await supabase
				.from("group_members")
				.insert({
					conversation_id: convo.id,
					user_id: instructorId,
					is_admin: true,
				});

			if (memberError) return { data: null, error: memberError };
			return { data: convo, error: null };
		},

		addMember: async (subjectId, userId) => {
			const { data: convo } = await supabase
				.from("group_conversations")
				.select("id")
				.eq("subject_id", subjectId)
				.maybeSingle();
			if (!convo) return { error: null };

			const { error } = await supabase
				.from("group_members")
				.insert({ conversation_id: convo.id, user_id: userId, is_admin: false })
				.onConflict("conversation_id, user_id")
				.ignore();
			return { error };
		},

		removeMember: async (subjectId, userId) => {
			const { data: convo } = await supabase
				.from("group_conversations")
				.select("id")
				.eq("subject_id", subjectId)
				.maybeSingle();
			if (!convo) return { error: null };

			const { error } = await supabase
				.from("group_members")
				.delete()
				.eq("conversation_id", convo.id)
				.eq("user_id", userId);
			return { error };
		},

		getMembers: async (conversationId) => {
			const { data, error } = await supabase
				.from("group_members")
				.select(
					`
        *,
        profile:profiles!group_members_user_id_fkey(id, full_name, email, role)
      `,
				)
				.eq("conversation_id", conversationId);
			return { data, error };
		},
	},

	groupMessages: {
		getByConversation: async (conversationId) => {
			const { data, error } = await supabase
				.from("group_messages")
				.select(
					`
        *,
        sender:profiles!group_messages_sender_id_fkey(id, full_name, avatar_url)
      `,
				)
				.eq("conversation_id", conversationId)
				.order("created_at", { ascending: true });
			return { data, error };
		},

		send: async (conversationId, senderId, content) => {
			const { data, error } = await supabase
				.from("group_messages")
				.insert({
					conversation_id: conversationId,
					sender_id: senderId,
					content,
				})
				.select(
					`
        *,
        sender:profiles!group_messages_sender_id_fkey(id, full_name, avatar_url)
      `,
				)
				.single();

			if (!error) {
				await supabase
					.from("group_conversations")
					.update({ last_message_at: new Date().toISOString() })
					.eq("id", conversationId);
			}
			return { data, error };
		},
	},

	// QUIZ QUESTIONS
	quizQuestions: {
		getByMaterial: async (materialId) => {
			const { data, error } = await supabase
				.from("quiz_questions")
				.select("*")
				.eq("material_id", materialId)
				.order("order_index", { ascending: true });
			return { data, error };
		},

		getByMaterialAndStudent: async (materialId, studentId) => {
			const { data, error } = await supabase
				.from("submissions")
				.select("*")
				.eq("material_id", materialId)
				.eq("student_id", studentId)
				.maybeSingle();
			return { data, error };
		},

		saveAll: async (materialId, questions) => {
			// Delete existing questions first
			await supabase
				.from("quiz_questions")
				.delete()
				.eq("material_id", materialId);

			if (questions.length === 0) return { error: null };

			const { data, error } = await supabase
				.from("quiz_questions")
				.insert(
					questions.map((q, i) => ({
						material_id: materialId,
						question: q.question,
						options: q.options,
						correct_index: q.correctIndex,
						order_index: i,
					})),
				)
				.select();
			return { data, error };
		},

		delete: async (materialId) => {
			const { error } = await supabase
				.from("quiz_questions")
				.delete()
				.eq("material_id", materialId);
			return { error };
		},
	},

	// QUIZ ANSWERS
	quizAnswers: {
		getByMaterial: async (materialId, studentId) => {
			const { data, error } = await supabase
				.from("quiz_answers")
				.select("*")
				.eq("material_id", materialId)
				.eq("student_id", studentId)
				.maybeSingle();
			return { data, error };
		},

		getAllByMaterial: async (materialId) => {
			const { data, error } = await supabase
				.from("quiz_answers")
				.select(
					`
					*,
					student:profiles!quiz_answers_student_id_fkey(id, full_name, email)
				`,
				)
				.eq("material_id", materialId)
				.order("submitted_at", { ascending: false });
			return { data, error };
		},

		submit: async (materialId, studentId, answers, score, total) => {
			const { data, error } = await supabase
				.from("quiz_answers")
				.upsert(
					{
						material_id: materialId,
						student_id: studentId,
						answers,
						score,
						total,
						submitted_at: new Date().toISOString(),
					},
					{ onConflict: "material_id,student_id" },
				)
				.select()
				.single();
			return { data, error };
		},
	},
};