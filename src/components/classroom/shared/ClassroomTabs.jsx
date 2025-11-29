export const ClassroomTabs = ({ activeTab, setActiveTab }) => {
	const tabs = ["stream", "materials", "people"];

	return (
		<div className="flex gap-1 border-b border-white/20 px-6 max-w-7xl mx-auto">
			{tabs.map((tab) => (
				<button
					key={tab}
					onClick={() => setActiveTab(tab)}
					className={`px-6 py-3 text-sm font-medium capitalize transition-all ${
						activeTab === tab
							? "text-white border-b-2 border-white"
							: "text-white/60 hover:text-white/90"
					}`}
				>
					{tab}
				</button>
			))}
		</div>
	);
};
