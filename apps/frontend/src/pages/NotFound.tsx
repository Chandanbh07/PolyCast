import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span
        className="font-display text-7xl font-semibold tracking-[-0.04em] text-mist-50 sm:text-8xl"
        style={{ textShadow: "0 0 40px rgba(79,140,255,0.25)" }}
      >
        404
      </span>
      <p className="mt-4 text-mist-400">This market doesn't exist — at least, not yet.</p>
      <Button className="mt-6" asChild>
        <Link to="/">Back home</Link>
      </Button>
    </div>
  );
}