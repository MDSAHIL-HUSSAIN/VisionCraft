import { useEffect, useRef, useState } from "react";
import {
  loadVersionHistory,
  restoreVersionToCanvas,
  saveAsNewVersion,
  DesignVersion,
} from "../features/versionService";

const FeedPage = () => {
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const didLoadRef = useRef(false);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    const data = await loadVersionHistory();
    setVersions(data);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveAsNewVersion();
    if (result.success) {
      await loadVersions();
    } else {
      alert(result.error);
    }
    setSaving(false);
  };

  const handleRestore = async (v: number) => {
    setRestoring(v);
    try {
      await restoreVersionToCanvas(v);
      alert(`Version ${v} restored`);
    } catch {
      alert("Restore failed");
    }
    setRestoring(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin h-6 w-6 border-b-2 border-gray-700 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#F26C63] hover:bg-[#E85B53] text-white py-3 rounded-xl font-semibold disabled:opacity-60"
      >
        {saving ? "Saving…" : "+ Create New Version"}
      </button>

      <div className="bg-white rounded-2xl border border-[#EAEAEA] p-5">
        {versions.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            No versions saved yet
          </p>
        )}

        {versions.map((v) => (
          <div
            key={v.id}
            className="flex justify-between items-center py-3 border-b last:border-b-0"
          >
            <div>
              <p className="font-semibold">V{v.versionNumber}</p>
              <p className="text-xs text-gray-500">
                {v.commitMessage || "No message"}
              </p>
            </div>

            <button
              onClick={() => handleRestore(v.versionNumber)}
              disabled={restoring === v.versionNumber}
              className="text-[#FF6A6A] font-medium disabled:opacity-50"
            >
              {restoring === v.versionNumber ? "Restoring…" : "Restore"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedPage;
