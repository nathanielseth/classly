import React, { useState, useEffect, useCallback } from "react";
import {
	Search,
	Plus,
	Edit2,
	Trash2,
	X,
	Loader2,
	AlertCircle,
	Check,
	UserPlus,
	Filter,
	Eye,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { adminDb } from "../../lib/supabase";

const AdminUserManagement = ({ onBack }) => {
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const ITEMS_PER_PAGE = 20;

	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);

	// ============================================
	// LOAD USERS
	// ============================================
	const loadUsers = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const {
				data,
				error: fetchError,
				count,
			} = await adminDb.users.getAll({
				role: roleFilter === "all" ? null : roleFilter,
				searchQuery: searchQuery.trim() || null,
				limit: ITEMS_PER_PAGE,
				offset: (currentPage - 1) * ITEMS_PER_PAGE,
				status: statusFilter === "all" ? null : statusFilter,
			});

			if (fetchError) throw fetchError;

			setFilteredUsers(data || []);
			setTotalCount(count || 0);
		} catch (err) {
			console.error("Load users error:", err);
			setError(err.message || "Failed to load users");
		} finally {
			setLoading(false);
		}
	}, [roleFilter, searchQuery, currentPage, statusFilter]);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [roleFilter, searchQuery, statusFilter]);

	// ============================================
	// HANDLERS
	// ============================================
	const handleDeleteUser = async (user) => {
		const confirmMessage = `Are you sure you want to delete "${
			user.full_name
		}"?\n\nThis will permanently delete:\n- User account\n- All enrollments${
			user.role === "instructor" ? "\n- All their subjects" : ""
		}\n- All related data\n\nThis action CANNOT be undone.`;

		if (!window.confirm(confirmMessage)) return;

		try {
			const { error: deleteError } = await adminDb.users.delete(user.id);
			if (deleteError) throw deleteError;

			alert("User deleted successfully");
			loadUsers();
		} catch (err) {
			console.error("Delete user error:", err);
			alert(`Failed to delete user: ${err.message}`);
		}
	};

	const handleApprove = async (user) => {
		try {
			const { error } = await adminDb.users.approve(user.id);
			if (error) throw error;
			loadUsers();
		} catch (err) {
			alert(`Failed to approve: ${err.message}`);
		}
	};

	const handleReject = async (user) => {
		if (
			!window.confirm(
				`Reject "${user.full_name}"? They won't be able to log in.`,
			)
		)
			return;
		try {
			const { error } = await adminDb.users.reject(user.id);
			if (error) throw error;
			loadUsers();
		} catch (err) {
			alert(`Failed to reject: ${err.message}`);
		}
	};

	const handleViewUser = async (user) => {
		try {
			const { data, error } = await adminDb.users.getById(user.id);
			if (error) throw error;

			setSelectedUser(data);
			setViewModalOpen(true);
		} catch (err) {
			console.error("View user error:", err);
			alert(`Failed to load user details: ${err.message}`);
		}
	};

	const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

	// ============================================
	// RENDER
	// ============================================
	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-3">
						<button
							onClick={onBack}
							className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<ChevronLeft size={20} />
						</button>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								User Management
							</h1>
							<p className="text-sm text-gray-500 mt-0.5">
								{totalCount} total users
							</p>
						</div>
					</div>
				</div>
				<button
					onClick={() => setCreateModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-all shadow-sm hover:shadow-md"
				>
					<Plus size={18} strokeWidth={2.5} />
					Create User
				</button>
			</div>

			{/* Filters & Search */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<div className="flex flex-col md:flex-row gap-3">
					<div className="flex-1 relative">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search by name or email..."
							className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Filter size={20} className="text-gray-400" />
						<select
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value)}
							className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all bg-white"
						>
							<option value="all">All Roles</option>
							<option value="student">Students</option>
							<option value="instructor">Instructors</option>
							<option value="admin">Admins</option>
						</select>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all bg-white"
						>
							<option value="all">All Status</option>
							<option value="pending">Pending</option>
							<option value="approved">Approved</option>
							<option value="rejected">Rejected</option>
						</select>
					</div>
				</div>
			</div>

			{/* Error State */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
					<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
					<div className="flex-1">
						<h3 className="font-semibold text-red-900 mb-1">Error</h3>
						<p className="text-sm text-red-700">{error}</p>
					</div>
					<button
						onClick={loadUsers}
						className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
					>
						Retry
					</button>
				</div>
			)}

			{/* Loading State */}
			{loading ? (
				<LoadingSkeleton />
			) : (
				<>
					{/* Users List */}
					{filteredUsers.length === 0 ? (
						<div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
							<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Search size={28} className="text-gray-400" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								No users found
							</h3>
							<p className="text-sm text-gray-500">
								Try adjusting your search or filters
							</p>
						</div>
					) : (
						<div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
							{filteredUsers.map((user) => (
								<UserCard
									key={user.id}
									user={user}
									onView={handleViewUser}
									onEdit={(user) => {
										setSelectedUser(user);
										setEditModalOpen(true);
									}}
									onDelete={handleDeleteUser}
									onApprove={handleApprove}
									onReject={handleReject}
								/>
							))}
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
							<p className="text-sm text-gray-600">
								Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
								{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of{" "}
								{totalCount} users
							</p>
							<div className="flex gap-2">
								<button
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className="p-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									<ChevronLeft size={18} />
								</button>
								<div className="px-4 py-2 text-sm text-gray-700">
									Page {currentPage} of {totalPages}
								</div>
								<button
									onClick={() =>
										setCurrentPage((p) => Math.min(totalPages, p + 1))
									}
									disabled={currentPage === totalPages}
									className="p-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									<ChevronRight size={18} />
								</button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Modals */}
			{createModalOpen && (
				<CreateUserModal
					onClose={() => setCreateModalOpen(false)}
					onSuccess={() => {
						setCreateModalOpen(false);
						loadUsers();
					}}
				/>
			)}

			{editModalOpen && selectedUser && (
				<EditUserModal
					user={selectedUser}
					onClose={() => {
						setEditModalOpen(false);
						setSelectedUser(null);
					}}
					onSuccess={() => {
						setEditModalOpen(false);
						setSelectedUser(null);
						loadUsers();
					}}
				/>
			)}

			{viewModalOpen && selectedUser && (
				<ViewUserModal
					user={selectedUser}
					onClose={() => {
						setViewModalOpen(false);
						setSelectedUser(null);
					}}
				/>
			)}
		</div>
	);
};

// ============================================
// USER CARD COMPONENT
// ============================================
const UserCard = ({ user, onView, onEdit, onDelete, onApprove, onReject }) => {
	const [menuOpen, setMenuOpen] = useState(false);

	const roleColors = {
		student: "bg-blue-50 text-blue-700 border-blue-200",
		instructor: "bg-purple-50 text-purple-700 border-purple-200",
		admin: "bg-red-50 text-red-700 border-red-200",
	};

	const statusColors =
		user.status === "approved"
			? "bg-green-50 text-green-700 border-green-200"
			: user.status === "rejected"
				? "bg-red-50 text-red-700 border-red-200"
				: "bg-amber-50 text-amber-700 border-amber-200";

	return (
		<div className="p-4 hover:bg-gray-50 transition-colors">
			<div className="flex items-center justify-between gap-4">
				{/* User Info */}
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<div className="w-12 h-12 bg-linear-to-br from-classly-green to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0">
						{user.full_name?.charAt(0).toUpperCase()}
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-medium text-gray-900 truncate">
							{user.full_name}
						</p>
						<p className="text-sm text-gray-500 truncate">{user.email}</p>
					</div>
				</div>

				{/* Role Badge */}
				<span
					className={`px-3 py-1 rounded-full text-xs font-medium border shrink-0 ${
						roleColors[user.role]
					}`}
				>
					{user.role.charAt(0).toUpperCase() + user.role.slice(1)}
				</span>

				{/* Status Badge */}
				<span
					className={`px-3 py-1 rounded-full text-xs font-medium border shrink-0 capitalize ${statusColors}`}
				>
					{user.status ?? "pending"}
				</span>

				{/* Created Date */}
				<div className="hidden md:block text-sm text-gray-500 shrink-0 w-32">
					{new Date(user.created_at).toLocaleDateString()}
				</div>

				{/* Actions Dropdown */}
				<div className="relative shrink-0">
					<button
						onClick={() => setMenuOpen(!menuOpen)}
						className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="currentColor"
							className="shrink-0"
						>
							<circle cx="8" cy="3" r="1.5" />
							<circle cx="8" cy="8" r="1.5" />
							<circle cx="8" cy="13" r="1.5" />
						</svg>
					</button>

					{menuOpen && (
						<>
							{/* Backdrop */}
							<div
								className="fixed inset-0 z-40"
								onClick={() => setMenuOpen(false)}
							/>
							{/* Menu */}
							<div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50">
								<button
									onClick={() => {
										setMenuOpen(false);
										onView(user);
									}}
									className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
								>
									<Eye size={14} />
									View Details
								</button>
								<button
									onClick={() => {
										setMenuOpen(false);
										onEdit(user);
									}}
									className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
								>
									<Edit2 size={14} />
									Edit
								</button>
								{(user.status === "pending" || user.status === "rejected") && (
									<button
										onClick={() => {
											setMenuOpen(false);
											onApprove(user);
										}}
										className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2"
									>
										<Check size={14} />
										Approve
									</button>
								)}
								{user.status === "approved" && (
									<button
										onClick={() => {
											setMenuOpen(false);
											onReject(user);
										}}
										className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
									>
										<X size={14} />
										Reject
									</button>
								)}
								<button
									onClick={() => {
										setMenuOpen(false);
										onDelete(user);
									}}
									className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
								>
									<Trash2 size={14} />
									Delete
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

// ============================================
// CREATE USER MODAL
// ============================================
const CreateUserModal = ({ onClose, onSuccess }) => {
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		fullName: "",
		role: "student",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!formData.email || !formData.password || !formData.fullName) {
			setError("All fields are required");
			return;
		}

		if (formData.password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}

		try {
			setLoading(true);

			const { error: createError } = await adminDb.users.create(formData);

			if (createError) throw createError;

			alert("User created successfully!");
			onSuccess();
		} catch (err) {
			console.error("Create user error:", err);
			setError(err.message || "Failed to create user");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
				<div className="p-6 border-b border-gray-100">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-bold text-gray-900">Create User</h2>
							<p className="text-sm text-gray-500 mt-1">
								Add a new user to the system
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Full Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
							placeholder="John Doe"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Email <span className="text-red-500">*</span>
						</label>
						<input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
							placeholder="user@example.com"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Password <span className="text-red-500">*</span>
						</label>
						<input
							type="password"
							value={formData.password}
							onChange={(e) =>
								setFormData({ ...formData, password: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
							placeholder="••••••••"
							minLength={6}
						/>
						<p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Role <span className="text-red-500">*</span>
						</label>
						<select
							value={formData.role}
							onChange={(e) =>
								setFormData({ ...formData, role: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all bg-white"
						>
							<option value="student">Student</option>
							<option value="instructor">Instructor</option>
							<option value="admin">Admin</option>
						</select>
					</div>

					{error && (
						<div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
							<AlertCircle size={16} className="shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<Loader2 size={16} className="animate-spin" />
									Creating...
								</>
							) : (
								<>
									<UserPlus size={16} />
									Create User
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ============================================
// EDIT USER MODAL
// ============================================
const EditUserModal = ({ user, onClose, onSuccess }) => {
	const [formData, setFormData] = useState({
		fullName: user.full_name,
		email: user.email,
		role: user.role,
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		try {
			setLoading(true);

			const { error: updateError } = await adminDb.users.update(user.id, {
				full_name: formData.fullName,
				email: formData.email,
				role: formData.role,
			});

			if (updateError) throw updateError;

			alert("User updated successfully!");
			onSuccess();
		} catch (err) {
			console.error("Update user error:", err);
			setError(err.message || "Failed to update user");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
				<div className="p-6 border-b border-gray-100">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-bold text-gray-900">Edit User</h2>
							<p className="text-sm text-gray-500 mt-1">
								Update user information
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Full Name
						</label>
						<input
							type="text"
							value={formData.fullName}
							onChange={(e) =>
								setFormData({ ...formData, fullName: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Email
						</label>
						<input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Role
						</label>
						<select
							value={formData.role}
							onChange={(e) =>
								setFormData({ ...formData, role: e.target.value })
							}
							className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all bg-white"
						>
							<option value="student">Student</option>
							<option value="instructor">Instructor</option>
							<option value="admin">Admin</option>
						</select>
					</div>

					{error && (
						<div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
							<AlertCircle size={16} className="shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<Loader2 size={16} className="animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Check size={16} />
									Save Changes
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ============================================
// VIEW USER MODAL
// ============================================
const ViewUserModal = ({ user, onClose }) => {
	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
				<div className="p-6 border-b border-gray-100">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold text-gray-900">User Details</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<div className="p-6 space-y-4">
					<div className="flex items-center gap-4 pb-4 border-b border-gray-100">
						<div className="w-16 h-16 bg-linear-to-br from-classly-green to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
							{user.full_name?.charAt(0).toUpperCase()}
						</div>
						<div>
							<h3 className="text-lg font-bold text-gray-900">
								{user.full_name}
							</h3>
							<p className="text-sm text-gray-500">{user.email}</p>
						</div>
					</div>

					<div className="space-y-3">
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase">
								Role
							</label>
							<p className="text-sm text-gray-900 mt-1">
								{user.role.charAt(0).toUpperCase() + user.role.slice(1)}
							</p>
						</div>

						<div>
							<label className="text-xs font-medium text-gray-500 uppercase">
								Status
							</label>
							<p className="text-sm text-gray-900 mt-1 capitalize">
								{user.status ?? "pending"}
							</p>
						</div>

						<div>
							<label className="text-xs font-medium text-gray-500 uppercase">
								Created
							</label>
							<p className="text-sm text-gray-900 mt-1">
								{new Date(user.created_at).toLocaleString()}
							</p>
						</div>

						{user.stats && (
							<div>
								<label className="text-xs font-medium text-gray-500 uppercase">
									Statistics
								</label>
								<div className="mt-2 space-y-2">
									{user.role === "student" && (
										<>
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Enrollments:</span>
												<span className="font-medium text-gray-900">
													{user.stats.enrollmentCount}
												</span>
											</div>
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Submissions:</span>
												<span className="font-medium text-gray-900">
													{user.stats.submissionStats?.total || 0}
												</span>
											</div>
										</>
									)}
									{user.role === "instructor" && (
										<>
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Subjects:</span>
												<span className="font-medium text-gray-900">
													{user.stats.subjectCount}
												</span>
											</div>
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Materials:</span>
												<span className="font-medium text-gray-900">
													{user.stats.materialCount}
												</span>
											</div>
										</>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="p-6 pt-0">
					<button
						onClick={onClose}
						className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

// ============================================
// LOADING SKELETON
// ============================================
const LoadingSkeleton = () => {
	return (
		<div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="p-4 animate-pulse">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-32 bg-gray-200 rounded" />
							<div className="h-3 w-48 bg-gray-200 rounded" />
						</div>
						<div className="h-6 w-16 bg-gray-200 rounded-full shrink-0" />
						<div className="h-6 w-16 bg-gray-200 rounded-full shrink-0" />
						<div className="h-4 w-20 bg-gray-200 rounded shrink-0" />
						<div className="h-8 w-8 bg-gray-200 rounded shrink-0" />
					</div>
				</div>
			))}
		</div>
	);
};

export default AdminUserManagement;