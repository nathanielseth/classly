export const EmptyState = ({ icon: Icon, title, description, action }) => {
	return (
		<div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
			<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<Icon size={28} className="text-gray-400" />
			</div>
			<h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
			<p className="text-sm text-gray-500 mb-4">{description}</p>
			{action}
		</div>
	);
};
