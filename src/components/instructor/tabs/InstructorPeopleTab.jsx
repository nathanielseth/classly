import { useState, useEffect, useCallback } from "react";
import { StudentCard } from "../../classroom/shared/StudentCard";
import { db } from "../../../lib/supabase";
import { Loader2 } from "lucide-react";

export const InstructorPeopleTab = ({ subjectId, subject }) => {
	const [enrollments, setEnrollments] = useState([]);
	const [loading, setLoading] = useState(true);

	const loadEnrollments = useCallback(async () => {
		try {
			setLoading(true);
			const { data, error } = await db.enrollments.getBySubject(subjectId);
			if (error) throw error;
			setEnrollments(data || []);
		} catch (err) {
			console.error("Enrollments load error:", err);
		} finally {
			setLoading(false);
		}
	}, [subjectId]);

	useEffect(() => {
		loadEnrollments();
	}, [loadEnrollments]);

	const handleRemove = async (studentId, studentName) => {
		if (!window.confirm(`Remove ${studentName} from this class?`)) return;

		try {
			const { error } = await db.enrollments.unenroll(studentId, subjectId);
			if (error) throw error;
			await loadEnrollments();
		} catch (err) {
			console.error("Remove error:", err);
			alert("Failed to remove student");
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
		<div className="px-6 space-y-6">
			{/* Instructor Section */}
			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-3">Instructor</h2>
				<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
					<div className="flex items-center gap-3">
						<img
							src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${subject.instructor?.full_name}`}
							alt={subject.instructor?.full_name}
							className="w-12 h-12 rounded-full bg-gray-100"
						/>
						<div className="flex-1">
							<div className="flex items-center gap-1.5">
								<p className="text-sm font-semibold text-gray-900">
									{subject.instructor?.full_name || "Unknown"}
								</p>
								<svg
									className="w-4 h-4 text-blue-500"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<p className="text-xs text-gray-500 mt-0.5">Lead Instructor</p>
							<p className="text-xs text-gray-400 mt-0.5">
								{subject.instructor?.email}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Students Section */}
			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
					Students
					<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
						{enrollments.length}
					</span>
				</h2>
				<div className="bg-white border border-gray-200 rounded-xl shadow-sm">
					{enrollments.length === 0 ? (
						<div className="p-8 text-center text-gray-500 text-sm">
							No students enrolled yet
						</div>
					) : (
						<div className="divide-y divide-gray-100">
							{enrollments.map((enrollment) => (
								<StudentCard
									key={enrollment.id}
									student={enrollment.student}
									userRole="instructor"
									onMessage={() => {}}
									onRemove={() =>
										handleRemove(
											enrollment.student_id,
											enrollment.student?.full_name
										)
									}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
