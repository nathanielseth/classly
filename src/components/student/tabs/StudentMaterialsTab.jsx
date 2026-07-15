import { useState, useEffect } from "react";
import { Loader2, BookOpen, Filter } from "lucide-react";
import { db } from "../../../lib/supabase";
import { MaterialCard } from "../../classroom/shared/MaterialCard";
import { EmptyState } from "../../classroom/shared/EmptyState";

const TYPE_FILTER_OPTIONS = [
	{ value: "all", label: "All Materials" },
	{ value: "assignment", label: "Assignments" },
	{ value: "quiz", label: "Quizzes" },
	{ value: "exam", label: "Exams" },
	{ value: "project", label: "Projects" },
	{ value: "material", label: "Materials" },
];

const NO_TOPIC = { id: "no-topic", name: "No Topic", description: null };

function groupMaterialsByTopic(materials, topics) {
	const groups = {};

	topics.forEach((topic) => {
		groups[topic.id] = { topic, materials: [] };
	});
	groups["no-topic"] = { topic: NO_TOPIC, materials: [] };

	materials.forEach((material) => {
		const topicId = material.topic_id || "no-topic";
		(groups[topicId] ?? groups["no-topic"]).materials.push(material);
	});

	return Object.values(groups).sort((a, b) => {
		if (a.topic.id === "no-topic") return 1;
		if (b.topic.id === "no-topic") return -1;
		if (a.topic.created_at && b.topic.created_at) {
			return new Date(a.topic.created_at) - new Date(b.topic.created_at);
		}
		return 0;
	});
}

export const StudentMaterialsTab = ({ subjectId, onNavigateToMaterial }) => {
	const [materials, setMaterials] = useState([]);
	const [topics, setTopics] = useState([]);
	const [loading, setLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState("all");

	useEffect(() => {
		let cancelled = false;

		(async () => {
			setLoading(true);
			try {
				const [materialsRes, topicsRes] = await Promise.all([
					db.materials.getBySubject(subjectId),
					db.topics.getBySubject(subjectId),
				]);

				if (materialsRes.error) throw materialsRes.error;
				if (topicsRes.error) throw topicsRes.error;

				if (cancelled) return;
				setMaterials(materialsRes.data || []);
				setTopics(topicsRes.data || []);
			} catch (err) {
				if (cancelled) return;
				console.error("Load data error:", err);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [subjectId]);

	// Filter materials by type
	const filteredMaterials = materials.filter((material) => {
		if (typeFilter === "all") return true;
		return material.type === typeFilter;
	});

	const sortedGroups = groupMaterialsByTopic(filteredMaterials, topics);

	if (loading) {
		return (
			<div className="px-6 py-6 flex items-center justify-center">
				<Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="px-6 pb-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-gray-900">Classwork</h2>
					<p className="text-sm text-gray-600 mt-1">
						{materials.length} material{materials.length !== 1 ? "s" : ""}
					</p>
				</div>
			</div>

			{/* Type Filter */}
			<div className="flex items-center gap-2 overflow-x-auto pb-2">
				<Filter size={16} className="text-gray-400 shrink-0" />
				{TYPE_FILTER_OPTIONS.map((option) => (
					<button
						key={option.value}
						onClick={() => setTypeFilter(option.value)}
						className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
							typeFilter === option.value
								? "bg-classly-green text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						{option.label}
					</button>
				))}
			</div>

			{/* Empty State */}
			{materials.length === 0 ? (
				<EmptyState
					icon={BookOpen}
					title="No materials yet"
					description="Your instructor hasn't posted any content yet"
				/>
			) : filteredMaterials.length === 0 ? (
				<div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
					<Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No materials found
					</h3>
					<p className="text-gray-600">Try adjusting your filter</p>
				</div>
			) : (
				<div className="space-y-6">
					{sortedGroups.map(({ topic, materials: topicMaterials }) => {
						if (topicMaterials.length === 0) return null;

						return (
							<div
								key={topic.id}
								className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm"
							>
								{/* Topic Header */}
								<div className="bg-green-50 border-b border-green-100 p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 bg-classly-green rounded-lg flex items-center justify-center">
												<BookOpen className="w-4 h-4 text-white" />
											</div>
											<div>
												<h3 className="font-semibold text-gray-900">
													{topic.name}
												</h3>
												{topic.description && (
													<p className="text-sm text-gray-600 mt-0.5">
														{topic.description}
													</p>
												)}
											</div>
										</div>
										<span className="text-xs font-bold text-classly-green bg-white px-2 py-1 rounded uppercase tracking-wide">
											{topicMaterials.length} Material
											{topicMaterials.length !== 1 ? "s" : ""}
										</span>
									</div>
								</div>

								{/* Materials */}
								<div className="divide-y divide-gray-100">
									{topicMaterials.map((material) => (
										<MaterialCard
											key={material.id}
											material={material}
											userRole="student"
											onClick={onNavigateToMaterial}
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};