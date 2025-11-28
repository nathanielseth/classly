import { useState, useEffect, useCallback } from "react";

import { BookOpen } from "lucide-react";
import { ModuleCard } from "../../classroom/shared/ModuleCard";
import { CreateModuleModal } from "../../classroom/modal/CreateModuleModal";
import { db } from "../../../lib/supabase";

export const InstructorModulesTab = ({ subjectId }) => {
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);

	const loadModules = useCallback(async () => {
		try {
			setLoading(true);
			const { data, error } = await db.assignments.getBySubject(subjectId);
			if (error) throw error;
			setModules(data || []);
		} catch (err) {
			console.error("Modules load error:", err);
		} finally {
			setLoading(false);
		}
	}, [subjectId]);

	useEffect(() => {
		loadModules();
	}, [loadModules]);

	const handleDelete = async (id) => {
		if (!window.confirm("Delete this module?")) return;

		try {
			const { error } = await db.assignments.delete(id);
			if (error) throw error;
			await loadModules();
		} catch (err) {
			console.error("Delete error:", err);
			alert("Failed to delete module");
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
		<div className="px-6 space-y-4">
			<div className="flex justify-between items-center">
				<h2 className="text-lg font-semibold text-gray-900">Course Modules</h2>
				<button
					onClick={() => setShowCreateModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors shadow-sm"
				>
					<Plus size={16} strokeWidth={2.5} />
					Create Module
				</button>
			</div>

			{modules.length === 0 ? (
				<EmptyState
					icon={BookOpen}
					title="No modules yet"
					description="Get started by creating your first module"
					action={
						<button
							onClick={() => setShowCreateModal(true)}
							className="inline-flex items-center gap-2 px-5 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-all shadow-sm"
						>
							<Plus size={18} strokeWidth={2.5} />
							Create First Module
						</button>
					}
				/>
			) : (
				<div className="bg-white border-2 border-classly-green rounded-xl overflow-hidden shadow-sm">
					<div className="p-4 bg-green-50 border-b border-green-100 flex justify-between items-center">
						<h3 className="font-semibold text-gray-900">Active Modules</h3>
						<span className="text-xs font-bold text-classly-green bg-white px-2 py-1 rounded uppercase tracking-wide">
							{modules.length} Active
						</span>
					</div>
					<div className="divide-y divide-gray-100">
						{modules.map((module) => (
							<ModuleCard
								key={module.id}
								module={module}
								userRole="instructor"
								onDelete={() => handleDelete(module.id)}
							/>
						))}
					</div>
				</div>
			)}

			{showCreateModal && (
				<CreateModuleModal
					subjectId={subjectId}
					onClose={() => setShowCreateModal(false)}
					onSuccess={() => {
						setShowCreateModal(false);
						loadModules();
					}}
				/>
			)}
		</div>
	);
};
