import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
});

export const auth = {
	signUp: async ({ email, password, fullName, role }) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName,
					role: role,
				},
			},
		});
		return { data, error };
	},

	signIn: async ({ email, password }) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { data, error };
	},

	signOut: async () => {
		const { error } = await supabase.auth.signOut();
		return { error };
	},

	sendMagicLink: async (email) => {
		const { data, error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				shouldCreateUser: true,
			},
		});
		return { data, error };
	},

	getSession: async () => {
		const { data, error } = await supabase.auth.getSession();
		return { data, error };
	},

	getUser: async () => {
		const { data, error } = await supabase.auth.getUser();
		return { data, error };
	},
};

// ============================================
// STORAGE HELPERS
// ============================================

export const storage = {
	upload: async (bucket, path, file, options = {}) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.upload(path, file, {
				cacheControl: "3600",
				upsert: false,
				...options,
			});
		return { data, error };
	},

	getPublicUrl: (bucket, path) => {
		const { data } = supabase.storage.from(bucket).getPublicUrl(path);
		return data.publicUrl;
	},

	delete: async (bucket, paths) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.remove(Array.isArray(paths) ? paths : [paths]);
		return { data, error };
	},

	list: async (bucket, path = "", options = {}) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.list(path, options);
		return { data, error };
	},

	download: async (bucket, path) => {
		const { data, error } = await supabase.storage.from(bucket).download(path);
		return { data, error };
	},

	createSignedUrl: async (bucket, path, expiresIn = 3600) => {
		const { data, error } = await supabase.storage
			.from(bucket)
			.createSignedUrl(path, expiresIn);
		return { data, error };
	},
};
