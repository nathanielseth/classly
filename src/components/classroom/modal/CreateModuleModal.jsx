import { useState } from "react";

export const CreateModuleModal = ({ subjectId, onClose, onSuccess }) => {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		due_date: "",
		max_points: 100,
		type: "assignment",
	});
	const [creating, setCreating] = useState(false);

	const handleSubmit = async () => {
		if (!formData.title.trim() || !formData.due_date) {
			alert("Please fill in title and due date");
			return;
		}

		try {
			setCreating(true);
			const { error } = await window.db.assignments.create({
				subject_id: subjectId,
				...formData,
			});

			if (error) throw error;
			onSuccess();
		} catch (err) {
			console.error("Create module error:", err);
			alert("Failed to create module");
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold text-gray-900">
							Create New Module
						</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X size={20} />
						</button>
					</div>
				</div>
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Title *
						</label>
						<input
							type="text"
							value={formData.title}
							onChange={(e) =>
								setFormData({ ...formData, title: e.target.value })
							}
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
							placeholder="e.g., Week 1: Introduction to React"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Description
						</label>
						<textarea
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
							rows={4}
							placeholder="Describe the module content and requirements..."
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Due Date *
							</label>
							<input
								type="datetime-local"
								value={formData.due_date}
								onChange={(e) =>
									setFormData({ ...formData, due_date: e.target.value })
								}
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Points
							</label>
							<input
								type="number"
								value={formData.max_points}
								onChange={(e) =>
									setFormData({
										...formData,
										max_points: parseInt(e.target.value) || 0,
									})
								}
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
								min="0"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Type
						</label>
						<select
							value={formData.type}
							onChange={(e) =>
								setFormData({ ...formData, type: e.target.value })
							}
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
						>
							<option value="assignment">Assignment</option>
							<option value="quiz">Quiz</option>
							<option value="exam">Exam</option>
							<option value="project">Project</option>
							<option value="material">Material</option>
						</select>
					</div>
				</div>
				<div className="p-6 pt-0 flex gap-3">
					<button
						onClick={onClose}
						disabled={creating}
						className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						disabled={creating}
						className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{creating ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Creating...
							</>
						) : (
							"Create Module"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
