import { XCircle } from "lucide-react";

import { signOut } from "@/lib/server/functions/auth-actions";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RejectedScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    await router.invalidate();
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Card className="mx-4 w-full max-w-md text-center">
        <CardContent className="p-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="size-7 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Account Rejected
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Your account registration was not approved. Contact your
            administrator for more information.
          </p>
          <Button variant="link" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}