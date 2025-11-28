import { useState, useEffect, useCallback } from "react";
import { db } from "../../../lib/supabase";

export const ModulesTab = ({ subjectId }) => {
	const [modules, setModules] = useState([]);
	const [loading, setLoading] = useState(true);

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

	if (loading) {
		return (
			<div className="px-6 py-6 flex items-center justify-center">
				<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
			</div>
		);
	}

	if (modules.length === 0) {
		return (
			<div className="px-6 py-6">
				<EmptyState
					// icon={BookOpen}
					title="No modules yet"
					description="Your instructor hasn't posted any content yet"
				/>
			</div>
		);
	}

	return (
		<div className="px-6 space-y-4">
			<div className="bg-white border-2 border-classly-green rounded-xl overflow-hidden shadow-sm">
				<div className="p-4 bg-green-50 border-b border-green-100 flex justify-between items-center">
					<h3 className="font-semibold text-gray-900">Current Modules</h3>
					<span className="text-xs font-bold text-classly-green bg-white px-2 py-1 rounded uppercase tracking-wide">
						{modules.length} Active
					</span>
				</div>
				<div className="divide-y divide-gray-100">
					{modules.map((module) => (
						<ModuleCard key={module.id} module={module} userRole="student" />
					))}
				</div>
			</div>
		</div>
	);
};
