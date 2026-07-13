import { useState } from "react";
import { X, Loader2, Upload, Paperclip, FileText } from "lucide-react";

export const CreateMaterialModal = ({ topics = [], onClose, onSave }) => {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		instructions: "",
		due_date: "",
		max_points: 100,
		type: "assignment",
		topic_id: "",
		allow_late_submission: true,
		published: true,
	});
	const [selectedFile, setSelectedFile] = useState(null);
	const [saving, setSaving] = useState(false);

	const handleFileSelect = (e) => {
		const file = e.target.files?.[0];
		if (file) {
			if (file.size > 10 * 1024 * 1024) {
				alert("File size must be less than 10MB");
				return;
			}
			setSelectedFile(file);
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
	};

	const handleSubmit = async () => {
		if (!formData.title.trim()) {
			alert("Please fill in the title");
			return;
		}

		try {
			setSaving(true);
			await onSave({
				...formData,
				newFile: selectedFile,
			});
		} catch (err) {
			console.error("Create material error:", err);
			alert(`Failed to create material: ${err.message}`);
		} finally {
			setSaving(false);
		}
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold text-gray-900">
							Create New Material
						</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
							disabled={saving}
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
							disabled={saving}
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
							rows={3}
							placeholder="Brief description..."
							disabled={saving}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Instructions
						</label>
						<textarea
							value={formData.instructions}
							onChange={(e) =>
								setFormData({ ...formData, instructions: e.target.value })
							}
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
							rows={4}
							placeholder="Detailed instructions for students..."
							disabled={saving}
						/>
					</div>

					{topics.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Topic <span className="text-gray-400">(Optional)</span>
							</label>
							<select
								value={formData.topic_id}
								onChange={(e) =>
									setFormData({ ...formData, topic_id: e.target.value })
								}
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
								disabled={saving}
							>
								<option value="">No Topic</option>
								{topics.map((topic) => (
									<option key={topic.id} value={topic.id}>
										{topic.name}
									</option>
								))}
							</select>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
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
								disabled={saving}
							>
								<option value="assignment">Assignment</option>
								<option value="quiz">Quiz</option>
								<option value="exam">Exam</option>
								<option value="project">Project</option>
								<option value="module">Module</option>
								<option value="others">Others</option>
							</select>
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
								disabled={saving}
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Due Date <span className="text-gray-400">(Optional)</span>
						</label>
						<input
							type="datetime-local"
							value={formData.due_date}
							onChange={(e) =>
								setFormData({ ...formData, due_date: e.target.value })
							}
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
							disabled={saving}
						/>
					</div>

					{/* File Upload */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Attach File <span className="text-gray-400">(Optional)</span>
						</label>

						{!selectedFile ? (
							<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-classly-green transition-colors">
								<input
									type="file"
									id="file-upload"
									className="hidden"
									onChange={handleFileSelect}
									disabled={saving}
									accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.jpg,.jpeg,.png"
								/>
								<label
									htmlFor="file-upload"
									className="cursor-pointer flex flex-col items-center gap-2"
								>
									<Upload className="w-8 h-8 text-gray-400" />
									<div>
										<p className="text-sm font-medium text-gray-700">
											Click to upload or drag and drop
										</p>
										<p className="text-xs text-gray-500 mt-1">
											PDF, DOC, PPT, XLS, ZIP, Images (Max 10MB)
										</p>
									</div>
								</label>
							</div>
						) : (
							<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-blue-50 rounded-lg">
										<Paperclip className="w-5 h-5 text-blue-600" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 truncate">
											{selectedFile.name}
										</p>
										<p className="text-xs text-gray-500">
											{formatFileSize(selectedFile.size)}
										</p>
									</div>
									{!saving && (
										<button
											onClick={handleRemoveFile}
											className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
										>
											<X size={16} />
										</button>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Options */}
					<div className="space-y-3 pt-2">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.allow_late_submission}
								onChange={(e) =>
									setFormData({
										...formData,
										allow_late_submission: e.target.checked,
									})
								}
								className="w-4 h-4 text-classly-green border-gray-300 rounded focus:ring-classly-green"
								disabled={saving}
							/>
							<span className="text-sm text-gray-700">
								Allow late submissions
							</span>
						</label>

						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.published}
								onChange={(e) =>
									setFormData({ ...formData, published: e.target.checked })
								}
								className="w-4 h-4 text-classly-green border-gray-300 rounded focus:ring-classly-green"
								disabled={saving}
							/>
							<span className="text-sm text-gray-700">
								Published (visible to students)
							</span>
						</label>
					</div>

					<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
						<FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
						<div className="text-xs text-blue-800">
							<p className="font-medium mb-1">Material Tips</p>
							<ul className="space-y-0.5 list-disc list-inside">
								<li>Files are stored securely in cloud storage</li>
								<li>Students can download attached files</li>
								<li>Maximum file size is 10MB</li>
							</ul>
						</div>
					</div>
				</div>

				<div className="p-6 pt-0 flex gap-3">
					<button
						onClick={onClose}
						disabled={saving}
						className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						disabled={saving}
						className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{saving ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Creating...
							</>
						) : (
							"Create Material"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
