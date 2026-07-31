import { useRouter } from "@tanstack/react-router";
import { signOut } from "@/lib/server/functions/auth-actions";

export function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      <span className="font-semibold text-gray-900">Classly</span>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </header>
  );
}
