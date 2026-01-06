import React, { useState, useEffect, useCallback } from "react";
import {
	Users,
	BookOpen,
	GraduationCap,
	UserCheck,
	TrendingUp,
	AlertCircle,
	Loader2,
	ArrowRight,
	Clock,
	UserPlus,
} from "lucide-react";
import { adminDb } from "../../lib/supabase";

const AdminDashboard = ({ onNavigate }) => {
	const [stats, setStats] = useState(null);
	const [analytics, setAnalytics] = useState(null);
	const [recentUsers, setRecentUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshing, setRefreshing] = useState(false);

	// ============================================
	// LOAD DASHBOARD DATA
	// ============================================
	const loadDashboardData = useCallback(async (isBackgroundRefresh = false) => {
		try {
			if (!isBackgroundRefresh) {
				setLoading(true);
			} else {
				setRefreshing(true);
			}
			setError(null);

			// Load all data in parallel
			const [systemStats, analyticsData, users] = await Promise.all([
				adminDb.system.getStats(),
				adminDb.system.getAnalytics(7), // Last 7 days
				adminDb.users.getAll({ limit: 5, offset: 0 }), // Recent 5 users
			]);

			if (systemStats.error) throw systemStats.error;
			if (analyticsData.error) throw analyticsData.error;

			setStats(systemStats.data);
			setAnalytics(analyticsData.data);
			setRecentUsers(users.data || []);
		} catch (err) {
			console.error("Load dashboard error:", err);
			if (!isBackgroundRefresh) {
				setError(err.message || "Failed to load dashboard data");
			}
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		loadDashboardData(false);
	}, [loadDashboardData]);

	// Auto-refresh every 60 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			loadDashboardData(true);
		}, 60000);

		return () => clearInterval(interval);
	}, [loadDashboardData]);

	// ============================================
	// LOADING STATE
	// ============================================
	if (loading && !stats) {
		return (
			<div className="max-w-7xl mx-auto">
				<LoadingSkeleton />
			</div>
		);
	}

	// ============================================
	// ERROR STATE
	// ============================================
	if (error && !stats) {
		return (
			<div className="max-w-7xl mx-auto">
				<div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
					<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
					<div>
						<h3 className="font-semibold text-red-900 mb-1">
							Failed to load dashboard
						</h3>
						<p className="text-sm text-red-700">{error}</p>
						<button
							onClick={() => loadDashboardData(false)}
							className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
						>
							Try Again
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Background Refresh Indicator */}
			{refreshing && (
				<div className="fixed top-20 right-6 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 z-50 animate-in slide-in-from-right duration-200">
					<Loader2 size={16} className="animate-spin text-classly-green" />
					<span className="text-sm text-gray-600">Updating...</span>
				</div>
			)}

			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
				<p className="text-sm text-gray-500 mt-1">
					Manage users and monitor platform activity
				</p>
			</div>

			{/* Main Stats Grid - Clickable */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
				<StatCard
					icon={Users}
					label="Total Users"
					value={stats?.total_users || 0}
					change={analytics?.newUsers}
					changeLabel="new this week"
					color="blue"
					onClick={() => onNavigate("admin-users")}
				/>
				<StatCard
					icon={GraduationCap}
					label="Students"
					value={stats?.total_students || 0}
					subtitle={`${Math.round(
						(stats?.total_students / stats?.total_users) * 100 || 0
					)}% of users`}
					color="green"
					onClick={() => onNavigate("admin-users")}
				/>
				<StatCard
					icon={UserCheck}
					label="Instructors"
					value={stats?.total_instructors || 0}
					subtitle={`${stats?.total_subjects || 0} subjects`}
					color="purple"
					onClick={() => onNavigate("admin-users")}
				/>
				<StatCard
					icon={BookOpen}
					label="Active Subjects"
					value={stats?.total_subjects || 0}
					change={analytics?.newSubjects}
					changeLabel="new this week"
					color="orange"
				/>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Recent Users - 2 columns */}
				<div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="font-semibold text-gray-900">Recent Users</h3>
							<p className="text-xs text-gray-500 mt-0.5">
								Latest registrations
							</p>
						</div>
						<button
							onClick={() => onNavigate("admin-users")}
							className="text-sm text-classly-green hover:text-classly-green/80 font-medium flex items-center gap-1"
						>
							View All
							<ArrowRight size={14} />
						</button>
					</div>

					<div className="space-y-3">
						{recentUsers.length === 0 ? (
							<div className="text-center py-8 text-gray-400">
								<Users size={32} className="mx-auto mb-2 opacity-50" />
								<p className="text-sm">No users yet</p>
							</div>
						) : (
							recentUsers.map((user) => (
								<div
									key={user.id}
									className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
								>
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<div className="w-10 h-10 bg-linear-to-br from-classly-green to-green-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
											{user.full_name?.charAt(0).toUpperCase()}
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-gray-900 truncate">
												{user.full_name}
											</p>
											<p className="text-sm text-gray-500 truncate">
												{user.email}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3 shrink-0">
										<span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
											{user.role}
										</span>
										<button
											onClick={() => onNavigate("admin-users")}
											className="opacity-0 group-hover:opacity-100 text-classly-green hover:text-classly-green/80 transition-opacity"
										>
											<ArrowRight size={16} />
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Quick Actions - 1 column */}
				<div className="bg-white border border-gray-200 rounded-xl p-6">
					<div className="mb-4">
						<h3 className="font-semibold text-gray-900">Quick Actions</h3>
						<p className="text-xs text-gray-500 mt-0.5">Common tasks</p>
					</div>

					<div className="space-y-2">
						<button
							onClick={() => onNavigate("admin-users")}
							className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors group"
						>
							<div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
								<UserPlus size={18} />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">Create User</p>
								<p className="text-xs text-gray-500">Add new account</p>
							</div>
							<ArrowRight
								size={16}
								className="text-gray-300 group-hover:text-gray-600"
							/>
						</button>

						<button
							onClick={() => onNavigate("admin-users")}
							className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors group"
						>
							<div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
								<Users size={18} />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">
									Manage Users
								</p>
								<p className="text-xs text-gray-500">View all accounts</p>
							</div>
							<ArrowRight
								size={16}
								className="text-gray-300 group-hover:text-gray-600"
							/>
						</button>

						<div className="pt-4 border-t border-gray-100 mt-4">
							<div className="text-xs text-gray-500 mb-2">System Health</div>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
								<span className="text-sm text-gray-700">
									All systems operational
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Weekly Activity Summary */}
			{analytics && (
				<div className="bg-white border border-gray-200 rounded-xl p-6">
					<div className="flex items-center gap-2 mb-4">
						<TrendingUp size={20} className="text-classly-green" />
						<div>
							<h3 className="font-semibold text-gray-900">This Week</h3>
							<p className="text-xs text-gray-500">Last 7 days activity</p>
						</div>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
							<div className="text-2xl font-bold text-blue-600">
								+{analytics.newUsers}
							</div>
							<div className="text-sm text-blue-700 mt-1">New Users</div>
						</div>
						<div className="p-4 bg-green-50 rounded-lg border border-green-100">
							<div className="text-2xl font-bold text-green-600">
								+{analytics.newEnrollments}
							</div>
							<div className="text-sm text-green-700 mt-1">Enrollments</div>
						</div>
						<div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
							<div className="text-2xl font-bold text-purple-600">
								+{analytics.newSubjects}
							</div>
							<div className="text-sm text-purple-700 mt-1">New Subjects</div>
						</div>
						<div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
							<div className="text-2xl font-bold text-orange-600">
								+{analytics.newSubmissions}
							</div>
							<div className="text-sm text-orange-700 mt-1">Submissions</div>
						</div>
					</div>
				</div>
			)}

			{/* Last Updated */}
			<div className="flex items-center justify-center gap-2 text-xs text-gray-400">
				<Clock size={12} />
				<span>Last updated: {new Date().toLocaleTimeString()}</span>
			</div>
		</div>
	);
};

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({
	icon: IconComponent,
	label,
	value,
	subtitle,
	change,
	changeLabel,
	color,
	onClick,
}) => {
	const colorClasses = {
		blue: "from-blue-500 to-blue-600",
		green: "from-green-500 to-green-600",
		purple: "from-purple-500 to-purple-600",
		orange: "from-orange-500 to-orange-600",
	};

	return (
		<div
			onClick={onClick}
			className={`bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 ${
				onClick ? "cursor-pointer" : ""
			} group relative overflow-hidden`}
		>
			{/* Background gradient effect */}
			<div
				className={`absolute top-0 right-0 w-32 h-32 bg-linear-to-br ${colorClasses[color]} opacity-5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500`}
			/>

			<div className="relative">
				<div className="flex items-start justify-between mb-4">
					<div
						className={`p-3 rounded-xl bg-linear-to-br ${colorClasses[color]} text-white shadow-sm`}
					>
						<IconComponent size={24} strokeWidth={2} />
					</div>
				</div>

				<div>
					<p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
					<p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

					{change !== undefined && changeLabel && (
						<p className="text-xs text-green-600 font-medium">
							+{change} {changeLabel}
						</p>
					)}

					{subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
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
		<div className="space-y-6 animate-pulse">
			<div className="space-y-2">
				<div className="h-8 w-48 bg-gray-200 rounded" />
				<div className="h-4 w-64 bg-gray-200 rounded" />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
					>
						<div className="flex justify-between">
							<div className="h-12 w-12 bg-gray-200 rounded-xl" />
						</div>
						<div className="space-y-2">
							<div className="h-4 w-20 bg-gray-200 rounded" />
							<div className="h-8 w-16 bg-gray-200 rounded" />
							<div className="h-3 w-24 bg-gray-200 rounded" />
						</div>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 space-y-4">
					<div className="h-5 w-32 bg-gray-200 rounded" />
					{[1, 2, 3].map((i) => (
						<div key={i} className="flex gap-3">
							<div className="w-10 h-10 bg-gray-200 rounded-full" />
							<div className="flex-1 space-y-2">
								<div className="h-4 w-32 bg-gray-200 rounded" />
								<div className="h-3 w-48 bg-gray-200 rounded" />
							</div>
						</div>
					))}
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
					<div className="h-5 w-24 bg-gray-200 rounded" />
					{[1, 2].map((i) => (
						<div key={i} className="h-16 bg-gray-200 rounded-lg" />
					))}
				</div>
			</div>
		</div>
	);
};

export default AdminDashboard;
