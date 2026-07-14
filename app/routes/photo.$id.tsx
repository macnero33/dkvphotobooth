import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "~/components/ui/button";

export function meta() {
  return [
    { title: "Your Photo Strip | DKV Receipt" },
    { name: "description", content: "Download your photobooth photo strip" },
  ];
}

export default function PhotoRetrieval() {
  const { id } = useParams<{ id: string }>();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErrorMessage("Invalid photo ID.");
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const bucket = import.meta.env.VITE_STORAGE_BUCKET || "photo-strips";

    if (!supabaseUrl || !supabaseAnonKey) {
      setLoading(false);
      setErrorMessage("Supabase configuration is missing.");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const filePath = id;

    const fetchUrl = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60);

      if (error || !data?.signedUrl) {
        const publicUrl = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath)
          .data?.publicUrl;

        if (publicUrl) {
          setImageUrl(publicUrl);
        } else {
          setErrorMessage(
            error?.message ||
              "Could not load photo. The file may have been deleted or the bucket is not accessible."
          );
        }
      } else {
        setImageUrl(data.signedUrl);
      }

      setLoading(false);
    };

    fetchUrl();
  }, [id]);

  const handleDownload = () => {
    if (!imageUrl) return;

    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `photobooth-${id?.split("/").pop()}.jpg`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Photo Strip",
          text: "Check out my photobooth photo strip!",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch {
      alert("Unable to share this link.");
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Photo Not Found</h1>
          <p className="text-xl text-gray-400">Invalid photo ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        <div className="text-center text-gray-800 space-y-2">
          <h1 className="text-4xl font-bold">Your Photo Strip</h1>
          <p className="text-xl text-gray-500">DKV Receipt Photobooth</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-2xl min-h-[320px] flex items-center justify-center">
          {loading ? (
            <div className="text-center text-slate-900">
              <p className="text-2xl font-semibold">Loading photo...</p>
            </div>
          ) : errorMessage ? (
            <div className="text-center text-slate-900">
              <p className="text-2xl font-semibold">Unable to load photo</p>
              <p className="text-lg text-slate-600 mt-4">{errorMessage}</p>
            </div>
          ) : (
            <img
              src={imageUrl ?? ""}
              alt="Your photobooth strip"
              className="w-full h-auto rounded-lg shadow-lg max-h-screen object-contain"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTA4MCIgaGVpZ2h0PSIxOTIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDA lIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSI0OCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==";
              }}
            />
          )}
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleDownload}
            size="lg"
            className="flex-1 text-lg py-6 bg-gray-800 text-white hover:bg-gray-700 hover:scale-105 transition-all duration-300 rounded-full shadow-xl"
            disabled={!imageUrl || loading}
          >
            📥 Download
          </Button>

          <Button
            onClick={handleShare}
            size="lg"
            variant="outline"
            className="flex-1 text-lg py-6 border-gray-400 text-gray-700 hover:bg-gray-100 rounded-full"
          >
            📤 Share
          </Button>
        </div>

        <div className="text-center text-gray-500 text-sm space-y-1">
          <p>• The QR contains the same page link.</p>
          <p>• If the photo has expired, it may no longer be available.</p>
        </div>

        <div className="text-center text-gray-400 text-xs pt-4">
          <p>Powered by DKV Receipt Photobooth</p>
        </div>
      </div>
    </div>
  );
}
