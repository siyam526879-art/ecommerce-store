"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <h2 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h2>
      <p className="text-gray-500 mb-6">
        The admin dashboard failed to load. This usually happens when the database is empty or missing required data.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
      >
        Try again
      </button>
    </div>
  );
}
