import { useState, useEffect } from "react";
import {
	Loader2,
	BookOpen,
	Plus,
	Filter,
	MoreVertical,
	Edit,
	Trash2,
	FolderPlus,
} from "lucide-react";
import { db, storage } from "../../../lib/supabase";
import { MaterialCard } from "../../classroom/shared/MaterialCard";
import { CreateMaterialModal } from "../../classroom/modal/CreateMaterialModal";
import { EditMaterialModal } from "../../classroom/modal/EditMaterialModal";
import { CreateTopicModal } from "../../classroom/modal/CreateTopicModal";
import { EmptyState } from "../../classroom/shared/EmptyState";

export const InstructorMaterialsTab = ({ subjectId, onNavigateToMaterial }) => {
	const [materials, setMaterials] = useState([]);
	const [topics, setTopics] = useState([]);
	const [loading, setLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState("all");
	const [showTopicMenu, setShowTopicMenu] = useState(null);

	// Modals
	const [showCreateMaterial, setShowCreateMaterial] = useState(false);
	const [showEditMaterial, setShowEditMaterial] = useState(false);
	const [showCreateTopic, setShowCreateTopic] = useState(false);
	const [showEditTopic, setShowEditTopic] = useState(false);
	const [selectedMaterial, setSelectedMaterial] = useState(null);
	const [selectedTopic, setSelectedTopic] = useState(null);

	// Load materials and topics
	useEffect(() => {
		loadData();
	}, [subjectId]);

	const loadData = async () => {
		try {
			setLoading(true);
			const [materialsRes, topicsRes] = await Promise.all([
				db.assignments.getBySubject(subjectId),
				db.topics.getBySubject(subjectId),
			]);

			if (materialsRes.error) throw materialsRes.error;
			if (topicsRes.error) throw topicsRes.error;

			setMaterials(materialsRes.data || []);
			setTopics(topicsRes.data || []);
		} catch (err) {
			console.error("Load data error:", err);
			alert("Failed to load materials");
		} finally {
			setLoading(false);
		}
	};

	// Filter materials by type
	const filteredMaterials = materials.filter((material) => {
		if (typeFilter === "all") return true;
		return material.type === typeFilter;
	});

	// Group materials by topic
	const groupedMaterials = {};

	topics.forEach((topic) => {
		groupedMaterials[topic.id] = {
			topic,
			materials: [],
		};
	});

	groupedMaterials["no-topic"] = {
		topic: { id: "no-topic", name: "No Topic", description: null },
		materials: [],
	};

	filteredMaterials.forEach((material) => {
		const topicId = material.topic_id || "no-topic";
		if (groupedMaterials[topicId]) {
			groupedMaterials[topicId].materials.push(material);
		} else {
			groupedMaterials["no-topic"].materials.push(material);
		}
	});

	const sortedGroups = Object.values(groupedMaterials).sort((a, b) => {
		if (a.topic.id === "no-topic") return 1;
		if (b.topic.id === "no-topic") return -1;
		if (a.topic.created_at && b.topic.created_at) {
			return new Date(a.topic.created_at) - new Date(b.topic.created_at);
		}
		return 0;
	});

	// Material handlers
	const handleCreateMaterial = async (materialData) => {
		try {
			const { data: material, error: createError } =
				await db.assignments.create({
					subject_id: subjectId,
					title: materialData.title,
					description: materialData.description,
					instructions: materialData.instructions,
					due_date: materialData.due_date || null,
					max_points: materialData.max_points,
					type: materialData.type,
					topic_id: materialData.topic_id || null,
					allow_late_submission: materialData.allow_late_submission ?? true,
					published: materialData.published ?? true,
				});

			if (createError) throw createError;

			// Upload file if provided
			if (materialData.newFile) {
				const fileExt = materialData.newFile.name.split(".").pop();
				const fileName = `${material.id}_${Date.now()}.${fileExt}`;
				const filePath = `materials/${subjectId}/${fileName}`;

				const { error: uploadError } = await storage.upload(
					"course-files",
					filePath,
					materialData.newFile
				);

				if (uploadError) throw uploadError;

				const fileUrl = storage.getPublicUrl("course-files", filePath);

				await db.assignments.update(material.id, {
					file_url: fileUrl,
					file_name: materialData.newFile.name,
					file_size: materialData.newFile.size,
				});
			}

			await loadData();
			setShowCreateMaterial(false);
		} catch (err) {
			console.error("Create material error:", err);
			throw err;
		}
	};

	const handleEditMaterial = async (materialData) => {
		try {
			// Update material data
			const updates = {
				title: materialData.title,
				description: materialData.description,
				instructions: materialData.instructions,
				due_date: materialData.due_date || null,
				max_points: materialData.max_points,
				type: materialData.type,
				topic_id: materialData.topic_id || null,
				allow_late_submission: materialData.allow_late_submission,
				published: materialData.published,
			};

			// Handle file changes
			if (materialData.removeFile && selectedMaterial.file_url) {
				// Delete old file
				const oldPath = selectedMaterial.file_url.split("/course-files/")[1];
				if (oldPath) {
					await storage.delete("course-files", oldPath);
				}
				updates.file_url = null;
				updates.file_name = null;
				updates.file_size = null;
			}

			if (materialData.newFile) {
				// Delete old file if exists
				if (selectedMaterial.file_url) {
					const oldPath = selectedMaterial.file_url.split("/course-files/")[1];
					if (oldPath) {
						await storage.delete("course-files", oldPath);
					}
				}

				// Upload new file
				const fileExt = materialData.newFile.name.split(".").pop();
				const fileName = `${selectedMaterial.id}_${Date.now()}.${fileExt}`;
				const filePath = `materials/${subjectId}/${fileName}`;

				const { error: uploadError } = await storage.upload(
					"course-files",
					filePath,
					materialData.newFile
				);

				if (uploadError) throw uploadError;

				const fileUrl = storage.getPublicUrl("course-files", filePath);
				updates.file_url = fileUrl;
				updates.file_name = materialData.newFile.name;
				updates.file_size = materialData.newFile.size;
			}

			const { error } = await db.assignments.update(
				selectedMaterial.id,
				updates
			);
			if (error) throw error;

			await loadData();
			setShowEditMaterial(false);
			setSelectedMaterial(null);
		} catch (err) {
			console.error("Edit material error:", err);
			throw err;
		}
	};

	const handleDeleteMaterial = async (materialId) => {
		if (!window.confirm("Delete this material? This cannot be undone.")) return;

		try {
			// Get material to check for file
			const material = materials.find((m) => m.id === materialId);

			// Delete file if exists
			if (material?.file_url) {
				const filePath = material.file_url.split("/course-files/")[1];
				if (filePath) {
					await storage.delete("course-files", filePath);
				}
			}

			const { error } = await db.assignments.delete(materialId);
			if (error) throw error;

			await loadData();
		} catch (err) {
			console.error("Delete material error:", err);
			alert("Failed to delete material");
		}
	};

	// Topic handlers
	const handleCreateTopic = async (topicData) => {
		try {
			const { error } = await db.topics.create({
				subject_id: subjectId,
				name: topicData.name,
				description: topicData.description,
			});

			if (error) throw error;

			await loadData();
			setShowCreateTopic(false);
		} catch (err) {
			console.error("Create topic error:", err);
			throw err;
		}
	};

	const handleEditTopic = async (topicData) => {
		try {
			const { error } = await db.topics.update(selectedTopic.id, {
				name: topicData.name,
				description: topicData.description,
			});

			if (error) throw error;

			await loadData();
			setShowEditTopic(false);
			setSelectedTopic(null);
		} catch (err) {
			console.error("Edit topic error:", err);
			throw err;
		}
	};

	const handleDeleteTopic = async (topicId) => {
		const topic = topics.find((t) => t.id === topicId);
		if (
			!window.confirm(
				`Delete topic "${topic.name}"? Materials will be moved to "No Topic".`
			)
		) {
			return;
		}

		try {
			const { error } = await db.topics.delete(topicId);
			if (error) throw error;

			await loadData();
			setShowTopicMenu(null);
		} catch (err) {
			console.error("Delete topic error:", err);
			alert("Failed to delete topic");
		}
	};

	const handleTopicAction = (action, topic) => {
		setShowTopicMenu(null);
		if (action === "edit") {
			setSelectedTopic(topic);
			setShowEditTopic(true);
		} else if (action === "delete") {
			handleDeleteTopic(topic.id);
		}
	};

	const typeFilterOptions = [
		{ value: "all", label: "All Materials" },
		{ value: "assignment", label: "Assignments" },
		{ value: "quiz", label: "Quizzes" },
		{ value: "exam", label: "Exams" },
		{ value: "project", label: "Projects" },
		{ value: "material", label: "Materials" },
	];

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
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowCreateTopic(true)}
						className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
					>
						<FolderPlus size={16} />
						Topic
					</button>
					<button
						onClick={() => setShowCreateMaterial(true)}
						className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors shadow-sm"
					>
						<Plus size={16} strokeWidth={2.5} />
						Create
					</button>
				</div>
			</div>

			{/* Type Filter */}
			<div className="flex items-center gap-2 overflow-x-auto pb-2">
				<Filter size={16} className="text-gray-400 shrink-0" />
				{typeFilterOptions.map((option) => (
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
					description="Get started by creating your first course material"
					action={
						<button
							onClick={() => setShowCreateMaterial(true)}
							className="inline-flex items-center gap-2 px-5 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-all shadow-sm"
						>
							<Plus size={18} strokeWidth={2.5} />
							Create First Material
						</button>
					}
				/>
			) : filteredMaterials.length === 0 ? (
				<div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
					<Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No materials found
					</h3>
					<p className="text-gray-600">
						Try adjusting your filter or create a new material
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{sortedGroups.map(({ topic, materials: topicMaterials }) => {
						if (topicMaterials.length === 0) return null;

						const isNoTopic = topic.id === "no-topic";

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

										<div className="flex items-center gap-2">
											<span className="text-xs font-bold text-classly-green bg-white px-2 py-1 rounded uppercase tracking-wide">
												{topicMaterials.length} Material
												{topicMaterials.length !== 1 ? "s" : ""}
											</span>

											{!isNoTopic && (
												<div className="relative">
													<button
														onClick={() =>
															setShowTopicMenu(
																showTopicMenu === topic.id ? null : topic.id
															)
														}
														className="p-1.5 text-gray-600 hover:bg-white rounded-lg transition-colors"
													>
														<MoreVertical size={16} />
													</button>

													{showTopicMenu === topic.id && (
														<div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
															<button
																onClick={() => handleTopicAction("edit", topic)}
																className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
															>
																<Edit size={14} />
																Edit Topic
															</button>
															<button
																onClick={() =>
																	handleTopicAction("delete", topic)
																}
																className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
															>
																<Trash2 size={14} />
																Delete Topic
															</button>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Materials */}
								<div className="divide-y divide-gray-100">
									{topicMaterials.map((material) => (
										<MaterialCard
											key={material.id}
											material={material}
											userRole="instructor"
											onClick={onNavigateToMaterial}
											onEdit={() => {
												setSelectedMaterial(material);
												setShowEditMaterial(true);
											}}
											onDelete={() => handleDeleteMaterial(material.id)}
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Modals */}
			{showCreateMaterial && (
				<CreateMaterialModal
					subjectId={subjectId}
					topics={topics}
					onClose={() => setShowCreateMaterial(false)}
					onSave={handleCreateMaterial}
				/>
			)}

			{showEditMaterial && selectedMaterial && (
				<EditMaterialModal
					material={selectedMaterial}
					topics={topics}
					onClose={() => {
						setShowEditMaterial(false);
						setSelectedMaterial(null);
					}}
					onSave={handleEditMaterial}
				/>
			)}

			{showCreateTopic && (
				<CreateTopicModal
					onClose={() => setShowCreateTopic(false)}
					onSave={handleCreateTopic}
				/>
			)}

			{showEditTopic && selectedTopic && (
				<CreateTopicModal
					topic={selectedTopic}
					onClose={() => {
						setShowEditTopic(false);
						setSelectedTopic(null);
					}}
					onSave={handleEditTopic}
				/>
			)}
		</div>
	);
};
