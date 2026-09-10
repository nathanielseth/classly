import { Clock } from "lucide-react";

import { signOut } from "@/lib/server/functions/auth-actions";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PendingApprovalScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    await router.invalidate();
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Card className="mx-4 w-full max-w-md text-center">
        <CardContent className="p-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-warning/10">
            <Clock className="size-7 text-warning" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Awaiting Approval
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Your account is pending admin approval. You'll get access once an
            admin reviews your registration.
          </p>
          <Button variant="link" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}