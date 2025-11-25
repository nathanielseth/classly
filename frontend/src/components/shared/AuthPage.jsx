import React, { useState } from "react";
import {
	Eye,
	EyeOff,
	AlertCircle,
	GraduationCap,
	School,
	ShieldCheck,
	ArrowRight,
} from "lucide-react";

const AuthPage = ({ onLogin, onRegister }) => {
	const [isLogin, setIsLogin] = useState(true);
	const [showPassword, setShowPassword] = useState(false);

	const [formData, setFormData] = useState({
		email: "",
		password: "",
		fullName: "",
		role: "student",
		rememberMe: false,
	});

	const isCvsuEmail = formData.email.toLowerCase().endsWith("@cvsu.edu.ph");
	const showEmailWarning =
		!isLogin &&
		formData.role === "student" &&
		formData.email.length > 0 &&
		!isCvsuEmail;

	const handleSubmit = (e) => {
		e.preventDefault();
		if (isLogin) {
			onLogin(formData.email, formData.password, formData.role);
		} else {
			onRegister(
				formData.email,
				formData.password,
				formData.role,
				formData.fullName
			);
		}
	};

	return (
		<div className="flex h-screen w-full font-sans overflow-hidden bg-gray-50">
			{/* LEFT SIDE - INTERACTIVE FORM */}
			<div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center px-6 sm:px-12 bg-white relative z-10">
				<div className="w-full max-w-md">
					{/* Header */}
					<div className="flex flex-col items-center text-center mb-8">
						<div className="w-12 h-12 rounded-2xl bg-classly-green text-white flex items-center justify-center shadow-lg shadow-classly-green/20 mb-4">
							<GraduationCap size={28} />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 tracking-tight">
							Classly
						</h1>
						<p className="text-gray-500 text-sm mt-2">
							The CvSU Bacoor Digital Learning Environment
						</p>
					</div>

					{/* Segmented Toggle (Tabs) */}
					<div className="p-1.5 bg-gray-100 rounded-xl flex items-center gap-1 mb-4 relative">
						<div
							className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${
								isLogin ? "left-1.5" : "left-[calc(50%+3px)]"
							}`}
						/>
						<button
							type="button"
							onClick={() => setIsLogin(true)}
							className={`flex-1 relative z-10 py-2 text-sm font-bold rounded-lg transition-colors duration-200 cursor-pointer ${
								isLogin ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
							}`}
						>
							Log In
						</button>
						<button
							type="button"
							onClick={() => setIsLogin(false)}
							className={`flex-1 relative z-10 py-2 text-sm font-bold rounded-lg transition-colors duration-200 cursor-pointer ${
								!isLogin ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
							}`}
						>
							Create Account
						</button>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="w-full">
						<div
							className={`transition-all duration-500 ease-in-out overflow-hidden ${
								!isLogin
									? "max-h-[400px] opacity-100 mb-4"
									: "max-h-0 opacity-0 mb-0"
							}`}
						>
							<div className="space-y-5 pt-1">
								{/* Role Selector */}
								<div>
									<label className="block text-sm font-bold text-gray-700 mb-2">
										I am a...
									</label>
									<div className="grid grid-cols-3 gap-3">
										{[
											{ id: "student", label: "Student", icon: GraduationCap },
											{ id: "instructor", label: "Instructor", icon: School },
											{ id: "admin", label: "Admin", icon: ShieldCheck },
										].map((role) => (
											<div
												key={role.id}
												onClick={() =>
													setFormData({ ...formData, role: role.id })
												}
												className={`cursor-pointer group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 active:scale-95 ${
													formData.role === role.id
														? "bg-classly-green border-classly-green text-white shadow-md shadow-classly-green/20"
														: "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
												}`}
											>
												<role.icon size={20} className="mb-1.5" />
												<span className="text-xs font-semibold">
													{role.label}
												</span>
											</div>
										))}
									</div>
								</div>

								{/* Full Name */}
								<div>
									<label className="block text-sm font-bold text-gray-700 mb-1.5">
										Full Name
									</label>
									<input
										type="text"
										placeholder="Enter your full name"
										className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 focus:outline-none transition-all placeholder:text-gray-400"
										value={formData.fullName}
										onChange={(e) =>
											setFormData({ ...formData, fullName: e.target.value })
										}
										required={!isLogin}
									/>
								</div>
							</div>
						</div>

						{/* STATIC SECTION: Email & Password */}
						<div className="space-y-5">
							{/* Email */}
							<div>
								<label className="block text-sm font-bold text-gray-700 mb-1.5">
									Email
								</label>
								<div className="relative">
									<input
										type="email"
										placeholder="Enter your email address"
										className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all placeholder:text-gray-400 ${
											showEmailWarning
												? "border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
												: "border-gray-300 focus:border-classly-green focus:ring-2 focus:ring-classly-green/20"
										}`}
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
										required
									/>

									{/* Warning Tooltip */}
									{showEmailWarning && (
										<div className="absolute right-3 top-1/2 -translate-y-1/2 group cursor-help">
											<AlertCircle size={20} className="text-amber-500" />
											<div className="absolute bottom-full right-0 mb-2 w-max max-w-[220px] p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
												Non-CvSU emails require admin verification.
												<div className="absolute top-full right-2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Password */}
							<div>
								<label className="block text-sm font-bold text-gray-700 mb-1.5">
									Password
								</label>
								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										placeholder="Enter password"
										className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 focus:outline-none transition-all placeholder:text-gray-400"
										value={formData.password}
										onChange={(e) =>
											setFormData({ ...formData, password: e.target.value })
										}
										required
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all cursor-pointer focus:outline-none"
									>
										{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
							</div>
						</div>

						{/* Footer Actions (Login Only) */}
						<div
							className={`grid transition-[grid-template-rows] duration-300 ease-out ${
								isLogin ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
							}`}
						>
							<div className="overflow-hidden">
								<div className="flex items-center justify-between pt-5 pb-1">
									<label className="flex items-center gap-2 cursor-pointer group select-none">
										<input
											type="checkbox"
											className="w-4 h-4 text-classly-green rounded border-gray-300 focus:ring-classly-green cursor-pointer"
											checked={formData.rememberMe}
											onChange={(e) =>
												setFormData({
													...formData,
													rememberMe: e.target.checked,
												})
											}
										/>
										<span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
											Remember me
										</span>
									</label>

									<a
										href="#"
										className="text-sm font-semibold text-classly-green hover:text-classly-dark hover:underline"
									>
										Forgot Password?
									</a>
								</div>
							</div>
						</div>

						{/* Main Action Button */}
						<button
							type="submit"
							className="mt-6 w-full py-3 px-4 rounded-xl bg-classly-green hover:bg-classly-dark text-white font-bold shadow-lg shadow-classly-green/30 hover:shadow-classly-green/40 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
						>
							<span>{isLogin ? "Log In" : "Create Account"}</span>
						</button>
					</form>
				</div>
			</div>

			{/* RIGHT SIDE - IMAGE */}
			<div className="hidden md:block w-1/2 h-full relative bg-classly-dark overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop"
					alt="University Campus"
					className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay hover:scale-105 transition-transform duration-[30s] ease-linear"
				/>
				<div className="absolute inset-0 bg-linear-to-br from-classly-dark/95 via-classly-dark/80 to-classly-green/90" />
				<div className="absolute inset-0 flex flex-col justify-center px-16 text-white z-20">
					<div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
						<GraduationCap size={36} className="text-white" />
					</div>
					<h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight tracking-tight">
						Elevate your <br />
						<span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-200 to-amber-400">
							Learning Journey
						</span>
					</h2>
					<p className="text-lg text-gray-200 max-w-md leading-relaxed font-light opacity-90">
						Welcome to the AI-Powered learning management system of Cavite State
						University Bacoor.
					</p>
				</div>
			</div>
		</div>
	);
};

export default AuthPage;
