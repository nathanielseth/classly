import { createFileRoute } from "@tanstack/react-router";
import { listSubjects } from "@/lib/server/functions/subjects";
import { getUpcomingMaterials } from "@/lib/server/functions/materials";
import { StudentDashboardView } from "@/components/dashboard/StudentDashboardView";
import { InstructorDashboardView } from "@/components/dashboard/InstructorDashboardView";
import { AdminDashboardView } from "@/components/dashboard/AdminDashboardView";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async ({ context }) => {
    const { userState, queryClient } = context;
    if (userState.status !== "approved") return;

    const role = userState.profile.role;

    if (role === "student") {
      await Promise.all([
        queryClient.ensureQueryData({
          queryKey: ["subjects", "list", { includeArchived: false }],
          queryFn: () => listSubjects({ data: { includeArchived: false } }),
        }),
        queryClient.ensureQueryData({
          queryKey: ["materials", "upcoming"],
          queryFn: () => getUpcomingMaterials({ data: { limit: 5 } }),
        }),
      ]);
    } else if (role === "instructor") {
      await queryClient.ensureQueryData({
        queryKey: ["subjects", "list", { includeArchived: false }],
        queryFn: () => listSubjects({ data: { includeArchived: false } }),
      });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { userState } = Route.useRouteContext();

  if (userState.status !== "approved") return null;

  switch (userState.profile.role) {
    case "student":
      return <StudentDashboardView />;
    case "instructor":
      return <InstructorDashboardView />;
    case "admin":
      return <AdminDashboardView />;
  }
}
