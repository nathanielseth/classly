import { supabase } from "./client";

export const adminDb = {
	// ============================================
	// USER MANAGEMENT
	// ============================================
	users: {
		/**
		 * Get all users with optional filtering and pagination
		 * @param {Object} options - Filter options
		 * @param {string} options.role - Filter by role ('student', 'instructor', 'admin')
		 * @param {string} options.searchQuery - Search by name or email
		 * @param {number} options.limit - Limit results (default: 50)
		 * @param {number} options.offset - Offset for pagination (default: 0)
		 * @returns {Promise<{data: Array, error: Error}>}
		 */
		getAll: async (options = {}) => {
			const {
				role = null,
				searchQuery = null,
				limit = 50,
				offset = 0,
				status = null,
			} = options;

			try {
				let query = supabase
					.from("profiles")
					.select("*", { count: "exact" })
					.order("created_at", { ascending: false })
					.range(offset, offset + limit - 1);

				if (role) query = query.eq("role", role);
				if (searchQuery?.trim()) {
					query = query.or(
						`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`,
					);
				}
				if (status) query = query.eq("status", status);

				const { data, error, count } = await query;
				return { data, error, count };
			} catch (err) {
				console.error("Admin getAll users error:", err);
				return { data: null, error: err, count: 0 };
			}
		},

		/**
		 * Get user by ID with additional stats
		 * @param {string} userId - User ID
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		getById: async (userId) => {
			try {
				const { data: user, error: userError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", userId)
					.single();

				if (userError) throw userError;

				// Get additional stats based on role
				let stats = {};

				if (user.role === "student") {
					// Get enrollment and submission stats
					const [enrollments, submissions] = await Promise.all([
						supabase
							.from("enrollments")
							.select("id", { count: "exact", head: true })
							.eq("student_id", userId),
						supabase
							.from("submissions")
							.select("status", { count: "exact" })
							.eq("student_id", userId),
					]);

					stats = {
						enrollmentCount: enrollments.count || 0,
						submissionStats: {
							total: submissions.data?.length || 0,
							graded:
								submissions.data?.filter(
									(s) => s.status === "graded" || s.status === "returned",
								).length || 0,
						},
					};
				} else if (user.role === "instructor") {
					// Get subject stats
					const [subjects, materials] = await Promise.all([
						supabase
							.from("subjects")
							.select("id", { count: "exact", head: true })
							.eq("instructor_id", userId),
						supabase
							.from("materials")
							.select("id", { count: "exact", head: true })
							.eq("subject_id", userId),
					]);

					stats = {
						subjectCount: subjects.count || 0,
						materialCount: materials.count || 0,
					};
				}

				return { data: { ...user, stats }, error: null };
			} catch (err) {
				console.error("Admin getById user error:", err);
				return { data: null, error: err };
			}
		},

		/**
		 * Update user profile (admin can update any user)
		 * @param {string} userId - User ID
		 * @param {Object} updates - Fields to update
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		update: async (userId, updates) => {
			try {
				const { id: _id, ...safeUpdates } = updates;

				const { data, error } = await supabase
					.from("profiles")
					.update({
						...safeUpdates,
						updated_at: new Date().toISOString(),
					})
					.eq("id", userId)
					.select()
					.single();

				if (error) throw error;

				return { data, error: null };
			} catch (err) {
				console.error("Admin update user error:", err);
				return { data: null, error: err };
			}
		},

		approve: async (userId) => {
			try {
				const { data, error } = await supabase
					.from("profiles")
					.update({ status: "approved", updated_at: new Date().toISOString() })
					.eq("id", userId)
					.select()
					.single();
				if (error) throw error;
				return { data, error: null };
			} catch (err) {
				console.error("Admin approve user error:", err);
				return { data: null, error: err };
			}
		},

		reject: async (userId) => {
			try {
				const { data, error } = await supabase
					.from("profiles")
					.update({ status: "rejected", updated_at: new Date().toISOString() })
					.eq("id", userId)
					.select()
					.single();
				if (error) throw error;
				return { data, error: null };
			} catch (err) {
				console.error("Admin reject user error:", err);
				return { data: null, error: err };
			}
		},

		/**
		 * Delete user and all associated data
		 * WARNING: This is destructive and cascades to related tables
		 * @param {string} userId - User ID
		 * @returns {Promise<{error: Error}>}
		 */
		delete: async (userId) => {
			try {
				const { error: profileError } = await supabase
					.from("profiles")
					.delete()
					.eq("id", userId);

				if (profileError) throw profileError;

				return { error: null };
			} catch (err) {
				console.error("Admin delete user error:", err);
				return { error: err };
			}
		},

		/**
		 * Get user statistics by role
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		getStats: async () => {
			try {
				const { data, error } = await supabase.rpc("get_user_stats");

				if (error) {
					// Fallback to manual counting if RPC doesn't exist
					const { data: profiles, error: profileError } = await supabase
						.from("profiles")
						.select("role");

					if (profileError) throw profileError;

					const stats = profiles.reduce(
						(acc, profile) => {
							acc[profile.role] = (acc[profile.role] || 0) + 1;
							acc.total += 1;
							return acc;
						},
						{ total: 0, student: 0, instructor: 0, admin: 0 },
					);

					return { data: stats, error: null };
				}

				return { data, error: null };
			} catch (err) {
				console.error("Admin getStats error:", err);
				return { data: null, error: err };
			}
		},

		/**
		 * Search users by email or name
		 * @param {string} query - Search query
		 * @param {number} limit - Max results (default: 20)
		 * @returns {Promise<{data: Array, error: Error}>}
		 */
		search: async (query, limit = 20) => {
			try {
				if (!query || !query.trim()) {
					return { data: [], error: null };
				}

				const { data, error } = await supabase
					.from("profiles")
					.select("id, email, full_name, role, avatar_url")
					.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
					.limit(limit);

				if (error) throw error;

				return { data: data || [], error: null };
			} catch (err) {
				console.error("Admin search users error:", err);
				return { data: [], error: err };
			}
		},

		/**
		 * Create a new user (requires admin privileges)
		 * @param {Object} userData - User data
		 * @param {string} userData.email - Email
		 * @param {string} userData.password - Password
		 * @param {string} userData.fullName - Full name
		 * @param {string} userData.role - Role (student/instructor/admin)
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		create: async (userData) => {
			try {
				const { email, password, fullName, role } = userData;

				// Create auth user
				const { data: authData, error: authError } =
					await supabase.auth.admin.createUser({
						email,
						password,
						email_confirm: true, // Auto-confirm email
						user_metadata: {
							full_name: fullName,
							role: role,
						},
					});

				if (authError) throw authError;

				// Profile should be created automatically via trigger
				// But let's verify and fetch it
				const { data: profile, error: profileError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", authData.user.id)
					.single();

				if (profileError) {
					// If profile doesn't exist, create it manually
					const { data: newProfile, error: createProfileError } = await supabase
						.from("profiles")
						.insert({
							id: authData.user.id,
							email,
							full_name: fullName,
							role,
						})
						.select()
						.single();

					if (createProfileError) throw createProfileError;
					return { data: newProfile, error: null };
				}

				return { data: profile, error: null };
			} catch (err) {
				console.error("Admin create user error:", err);
				return { data: null, error: err };
			}
		},
	},

	// ============================================
	// SUBJECT MANAGEMENT
	// ============================================
	subjects: {
		/**
		 * Get all subjects across the system
		 * @param {Object} options - Filter options
		 * @param {number} options.limit - Limit results
		 * @param {number} options.offset - Offset for pagination
		 * @returns {Promise<{data: Array, error: Error, count: number}>}
		 */
		getAll: async (options = {}) => {
			const { limit = 50, offset = 0 } = options;

			try {
				const { data, error, count } = await supabase
					.from("subjects")
					.select(
						`
            *,
            instructor:profiles!subjects_instructor_id_fkey(id, full_name, email),
            enrollments(count),
            materials(count)
          `,
						{ count: "exact" },
					)
					.order("created_at", { ascending: false })
					.range(offset, offset + limit - 1);

				if (error) throw error;

				// Process data to flatten counts
				const processedData = (data || []).map((subject) => ({
					...subject,
					enrollmentCount: subject.enrollments?.[0]?.count || 0,
					materialCount: subject.materials?.[0]?.count || 0,
				}));

				return { data: processedData, error: null, count };
			} catch (err) {
				console.error("Admin getAll subjects error:", err);
				return { data: null, error: err, count: 0 };
			}
		},

		/**
		 * Get subject statistics
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		getStats: async () => {
			try {
				const [subjects, enrollments, materials] = await Promise.all([
					supabase
						.from("subjects")
						.select("id", { count: "exact", head: true }),
					supabase
						.from("enrollments")
						.select("id", { count: "exact", head: true }),
					supabase
						.from("materials")
						.select("id", { count: "exact", head: true }),
				]);

				return {
					data: {
						totalSubjects: subjects.count || 0,
						totalEnrollments: enrollments.count || 0,
						totalMaterials: materials.count || 0,
						averageEnrollmentsPerSubject:
							subjects.count > 0
								? Math.round((enrollments.count || 0) / subjects.count)
								: 0,
					},
					error: null,
				};
			} catch (err) {
				console.error("Admin subject stats error:", err);
				return { data: null, error: err };
			}
		},

		/**
		 * Delete subject (admin override - bypasses instructor ownership)
		 * @param {string} subjectId - Subject ID
		 * @returns {Promise<{error: Error}>}
		 */
		delete: async (subjectId) => {
			try {
				const { error } = await supabase
					.from("subjects")
					.delete()
					.eq("id", subjectId);

				if (error) throw error;

				return { error: null };
			} catch (err) {
				console.error("Admin delete subject error:", err);
				return { error: err };
			}
		},

		/**
		 * Reassign subject to different instructor
		 * @param {string} subjectId - Subject ID
		 * @param {string} newInstructorId - New instructor user ID
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		reassignInstructor: async (subjectId, newInstructorId) => {
			try {
				// Verify new instructor exists and has instructor role
				const { data: instructor, error: instructorError } = await supabase
					.from("profiles")
					.select("id, role")
					.eq("id", newInstructorId)
					.single();

				if (instructorError) throw instructorError;

				if (instructor.role !== "instructor") {
					throw new Error("Target user must have instructor role");
				}

				// Update subject
				const { data, error } = await supabase
					.from("subjects")
					.update({
						instructor_id: newInstructorId,
						updated_at: new Date().toISOString(),
					})
					.eq("id", subjectId)
					.select()
					.single();

				if (error) throw error;

				return { data, error: null };
			} catch (err) {
				console.error("Admin reassign instructor error:", err);
				return { data: null, error: err };
			}
		},

		/**
		 * Get subjects with detailed analytics
		 * @param {string} subjectId - Subject ID
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		getDetailedAnalytics: async (subjectId) => {
			try {
				const [subject, enrollments, materials, submissions, announcements] =
					await Promise.all([
						supabase
							.from("subjects")
							.select(
								`
                *,
                instructor:profiles!subjects_instructor_id_fkey(id, full_name, email)
              `,
							)
							.eq("id", subjectId)
							.single(),
						supabase
							.from("enrollments")
							.select("*")
							.eq("subject_id", subjectId),
						supabase.from("materials").select("*").eq("subject_id", subjectId),
						supabase
							.from("submissions")
							.select("status, grade, is_late")
							.in("material_id", materials.data?.map((m) => m.id) || []),
						supabase
							.from("announcements")
							.select("id", { count: "exact", head: true })
							.eq("subject_id", subjectId),
					]);

				if (subject.error) throw subject.error;

				// Calculate submission stats
				const submissionStats = {
					total: submissions.data?.length || 0,
					graded:
						submissions.data?.filter(
							(s) => s.status === "graded" || s.status === "returned",
						).length || 0,
					late: submissions.data?.filter((s) => s.is_late).length || 0,
					averageGrade:
						submissions.data?.reduce((sum, s) => sum + (s.grade || 0), 0) /
							(submissions.data?.length || 1) || 0,
				};

				return {
					data: {
						...subject.data,
						enrollmentCount: enrollments.data?.length || 0,
						materialCount: materials.data?.length || 0,
						announcementCount: announcements.count || 0,
						submissionStats,
					},
					error: null,
				};
			} catch (err) {
				console.error("Admin subject analytics error:", err);
				return { data: null, error: err };
			}
		},
	},

	// ============================================
	// ENROLLMENT MANAGEMENT
	// ============================================
	enrollments: {
		/**
		 * Get all enrollments across the system
		 * @param {Object} options - Filter options
		 * @returns {Promise<{data: Array, error: Error, count: number}>}
		 */
		getAll: async (options = {}) => {
			const {
				limit = 50,
				offset = 0,
				subjectId = null,
				studentId = null,
			} = options;

			try {
				let query = supabase
					.from("enrollments")
					.select(
						`
            *,
            student:profiles!enrollments_student_id_fkey(id, full_name, email),
            subject:subjects!enrollments_subject_id_fkey(id, code, name, instructor:profiles!subjects_instructor_id_fkey(full_name))
          `,
						{ count: "exact" },
					)
					.order("enrolled_at", { ascending: false })
					.range(offset, offset + limit - 1);

				if (subjectId) {
					query = query.eq("subject_id", subjectId);
				}

				if (studentId) {
					query = query.eq("student_id", studentId);
				}

				const { data, error, count } = await query;

				if (error) throw error;

				return { data: data || [], error: null, count };
			} catch (err) {
				console.error("Admin getAll enrollments error:", err);
				return { data: [], error: err, count: 0 };
			}
		},

		/**
		 * Bulk unenroll students from a subject
		 * @param {string} subjectId - Subject ID
		 * @param {Array<string>} studentIds - Array of student IDs
		 * @returns {Promise<{error: Error}>}
		 */
		bulkUnenroll: async (subjectId, studentIds) => {
			try {
				const { error } = await supabase
					.from("enrollments")
					.delete()
					.eq("subject_id", subjectId)
					.in("student_id", studentIds);

				if (error) throw error;

				return { error: null };
			} catch (err) {
				console.error("Admin bulk unenroll error:", err);
				return { error: err };
			}
		},

		/**
		 * Manually enroll student in subject (admin override)
		 * @param {string} studentId - Student user ID
		 * @param {string} subjectId - Subject ID
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		enroll: async (studentId, subjectId) => {
			try {
				// Verify student exists and has student role
				const { data: student, error: studentError } = await supabase
					.from("profiles")
					.select("id, role")
					.eq("id", studentId)
					.single();

				if (studentError) throw studentError;

				if (student.role !== "student") {
					throw new Error("User must have student role to enroll");
				}

				// Check if already enrolled
				const { data: existing } = await supabase
					.from("enrollments")
					.select("id")
					.eq("student_id", studentId)
					.eq("subject_id", subjectId)
					.maybeSingle();

				if (existing) {
					throw new Error("Student is already enrolled in this subject");
				}

				// Create enrollment
				const { data, error } = await supabase
					.from("enrollments")
					.insert({
						student_id: studentId,
						subject_id: subjectId,
					})
					.select()
					.single();

				if (error) throw error;

				return { data, error: null };
			} catch (err) {
				console.error("Admin enroll error:", err);
				return { data: null, error: err };
			}
		},

		/**
		 * Get enrollment statistics
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		getStats: async () => {
			try {
				const { data: enrollments, error } = await supabase
					.from("enrollments")
					.select("subject_id");

				if (error) throw error;

				// Count enrollments per subject
				const enrollmentsBySubject = enrollments.reduce((acc, enrollment) => {
					acc[enrollment.subject_id] = (acc[enrollment.subject_id] || 0) + 1;
					return acc;
				}, {});

				const enrollmentCounts = Object.values(enrollmentsBySubject);

				return {
					data: {
						totalEnrollments: enrollments.length,
						averageEnrollmentsPerSubject:
							enrollmentCounts.length > 0
								? Math.round(
										enrollmentCounts.reduce((a, b) => a + b, 0) /
											enrollmentCounts.length,
									)
								: 0,
						maxEnrollmentsInSubject: Math.max(...enrollmentCounts, 0),
						minEnrollmentsInSubject: Math.min(...enrollmentCounts, 0),
					},
					error: null,
				};
			} catch (err) {
				console.error("Admin enrollment stats error:", err);
				return { data: null, error: err };
			}
		},
	},

	// ============================================
	// SYSTEM ANALYTICS & MONITORING
	// ============================================
	system: {
		/**
		 * Get comprehensive system statistics
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		getStats: async () => {
			try {
				// Use the view if available, otherwise calculate manually
				const { data: viewData, error: viewError } = await supabase
					.from("admin_system_stats")
					.select("*")
					.single();

				if (!viewError && viewData) {
					return { data: viewData, error: null };
				}

				// Fallback: Manual calculation
				const [users, subjects, enrollments, materials, submissions] =
					await Promise.all([
						supabase.from("profiles").select("role"),
						supabase
							.from("subjects")
							.select("id", { count: "exact", head: true }),
						supabase
							.from("enrollments")
							.select("id", { count: "exact", head: true }),
						supabase
							.from("materials")
							.select("id", { count: "exact", head: true }),
						supabase.from("submissions").select("status"),
					]);

				const usersByRole = users.data?.reduce(
					(acc, user) => {
						acc[user.role] = (acc[user.role] || 0) + 1;
						return acc;
					},
					{ student: 0, instructor: 0, admin: 0 },
				) || { student: 0, instructor: 0, admin: 0 };

				const submissionStats = submissions.data?.reduce(
					(acc, sub) => {
						if (sub.status === "graded" || sub.status === "returned") {
							acc.graded++;
						}
						return acc;
					},
					{ graded: 0 },
				) || { graded: 0 };

				return {
					data: {
						total_users: users.data?.length || 0,
						total_students: usersByRole.student,
						total_instructors: usersByRole.instructor,
						total_admins: usersByRole.admin,
						total_subjects: subjects.count || 0,
						total_enrollments: enrollments.count || 0,
						total_materials: materials.count || 0,
						total_graded_submissions: submissionStats.graded,
						total_announcements: 0, // Would need separate query
					},
					error: null,
				};
			} catch (err) {
				console.error("Admin system stats error:", err);
				return { data: null, error: err };
			}
		},

		/**
		 * Get recent activity logs (if audit_logs table exists)
		 * @param {number} limit - Max records to return
		 * @returns {Promise<{data: Array, error: Error}>}
		 */
		getActivityLogs: async (limit = 50) => {
			try {
				const { data, error } = await supabase
					.from("audit_logs")
					.select(
						`
            *,
            user:profiles!audit_logs_user_id_fkey(full_name, email)
          `,
					)
					.order("created_at", { ascending: false })
					.limit(limit);

				if (error) {
					// Table might not exist
					return { data: [], error: null };
				}

				return { data: data || [], error: null };
			} catch (err) {
				console.error("Admin activity logs error:", err);
				return { data: [], error: err };
			}
		},

		/**
		 * Get analytics data for charts/graphs
		 * @param {number} days - Number of days to look back (default: 30)
		 * @returns {Promise<{data: Object, error: Error}>}
		 */
		getAnalytics: async (days = 30) => {
			try {
				const startDate = new Date();
				startDate.setDate(startDate.getDate() - days);

				const [newUsers, newSubjects, newEnrollments, submissions] =
					await Promise.all([
						supabase
							.from("profiles")
							.select("created_at, role")
							.gte("created_at", startDate.toISOString()),
						supabase
							.from("subjects")
							.select("created_at")
							.gte("created_at", startDate.toISOString()),
						supabase
							.from("enrollments")
							.select("enrolled_at")
							.gte("enrolled_at", startDate.toISOString()),
						supabase
							.from("submissions")
							.select("submitted_at, status")
							.gte("submitted_at", startDate.toISOString()),
					]);

				return {
					data: {
						newUsers: newUsers.data?.length || 0,
						newSubjects: newSubjects.data?.length || 0,
						newEnrollments: newEnrollments.data?.length || 0,
						newSubmissions: submissions.data?.length || 0,
						usersByRole: newUsers.data?.reduce(
							(acc, user) => {
								acc[user.role] = (acc[user.role] || 0) + 1;
								return acc;
							},
							{ student: 0, instructor: 0, admin: 0 },
						),
						period: `Last ${days} days`,
					},
					error: null,
				};
			} catch (err) {
				console.error("Admin analytics error:", err);
				return { data: null, error: err };
			}
		},
	},

	// ============================================
	// MATERIALS & SUBMISSIONS (ADMIN OVERSIGHT)
	// ============================================
	materials: {
		/**
		 * Get all materials across system
		 * @param {Object} options - Filter options
		 * @returns {Promise<{data: Array, error: Error, count: number}>}
		 */
		getAll: async (options = {}) => {
			const { limit = 50, offset = 0 } = options;

			try {
				const { data, error, count } = await supabase
					.from("materials")
					.select(
						`
            *,
            subject:subjects(id, code, name, instructor:profiles(full_name))
          `,
						{ count: "exact" },
					)
					.order("created_at", { ascending: false })
					.range(offset, offset + limit - 1);

				if (error) throw error;

				return { data: data || [], error: null, count };
			} catch (err) {
				console.error("Admin getAll materials error:", err);
				return { data: [], error: err, count: 0 };
			}
		},

		/**
		 * Delete material (admin override)
		 * @param {string} materialId - Material ID
		 * @returns {Promise<{error: Error}>}
		 */
		delete: async (materialId) => {
			try {
				const { error } = await supabase
					.from("materials")
					.delete()
					.eq("id", materialId);

				if (error) throw error;

				return { error: null };
			} catch (err) {
				console.error("Admin delete material error:", err);
				return { error: err };
			}
		},
	},

	submissions: {
		/**
		 * Get all submissions with filters
		 * @param {Object} options - Filter options
		 * @returns {Promise<{data: Array, error: Error, count: number}>}
		 */
		getAll: async (options = {}) => {
			const { limit = 50, offset = 0, status = null } = options;

			try {
				let query = supabase
					.from("submissions")
					.select(
						`
            *,
            student:profiles!submissions_student_id_fkey(full_name, email),
            material:materials(title, subject:subjects(name))
          `,
						{ count: "exact" },
					)
					.order("submitted_at", { ascending: false })
					.range(offset, offset + limit - 1);

				if (status) {
					query = query.eq("status", status);
				}

				const { data, error, count } = await query;

				if (error) throw error;

				return { data: data || [], error: null, count };
			} catch (err) {
				console.error("Admin getAll submissions error:", err);
				return { data: [], error: err, count: 0 };
			}
		},
	},
};
