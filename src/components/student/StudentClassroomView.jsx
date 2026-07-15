import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { db, storage } from "../../lib/supabase";
import { ClassroomHeader } from "../classroom/shared/ClassroomHeader";
import { ClassroomTabs } from "../classroom/shared/ClassroomTabs";
import { StudentStreamTab } from "./tabs/StudentStreamTab";
import { StudentMaterialsTab } from "./tabs/StudentMaterialsTab";
import { StudentPeopleTab } from "./tabs/StudentPeopleTab";
import { MaterialDetailPage } from "../../pages/MaterialDetailPage";

const StudentClassroomView = ({ userId, userRole, subjectId, onBack }) => {
	const [activeTab, setActiveTab] = useState("stream");
	const [subject, setSubject] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedMaterial, setSelectedMaterial] = useState(null);
	const [submission, setSubmission] = useState(null);

	useEffect(() => {
		if (!subjectId) return;
		let cancelled = false;

		(async () => {
			setLoading(true);
			try {
				const { data, error: subjectError } =
					await db.subjects.getById(subjectId);
				if (subjectError) throw subjectError;
				if (cancelled) return;
				setSubject(data);
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
	}, [subjectId]);

	const handleNavigateToMaterial = async (material) => {
		setSelectedMaterial(material);
		// Load existing submission if any
		const { data } = await db.submissions.getByMaterialAndStudent(
			material.id,
			userId,
		);
		setSubmission(data || null);
	};

	const uploadSubmissionFile = async (file) => {
		const fileExt = file.name.split(".").pop();
		const filePath = `submissions/${selectedMaterial.id}/${userId}_${Date.now()}.${fileExt}`;

		const { error: uploadError } = await storage.upload(
			"course-files",
			filePath,
			file,
		);

		if (uploadError) {
			throw uploadError;
		}

		return {
			fileUrl: storage.getPublicUrl("course-files", filePath),
			fileName: file.name,
			fileSize: file.size,
		};
	};

	const handleSubmit = async ({ content, file }) => {
		let fileUrl = null,
			fileName = null,
			fileSize = null;

		if (file) {
			const uploaded = await uploadSubmissionFile(file);
			fileUrl = uploaded.fileUrl;
			fileName = uploaded.fileName;
			fileSize = uploaded.fileSize;
		}

		const { data, error } = await db.submissions.submit(
			selectedMaterial.id,
			userId,
			content,
			fileUrl,
			fileName,
			fileSize,
		);
		if (error) throw error;
		setSubmission(data);
	};

	const handleUnsubmit = async () => {
		const { data, error } = await db.submissions.unsubmit(submission.id);
		if (error) throw error;
		setSubmission(data);
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
				submission={submission}
				subject={subject}
				userRole={userRole}
				userId={userId}
				onBack={() => {
					setSelectedMaterial(null);
					setSubmission(null);
				}}
				onSubmit={handleSubmit}
				onUnsubmit={handleUnsubmit}
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
				/>
				<ClassroomTabs activeTab={activeTab} setActiveTab={setActiveTab} />
			</div>

			<div className="flex-1 overflow-y-auto">
				<div className="max-w-5xl mx-auto py-6">
					{activeTab === "stream" && (
						<StudentStreamTab subjectId={subject.id} userId={userId} />
					)}
					{activeTab === "materials" && (
						<StudentMaterialsTab
							subjectId={subject.id}
							onNavigateToMaterial={handleNavigateToMaterial}
						/>
					)}
					{activeTab === "people" && (
						<StudentPeopleTab subjectId={subject.id} subject={subject} />
					)}
				</div>
			</div>
		</div>
	);
};

export default StudentClassroomView;