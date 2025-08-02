import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Button } from "@/components/ui";

interface UsernameDialogProps {
  isOpen: boolean;
  onSubmit: (username: string) => Promise<boolean | undefined>;
}

export function UsernameDialog({ isOpen, onSubmit }: UsernameDialogProps) {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("[UsernameDialog] Dialog isOpen:", isOpen);

  const handleSubmit = async () => {
    console.log("[UsernameDialog] handleSubmit called with username:", username);
    
    if (!username.trim()) {
      console.log("[UsernameDialog] Empty username, returning");
      setError("Please enter a username");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      console.log("[UsernameDialog] Submitting username:", username.trim());
      const success = await onSubmit(username.trim());
      console.log("[UsernameDialog] Username submitted successfully:", success);
      if (success) {
        // Clear the username field after successful registration
        setUsername("");
        setError(null);
      } else {
        setError("Failed to register username. Please try again.");
      }
    } catch (error) {
      console.error("[UsernameDialog] Error submitting username:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      // Prevent closing the dialog while submitting
      if (!isSubmitting && isOpen) {
        console.log("[UsernameDialog] Dialog close prevented - registration required");
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Your Username</DialogTitle>
          <DialogDescription>
            You need to register a username before sending messages. This will be stored onchain.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && username.trim() && !isSubmitting) {
                  handleSubmit();
                }
              }}
              disabled={isSubmitting}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={!username.trim() || isSubmitting}
          >
            {isSubmitting ? "Registering..." : "Register Username"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}