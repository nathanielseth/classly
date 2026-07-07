import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	Search,
	Send,
	MessageSquare,
	ArrowLeft,
	Loader2,
	Users,
} from "lucide-react";
import { db, subscriptions } from "../../lib/supabase";
import { supabase } from "../../lib/supabase/client";

const MessagesView = ({ userId, userRole }) => {
	const [tab, setTab] = useState("dms");
	const [conversations, setConversations] = useState([]);
	const [groupConversations, setGroupConversations] = useState([]);
	const [activeConversation, setActiveConversation] = useState(null);
	const [activeType, setActiveType] = useState(null); // "dm" | "group"
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [searching, setSearching] = useState(false);
	const [showSearch, setShowSearch] = useState(false);
	const [loadingConvos, setLoadingConvos] = useState(true);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [sending, setSending] = useState(false);
	const [groupMembers, setGroupMembers] = useState([]);
	const [showMembers, setShowMembers] = useState(false);
	const messagesEndRef = useRef(null);
	const channelRef = useRef(null);
	const inputRef = useRef(null);

	// ============================================
	// LOAD CONVERSATIONS
	// ============================================
	const loadConversations = useCallback(async () => {
		setLoadingConvos(true);
		const [{ data: dms }, { data: groups }] = await Promise.all([
			db.conversations.getAll(userId),
			db.groupConversations.getForUser(userId, userRole),
		]);
		setConversations(dms || []);
		setGroupConversations(groups || []);
		setLoadingConvos(false);
	}, [userId, userRole]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		loadConversations();
	}, [loadConversations]);

	// ============================================
	// LOAD MESSAGES
	// ============================================
	useEffect(() => {
		if (!activeConversation) return;

		const load = async () => {
			setLoadingMessages(true);
			if (activeType === "dm") {
				const { data } = await db.messages.getByConversation(
					activeConversation.id,
				);
				setMessages(data || []);
				await db.messages.markRead(activeConversation.id, userId);
			} else {
				const { data } = await db.groupMessages.getByConversation(
					activeConversation.id,
				);
				setMessages(data || []);
				if (activeConversation.id) {
					const { data: members } = await db.groupConversations.getMembers(
						activeConversation.id,
					);
					setGroupMembers(members || []);
				}
			}
			setLoadingMessages(false);
		};

		load();

		if (channelRef.current) subscriptions.unsubscribe(channelRef.current);

		if (activeType === "dm") {
			channelRef.current = subscriptions.subscribeToMessages(
				activeConversation.id,
				() => {
					db.messages
						.getByConversation(activeConversation.id)
						.then(({ data: msgs }) => {
							setMessages(msgs || []);
						});
				},
			);
		} else {
			channelRef.current = subscriptions.subscribeToGroupMessages(
				activeConversation.id,
				() => {
					db.groupMessages
						.getByConversation(activeConversation.id)
						.then(({ data: msgs }) => {
							setMessages(msgs || []);
						});
				},
			);
		}

		return () => {
			if (channelRef.current) subscriptions.unsubscribe(channelRef.current);
		};
	}, [activeConversation, activeType, userId]);

	// Scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// ============================================
	// SEARCH USERS (DMs only)
	// ============================================
	useEffect(() => {
		if (!searchQuery.trim()) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSearchResults([]);
			return;
		}
		const timer = setTimeout(async () => {
			setSearching(true);
			const { data: results } = await supabase
				.from("profiles")
				.select("id, full_name, email, role")
				.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
				.neq("id", userId)
				.eq("status", "approved")
				.limit(8);
			setSearchResults(results || []);
			setSearching(false);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery, userId]);

	// ============================================
	// HANDLERS
	// ============================================
	const handleSelectUser = async (otherUser) => {
		setShowSearch(false);
		setSearchQuery("");
		setSearchResults([]);
		const { data: convo, error } = await db.conversations.getOrCreate(
			userId,
			otherUser.id,
		);
		if (error || !convo) return;
		setActiveConversation({ ...convo, otherUser });
		setActiveType("dm");
		await loadConversations();
	};

	const handleSelectDM = (convo) => {
		const other =
			convo.participant_one_profile?.id === userId
				? convo.participant_two_profile
				: convo.participant_one_profile;
		setActiveConversation({ ...convo, otherUser: other });
		setActiveType("dm");
	};

	const handleSelectGroup = (convo) => {
		setActiveConversation(convo);
		setActiveType("group");
		setShowMembers(false);
	};

	const handleSend = async () => {
		if (!newMessage.trim() || !activeConversation || sending) return;
		const content = newMessage.trim();
		setNewMessage("");
		setSending(true);

		if (activeType === "dm") {
			const { data, error } = await db.messages.send(
				activeConversation.id,
				userId,
				content,
			);
			if (!error && data) {
				setMessages((prev) => [...prev, data]);
				loadConversations();
			}
		} else {
			const { data, error } = await db.groupMessages.send(
				activeConversation.id,
				userId,
				content,
			);
			if (!error && data) {
				setMessages((prev) => [...prev, data]);
				loadConversations();
			}
		}

		setSending(false);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	// ============================================
	// HELPERS
	// ============================================
	const getLastMessage = (convo, isGroup = false) => {
		const msgs = isGroup ? convo.group_messages : convo.messages;
		if (!msgs || msgs.length === 0) return "No messages yet";
		const last = msgs[msgs.length - 1];
		return last.content.length > 40
			? last.content.slice(0, 40) + "..."
			: last.content;
	};

	const formatTime = (ts) => {
		if (!ts) return "";
		const date = new Date(ts);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		return isToday
			? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
			: date.toLocaleDateString([], { month: "short", day: "numeric" });
	};

	const getInitial = (name) => name?.charAt(0).toUpperCase() || "?";

	const roleColor = {
		student: "bg-blue-100 text-blue-700",
		instructor: "bg-purple-100 text-purple-700",
		admin: "bg-red-100 text-red-700",
	};

	const isActiveConvo = (id) => activeConversation?.id === id;

	// ============================================
	// CHAT HEADER INFO
	// ============================================
	const getChatName = () => {
		if (!activeConversation) return "";
		if (activeType === "dm") return activeConversation.otherUser?.full_name;
		return activeConversation.subject?.name || activeConversation.name;
	};

	const getChatSub = () => {
		if (!activeConversation) return "";
		if (activeType === "dm") return activeConversation.otherUser?.email;
		return activeConversation.subject?.code || "Group Chat";
	};

	// ============================================
	// RENDER
	// ============================================
	return (
		<div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>
			{/* LEFT PANEL */}
			<div
				className={`flex flex-col border-r border-gray-200 bg-white transition-all ${
					activeConversation
						? "hidden md:flex w-80 shrink-0"
						: "flex w-full md:w-80 md:shrink-0"
				}`}
			>
				{/* Tabs */}
				<div className="flex border-b border-gray-100">
					<button
						onClick={() => {
							setTab("dms");
							setActiveConversation(null);
						}}
						className={`flex-1 py-3 text-sm font-medium transition-colors ${
							tab === "dms"
								? "text-classly-green border-b-2 border-classly-green"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						Direct
					</button>
					<button
						onClick={() => {
							setTab("groups");
							setActiveConversation(null);
						}}
						className={`flex-1 py-3 text-sm font-medium transition-colors ${
							tab === "groups"
								? "text-classly-green border-b-2 border-classly-green"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						Groups
					</button>
				</div>

				{/* DM Header */}
				{tab === "dms" && (
					<div className="p-3 border-b border-gray-50">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
								Messages
							</span>
							<button
								onClick={() => setShowSearch(!showSearch)}
								className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
								title="New message"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M12 5v14M5 12h14" />
								</svg>
							</button>
						</div>
						{showSearch && (
							<div className="relative">
								<Search
									size={14}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
								/>
								<input
									autoFocus
									type="text"
									placeholder="Search people..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green"
								/>
								{(searchResults.length > 0 || searching) && (
									<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
										{searching ? (
											<div className="flex items-center justify-center py-4">
												<Loader2
													size={16}
													className="animate-spin text-gray-400"
												/>
											</div>
										) : (
											searchResults.map((user) => (
												<button
													key={user.id}
													onClick={() => handleSelectUser(user)}
													className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
												>
													<div className="w-8 h-8 rounded-full bg-classly-green flex items-center justify-center text-white text-sm font-semibold shrink-0">
														{getInitial(user.full_name)}
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-gray-900 truncate">
															{user.full_name}
														</p>
														<p className="text-xs text-gray-500 truncate">
															{user.email}
														</p>
													</div>
													<span
														className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user.role]}`}
													>
														{user.role}
													</span>
												</button>
											))
										)}
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* Conversation List */}
				<div className="flex-1 overflow-y-auto">
					{loadingConvos ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 size={20} className="animate-spin text-gray-400" />
						</div>
					) : tab === "dms" ? (
						conversations.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
								<MessageSquare size={28} className="text-gray-300 mb-2" />
								<p className="text-sm text-gray-500">No messages yet</p>
								<p className="text-xs text-gray-400 mt-1">
									Press + to start one
								</p>
							</div>
						) : (
							conversations.map((convo) => {
								const other =
									convo.participant_one_profile?.id === userId
										? convo.participant_two_profile
										: convo.participant_one_profile;
								return (
									<button
										key={convo.id}
										onClick={() => handleSelectDM(convo)}
										className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 transition-colors ${
											isActiveConvo(convo.id)
												? "bg-classly-green/5 border-l-2 border-l-classly-green"
												: ""
										}`}
									>
										<div className="w-10 h-10 rounded-full bg-classly-green flex items-center justify-center text-white font-semibold shrink-0">
											{getInitial(other?.full_name)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between">
												<p className="text-sm font-medium text-gray-900 truncate">
													{other?.full_name}
												</p>
												<span className="text-xs text-gray-400 ml-2">
													{formatTime(convo.last_message_at)}
												</span>
											</div>
											<p className="text-xs text-gray-500 truncate mt-0.5">
												{getLastMessage(convo)}
											</p>
										</div>
									</button>
								);
							})
						)
					) : groupConversations.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
							<Users size={28} className="text-gray-300 mb-2" />
							<p className="text-sm text-gray-500">No group chats yet</p>
							<p className="text-xs text-gray-400 mt-1">
								Groups are created automatically when a subject is made
							</p>
						</div>
					) : (
						groupConversations.map((convo) => (
							<button
								key={convo.id}
								onClick={() => handleSelectGroup(convo)}
								className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 transition-colors ${
									isActiveConvo(convo.id)
										? "bg-classly-green/5 border-l-2 border-l-classly-green"
										: ""
								}`}
							>
								<div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
									{getInitial(convo.subject?.name || convo.name)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between">
										<p className="text-sm font-medium text-gray-900 truncate">
											{convo.subject?.name || convo.name}
										</p>
										<span className="text-xs text-gray-400 ml-2">
											{formatTime(convo.last_message_at)}
										</span>
									</div>
									<p className="text-xs text-gray-500 truncate mt-0.5">
										{convo.subject?.code && (
											<span className="text-purple-500 font-medium mr-1">
												{convo.subject.code}
											</span>
										)}
										{getLastMessage(convo, true)}
									</p>
								</div>
							</button>
						))
					)}
				</div>
			</div>

			{/* RIGHT PANEL — Chat */}
			{activeConversation ? (
				<div className="flex flex-col flex-1 bg-white min-w-0">
					{/* Chat Header */}
					<div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
						<button
							onClick={() => setActiveConversation(null)}
							className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500"
						>
							<ArrowLeft size={18} />
						</button>
						<div
							className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${
								activeType === "group" ? "bg-purple-500" : "bg-classly-green"
							}`}
						>
							{activeType === "group"
								? getInitial(
										activeConversation.subject?.name || activeConversation.name,
									)
								: getInitial(activeConversation.otherUser?.full_name)}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold text-gray-900">
								{getChatName()}
							</p>
							<p className="text-xs text-gray-500">{getChatSub()}</p>
						</div>
						{activeType === "group" && (
							<button
								onClick={() => setShowMembers(!showMembers)}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
							>
								<Users size={14} />
								{groupMembers.length}
							</button>
						)}
						{activeType === "dm" && activeConversation.otherUser?.role && (
							<span
								className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[activeConversation.otherUser.role]}`}
							>
								{activeConversation.otherUser.role}
							</span>
						)}
					</div>

					<div className="flex flex-1 overflow-hidden">
						{/* Messages */}
						<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
							{loadingMessages ? (
								<div className="flex items-center justify-center py-12">
									<Loader2 size={20} className="animate-spin text-gray-400" />
								</div>
							) : messages.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full text-center">
									<MessageSquare size={28} className="text-gray-300 mb-2" />
									<p className="text-sm text-gray-400">
										{activeType === "group"
											? `Welcome to ${getChatName()}!`
											: `Say hi to ${activeConversation.otherUser?.full_name}`}
									</p>
								</div>
							) : (
								messages.map((msg) => {
									const isMe = msg.sender_id === userId;
									return (
										<div
											key={msg.id}
											className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
										>
											{!isMe && (
												<div className="w-7 h-7 rounded-full bg-classly-green flex items-center justify-center text-white text-xs font-semibold shrink-0">
													{getInitial(msg.sender?.full_name)}
												</div>
											)}
											<div
												className={`max-w-xs lg:max-w-md ${!isMe && activeType === "group" ? "" : ""}`}
											>
												{!isMe && activeType === "group" && (
													<p className="text-xs text-gray-500 mb-1 ml-1">
														{msg.sender?.full_name}
													</p>
												)}
												<div
													className={`px-4 py-2.5 rounded-2xl text-sm ${
														isMe
															? "bg-classly-green text-white rounded-br-sm"
															: "bg-gray-100 text-gray-900 rounded-bl-sm"
													}`}
												>
													<p className="leading-relaxed wrap-break-word">
														{msg.content}
													</p>
													<p
														className={`text-xs mt-1 ${isMe ? "text-white/70" : "text-gray-400"}`}
													>
														{formatTime(msg.created_at)}
													</p>
												</div>
											</div>
										</div>
									);
								})
							)}
							<div ref={messagesEndRef} />
						</div>

						{/* Members Panel */}
						{showMembers && activeType === "group" && (
							<div className="w-56 border-l border-gray-200 bg-gray-50 flex flex-col shrink-0">
								<div className="p-3 border-b border-gray-200">
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
										Members ({groupMembers.length})
									</p>
								</div>
								<div className="flex-1 overflow-y-auto p-2 space-y-1">
									{groupMembers.map((m) => (
										<div
											key={m.id}
											className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
										>
											<div className="w-7 h-7 rounded-full bg-classly-green flex items-center justify-center text-white text-xs font-semibold shrink-0">
												{getInitial(m.profile?.full_name)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-xs font-medium text-gray-800 truncate">
													{m.profile?.full_name}
												</p>
												{m.is_admin && (
													<p className="text-[10px] text-purple-500 font-medium">
														Instructor
													</p>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Input */}
					<div className="px-4 py-3 border-t border-gray-200 shrink-0">
						<div className="flex items-end gap-2">
							<textarea
								ref={inputRef}
								value={newMessage}
								onChange={(e) => setNewMessage(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Type a message... (Enter to send)"
								rows={1}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none transition-all"
								style={{ minHeight: "42px", maxHeight: "120px" }}
								onInput={(e) => {
									e.target.style.height = "auto";
									e.target.style.height =
										Math.min(e.target.scrollHeight, 120) + "px";
								}}
							/>
							<button
								onClick={handleSend}
								disabled={!newMessage.trim() || sending}
								className="p-2.5 bg-classly-green text-white rounded-xl hover:bg-classly-green/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
							>
								{sending ? (
									<Loader2 size={18} className="animate-spin" />
								) : (
									<Send size={18} />
								)}
							</button>
						</div>
					</div>
				</div>
			) : (
				<div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50 text-center">
					<MessageSquare size={40} className="text-gray-300 mb-3" />
					<p className="text-gray-500 font-medium">Select a conversation</p>
					<p className="text-sm text-gray-400 mt-1">
						{tab === "dms"
							? "or press + to start a new one"
							: "Groups appear here when you're enrolled in a subject"}
					</p>
				</div>
			)}
		</div>
	);
};

export default MessagesView;