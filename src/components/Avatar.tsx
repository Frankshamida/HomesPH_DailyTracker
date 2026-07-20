"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  url: string | null;
  fullName: string;
  size?: number;
  editable?: boolean;
  onUploaded?: (url: string) => void;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

export default function Avatar({
  userId,
  url,
  fullName,
  size = 96,
  editable = false,
  onUploaded,
}: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() });
      if (profErr) throw profErr;

      onUploaded?.(publicUrl);
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-full ring-4 ring-white shadow-lg overflow-hidden bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold select-none"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span>{initials(fullName)}</span>
        )}

        {editable && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="Change photo"
            className="absolute inset-0 bg-black/0 hover:bg-black/40 transition flex items-center justify-center opacity-0 hover:opacity-100"
          >
            <span className="text-white text-sm font-semibold">
              {uploading ? "…" : "📷 Edit"}
            </span>
          </button>
        )}
      </div>

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </>
      )}
    </div>
  );
}
