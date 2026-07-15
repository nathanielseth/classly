import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { db } from "../../lib/supabase";
import { ClassroomHeader } from "../classroom/shared/ClassroomHeader";
import { ClassroomTabs } from "../classroom/shared/ClassroomTabs";
import { ConfirmDialog } from "../classroom/shared/ConfirmDialog";
import { InstructorStreamTab } from "./tabs/InstructorStreamTab";
import { InstructorMaterialsTab } from "./tabs/InstructorMaterialsTab";
import { InstructorPeopleTab } from "./tabs/InstructorPeopleTab";
import { EditSubjectModal } from "../classroom/modal/EditSubjectModal";
import { MaterialDetailPage } from "../../pages/MaterialDetailPage";

const InstructorClassroomView = ({ userId, userRole, subjectId, onBack }) => {
	const [activeTab, setActiveTab] = useState("stream");
	const [subject, setSubject] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showEditSubject, setShowEditSubject] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [selectedMaterial, setSelectedMaterial] = useState(null);

	const fetchSubject = useCallback(async () => {
		const { data, error: subjectError } = await db.subjects.getById(subjectId);
		if (subjectError) throw subjectError;
		return data;
	}, [subjectId]);

	const loadSubject = useCallback(async () => {
		try {
			setLoading(true);
			const data = await fetchSubject();
			setSubject(data);
			setError(null);
		} catch (err) {
			console.error("Subject load error:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [fetchSubject]);

	useEffect(() => {
		if (!subjectId) return;
		let cancelled = false;

		(async () => {
			setLoading(true);
			try {
				const data = await fetchSubject();
				if (cancelled) return;
				setSubject(data);
				setError(null);
			} catch (err) {
				if (cancelled) return;
				console.error("Subject load error:", err);
				setError(err.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [subjectId, fetchSubject]);

	const handleEditSubject = async (updates) => {
		try {
			const { error } = await db.subjects.update(subject.id, updates);
			if (error) throw error;
			await loadSubject();
			setShowEditSubject(false);
		} catch (err) {
			console.error("Update error:", err);
			alert("Failed to update subject");
		}
	};

	const handleDeleteSubject = async () => {
		try {
			const { error } = await db.subjects.delete(subject.id);
			if (error) throw error;
			onBack();
		} catch (err) {
			console.error("Delete error:", err);
			alert("Failed to delete subject");
		}
	};

	const handleNavigateToMaterial = (material) => {
		setSelectedMaterial(material);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Loader2 className="w-8 h-8 text-classly-green animate-spin" />
			</div>
		);
	}

	if (error || !subject) {
		return (
			<div className="min-h-screen bg-gray-50 p-6">
				<div className="max-w-md mx-auto mt-20">
					<div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
						<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
						<div>
							<h3 className="font-semibold text-red-900 mb-1">
								Unable to load classroom
							</h3>
							<p className="text-sm text-red-700">
								{error || "No subject found"}
							</p>
							<button
								onClick={onBack}
								className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
							>
								Go Back
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (selectedMaterial) {
		return (
			<MaterialDetailPage
				material={selectedMaterial}
				subject={subject}
				subjectId={subject.id}
				userRole={userRole}
				userId={userId}
				onBack={() => setSelectedMaterial(null)}
			/>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<div className="bg-linear-to-r from-classly-green to-emerald-600">
				<ClassroomHeader
					subject={subject}
					onBack={onBack}
					userRole={userRole}
					onEdit={() => setShowEditSubject(true)}
					onDelete={() => setShowDeleteConfirm(true)}
				/>
				<ClassroomTabs activeTab={activeTab} setActiveTab={setActiveTab} />
			</div>

			<div className="flex-1 overflow-y-auto">
				<div className="max-w-5xl mx-auto py-6">
					{activeTab === "stream" && (
						<InstructorStreamTab subjectId={subject.id} userId={userId} />
					)}
					{activeTab === "materials" && (
						<InstructorMaterialsTab
							subjectId={subject.id}
							onNavigateToMaterial={handleNavigateToMaterial}
						/>
					)}
					{activeTab === "people" && (
						<InstructorPeopleTab subjectId={subject.id} subject={subject} />
					)}
				</div>
			</div>

			{showEditSubject && (
				<EditSubjectModal
					subject={subject}
					onSave={handleEditSubject}
					onClose={() => setShowEditSubject(false)}
				/>
			)}

			{showDeleteConfirm && (
				<ConfirmDialog
					title="Delete Subject"
					message={`Are you sure you want to delete "${subject.name}"? This action cannot be undone.`}
					confirmText="Delete"
					isDestructive
					onConfirm={handleDeleteSubject}
					onCancel={() => setShowDeleteConfirm(false)}
				/>
			)}
		</div>
	);
};

export default InstructorClassroomView;