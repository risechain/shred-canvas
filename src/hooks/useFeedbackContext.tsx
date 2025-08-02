import { useContext } from "react";
import { FeedbackContext } from "@/providers/FeedbackProvider";

export function useFeedbackContext() {
  const context = useContext(FeedbackContext);
  
  if (!context) {
    throw new Error("useFeedbackContext must be used within a FeedbackProvider");
  }
  
  return context;
}