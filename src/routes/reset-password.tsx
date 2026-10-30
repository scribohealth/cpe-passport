import { createFileRoute } from "@tanstack/react-router";
import { Portal } from "../ui/Portal";
export const Route = createFileRoute("/reset-password")({
  component: () => <Portal resetPassword />,
});
