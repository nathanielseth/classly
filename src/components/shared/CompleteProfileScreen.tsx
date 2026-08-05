import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";

import { signOut } from "@/lib/server/functions/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "student" | "instructor";

interface CompleteProfileScreenProps {
  email: string;
  onComplete: (fullName: string, role: Role) => Promise<void>;
}

const ROLES: Array<{ id: Role; label: string }> = [
  { id: "student", label: "Student" },
  { id: "instructor", label: "Instructor" },
];

export function CompleteProfileScreen({
  email,
  onComplete,
}: CompleteProfileScreenProps) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await onComplete(fullName.trim(), role);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    await router.invalidate();
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Card className="mx-4 w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-float">
              <GraduationCap className="size-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Complete your profile
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>I am a...</Label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    aria-pressed={role === r.id}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-semibold transition-all",
                      role === r.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={saving || !fullName.trim()}
              size="lg"
              className="mt-2 w-full"
            >
              {saving ? <Loader2 className="animate-spin" /> : "Get Started"}
            </Button>

            <div className="text-center">
              <Button variant="link" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}