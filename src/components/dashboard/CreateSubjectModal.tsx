import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateSubjectModalProps {
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    description: string;
    schedule: string;
    room: string;
  }) => Promise<unknown>;
  submitting: boolean;
  error: string | null;
}

export function CreateSubjectModal({
  onClose,
  onSubmit,
  submitting,
  error,
}: CreateSubjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [room, setRoom] = useState("");

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div>
            <DialogTitle>Create Subject</DialogTitle>
            <DialogDescription>
              A join code will be generated automatically
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="subject-name">Subject Name</Label>
            <Input
              id="subject-name"
              type="text"
              placeholder="e.g., Data Structures and Algorithms"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject-description">Description</Label>
            <Textarea
              id="subject-description"
              placeholder="Brief description of the subject"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subject-schedule">Schedule</Label>
              <Input
                id="subject-schedule"
                type="text"
                placeholder="MWF 9-10am"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject-room">Room</Label>
              <Input
                id="subject-room"
                type="text"
                placeholder="Room 204"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim(),
                schedule: schedule.trim(),
                room: room.trim(),
              })
            }
            disabled={!canSubmit}
            className="flex-1"
          >
            {submitting ? "Creating..." : "Create Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}