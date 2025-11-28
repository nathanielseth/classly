import { useState } from "react";
import { Loader2, X } from "lucide-react";

export const ConfirmDialog = ({
	title,
	message,
	confirmText,
	onConfirm,
	onCancel,
	isDestructive = false,
}) => {
	const [confirming, setConfirming] = useState(false);

	const handleConfirm = async () => {
		setConfirming(true);
		await onConfirm();
		setConfirming(false);
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
				<div className="p-6">
					<h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
					<p className="text-sm text-gray-600">{message}</p>
				</div>
				<div className="p-6 pt-0 flex gap-3">
					<button
						onClick={onCancel}
						disabled={confirming}
						className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onClick={handleConfirm}
						disabled={confirming}
						className={`flex-1 px-4 py-2.5 ${
							isDestructive
								? "bg-red-600 hover:bg-red-700"
								: "bg-classly-green hover:bg-classly-green/90"
						} text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2`}
					>
						{confirming ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Processing...
							</>
						) : (
							confirmText
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
