import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";

export const EditSubjectModal = ({ subject, onSave, onClose }) => {
	const [formData, setFormData] = useState({
		name: subject.name,
		code: subject.code,
		schedule: subject.schedule || "",
		room: subject.room || "",
		description: subject.description || "",
	});
	const [saving, setSaving] = useState(false);

	const handleSubmit = async () => {
		try {
			setSaving(true);
			await onSave(formData);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
				<div className="p-6 border-b border-gray-100">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold text-gray-900">Edit Subject</h2>
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
							Subject Name
						</label>
						<input
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Code
							</label>
							<input
								type="text"
								value={formData.code}
								onChange={(e) =>
									setFormData({
										...formData,
										code: e.target.value.toUpperCase(),
									})
								}
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Room
							</label>
							<input
								type="text"
								value={formData.room}
								onChange={(e) =>
									setFormData({ ...formData, room: e.target.value })
								}
								className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20"
							/>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Schedule
						</label>
						<input
							type="text"
							value={formData.schedule}
							onChange={(e) =>
								setFormData({ ...formData, schedule: e.target.value })
							}
							placeholder="e.g., MWF 10:00-11:30 AM"
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20"
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
							rows={3}
							className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none"
						/>
					</div>
				</div>
				<div className="p-6 pt-0 flex gap-3">
					<button
						onClick={onClose}
						disabled={saving}
						className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						disabled={saving}
						className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{saving ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Saving...
							</>
						) : (
							"Save Changes"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
