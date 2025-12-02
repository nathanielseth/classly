import React, { useState, useEffect } from "react";
import {
	Layers,
	AlertCircle,
	Loader2,
	ChevronRight,
	ChevronLeft,
	RotateCw,
	BookOpen,
	GraduationCap,
	LayoutGrid,
	Copy,
} from "lucide-react";
import { db } from "../../lib/supabase/db";
import { supabase } from "../../lib/supabase/client";
import {
	extractTextFromPDF,
	generateFlashcardsFromContent,
} from "../../lib/api/aiApi";

const FlashcardTab = () => {
	const [subjects, setSubjects] = useState([]);
	const [materials, setMaterials] = useState([]);
	const [selectedSubject, setSelectedSubject] = useState(null);
	const [selectedMaterial, setSelectedMaterial] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [flashcards, setFlashcards] = useState(null);
	const [error, setError] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [loadingMaterials, setLoadingMaterials] = useState(false);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const [viewMode, setViewMode] = useState("deck");

	useEffect(() => {
		loadUser();
	}, []);

	useEffect(() => {
		if (currentUser) {
			loadSubjects();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser]);

	useEffect(() => {
		if (selectedSubject) {
			loadMaterials();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSubject]);

	const loadUser = async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setCurrentUser(user);
		} catch (err) {
			console.error("Error loading user:", err);
		}
	};

	const loadSubjects = async () => {
		try {
			const { data: enrollmentsData, error: enrollError } =
				await db.enrollments.getByStudent(currentUser.id);

			if (enrollError) throw enrollError;

			const subjectsData = enrollmentsData
				.map((e) => e.subject)
				.filter(Boolean);
			setSubjects(subjectsData);
		} catch (err) {
			console.error("Error loading subjects:", err);
			setError("Failed to load subjects");
		}
	};

	const loadMaterials = async () => {
		setLoadingMaterials(true);
		setError(null);
		try {
			const { data, error } = await db.materials.getBySubject(
				selectedSubject.id
			);

			if (error) throw error;

			const materialsWithContent = data.filter(
				(m) => m.file_url || m.description || m.instructions
			);

			setMaterials(materialsWithContent);

			if (materialsWithContent.length === 0) {
				setError("No materials with content found in this subject.");
			}
		} catch (err) {
			console.error("Error loading materials:", err);
			setError("Failed to load materials");
		} finally {
			setLoadingMaterials(false);
		}
	};

	const fetchMaterialContent = async (material) => {
		let content = "";

		if (material.description) content += material.description + "\n\n";
		if (material.instructions) content += material.instructions + "\n\n";

		if (material.file_url) {
			try {
				if (material.file_url.toLowerCase().includes(".pdf")) {
					if (window.pdfjsLib) {
						const response = await fetch(material.file_url);
						const blob = await response.blob();
						const file = new File(
							[blob],
							material.file_name || "document.pdf",
							{ type: "application/pdf" }
						);
						const pdfText = await extractTextFromPDF(file);
						content += pdfText;
					} else {
						content += `[PDF Content: ${material.file_name}]`;
					}
				} else if (
					material.file_url.includes(".txt") ||
					material.file_url.includes(".md")
				) {
					const response = await fetch(material.file_url);
					const text = await response.text();
					content += text;
				}
			} catch (err) {
				console.error("Error fetching file content:", err);
			}
		}

		return content.trim();
	};

	const handleGenerate = async () => {
		if (!selectedMaterial) {
			setError("Please select a material first");
			return;
		}

		setError(null);
		setIsGenerating(true);
		setFlashcards(null);
		setCurrentIndex(0);
		setIsFlipped(false);

		try {
			const materialContent = await fetchMaterialContent(selectedMaterial);

			if (!materialContent || materialContent.length < 50) {
				throw new Error(
					"Not enough content to generate flashcards. Please select a material with more content."
				);
			}

			const generatedCards = await generateFlashcardsFromContent(
				materialContent,
				selectedMaterial.title
			);

			setFlashcards(generatedCards);
		} catch (err) {
			console.error("Error generating flashcards:", err);
			setError(
				err.message || "Failed to generate flashcards. Please try again."
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const nextCard = () => {
		if (!flashcards) return;
		setIsFlipped(false);
		setTimeout(() => {
			setCurrentIndex((prev) => (prev + 1) % flashcards.length);
		}, 150);
	};

	const prevCard = () => {
		if (!flashcards) return;
		setIsFlipped(false);
		setTimeout(() => {
			setCurrentIndex(
				(prev) => (prev - 1 + flashcards.length) % flashcards.length
			);
		}, 150);
	};

	return (
		<div className="space-y-6">
			{/* Configuration Card */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
				<div className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
						<Layers className="text-classly-green" size={20} />
						Flashcard Generator
					</h3>

					{error && (
						<div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
							<AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
							<p className="text-sm text-red-600 font-medium">{error}</p>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
								<BookOpen size={16} className="text-gray-400" />
								Select Subject
							</label>
							<div className="relative">
								<select
									value={selectedSubject?.id || ""}
									onChange={(e) => {
										const subject = subjects.find(
											(s) => s.id === e.target.value
										);
										setSelectedSubject(subject);
										setSelectedMaterial(null);
										setFlashcards(null);
										setError(null);
									}}
									disabled={isGenerating}
									className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-classly-green focus:border-transparent outline-none appearance-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
								>
									<option value="">Choose a subject...</option>
									{subjects.map((subject) => (
										<option key={subject.id} value={subject.id}>
											{subject.code} - {subject.name}
										</option>
									))}
								</select>
								<ChevronRight
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none"
									size={16}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
								<GraduationCap size={16} className="text-gray-400" />
								Select Material
							</label>
							<div className="relative">
								<select
									value={selectedMaterial?.id || ""}
									onChange={(e) => {
										const material = materials.find(
											(m) => m.id === e.target.value
										);
										setSelectedMaterial(material);
										setFlashcards(null);
										setError(null);
									}}
									disabled={
										!selectedSubject || isGenerating || loadingMaterials
									}
									className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-classly-green focus:border-transparent outline-none appearance-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
								>
									<option value="">
										{loadingMaterials
											? "Loading materials..."
											: !selectedSubject
											? "Select a subject first"
											: "Choose a material..."}
									</option>
									{materials.map((material) => (
										<option key={material.id} value={material.id}>
											{material.title}
										</option>
									))}
								</select>
								<ChevronRight
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none"
									size={16}
								/>
							</div>
						</div>
					</div>

					<button
						onClick={handleGenerate}
						disabled={!selectedMaterial || isGenerating}
						className="w-full py-3.5 bg-classly-green text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
					>
						{isGenerating ? (
							<>
								<Loader2 className="animate-spin" size={20} />
								Analyzing & Creating Cards...
							</>
						) : (
							<>
								<Layers size={20} />
								Generate Flashcards
							</>
						)}
					</button>
				</div>
			</div>

			{flashcards && flashcards.length > 0 && (
				<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
					{/* Controls Header */}
					<div className="flex items-center justify-between mb-4 px-1">
						<h4 className="font-semibold text-gray-900">
							{selectedMaterial.title}
						</h4>
						<div className="flex bg-gray-100 p-1 rounded-lg">
							<button
								onClick={() => setViewMode("deck")}
								className={`p-1.5 rounded-md transition-all ${
									viewMode === "deck"
										? "bg-white shadow-xs text-classly-green"
										: "text-gray-500 hover:text-gray-700"
								}`}
								title="Deck View"
							>
								<Copy size={16} />
							</button>
							<button
								onClick={() => setViewMode("grid")}
								className={`p-1.5 rounded-md transition-all ${
									viewMode === "grid"
										? "bg-white shadow-xs text-classly-green"
										: "text-gray-500 hover:text-gray-700"
								}`}
								title="Grid View"
							>
								<LayoutGrid size={16} />
							</button>
						</div>
					</div>

					{viewMode === "deck" ? (
						/* Deck View (Study Mode) */
						<div className="max-w-2xl mx-auto">
							<div className="relative h-80 w-full [perspective:1000px] mb-6">
								<div
									className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] cursor-pointer ${
										isFlipped ? "[transform:rotateY(180deg)]" : ""
									}`}
									onClick={() => setIsFlipped(!isFlipped)}
								>
									{/* Front (Question) */}
									<div className="absolute inset-0 w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm [backface-visibility:hidden] flex flex-col items-center justify-center p-8 text-center hover:shadow-md transition-shadow">
										<span className="absolute top-4 left-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
											Question
										</span>
										<span className="absolute top-4 right-4 text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
											{currentIndex + 1} / {flashcards.length}
										</span>
										<p className="text-xl font-medium text-gray-800 leading-relaxed">
											{flashcards[currentIndex].question}
										</p>
										<p className="absolute bottom-6 text-sm text-gray-400 flex items-center gap-1.5">
											<RotateCw size={14} /> Click to flip
										</p>
									</div>

									{/* Back (Answer) */}
									<div className="absolute inset-0 w-full h-full bg-gray-50 rounded-2xl border border-classly-green/30 shadow-sm [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col items-center justify-center p-8 text-center">
										<span className="absolute top-4 left-4 text-xs font-semibold text-classly-green uppercase tracking-wider">
											Answer
										</span>
										<p className="text-lg text-gray-800 leading-relaxed">
											{flashcards[currentIndex].answer}
										</p>
									</div>
								</div>
							</div>

							{/* Navigation Controls */}
							<div className="flex items-center justify-center gap-6">
								<button
									onClick={prevCard}
									className="p-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors border border-transparent hover:border-gray-200"
								>
									<ChevronLeft size={24} />
								</button>

								<div className="w-full max-w-[200px] bg-gray-100 h-1.5 rounded-full overflow-hidden">
									<div
										className="bg-classly-green h-full transition-all duration-300"
										style={{
											width: `${
												((currentIndex + 1) / flashcards.length) * 100
											}%`,
										}}
									/>
								</div>

								<button
									onClick={nextCard}
									className="p-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors border border-transparent hover:border-gray-200"
								>
									<ChevronRight size={24} />
								</button>
							</div>
						</div>
					) : (
						/* Grid View */
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{flashcards.map((card, idx) => (
								<div
									key={idx}
									className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
								>
									<p className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
										Question {idx + 1}
									</p>
									<p className="font-medium text-gray-900 mb-4">
										{card.question}
									</p>
									<hr className="border-gray-100 my-3" />
									<p className="text-sm font-semibold text-classly-green mb-1 uppercase tracking-wider">
										Answer
									</p>
									<p className="text-gray-700">{card.answer}</p>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default FlashcardTab;
