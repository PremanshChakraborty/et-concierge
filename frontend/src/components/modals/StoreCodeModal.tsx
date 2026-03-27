import { useState } from "react";
import type { StoreDetails } from "../../types";

interface Props {
  onConfirm: (details: StoreDetails) => void;
  onClose: () => void;
  validateCode: (code: string) => Promise<StoreDetails>;
}

export default function StoreCodeModal({ onConfirm, onClose, validateCode }: Props) {
  const [code, setCode]           = useState("");
  const [preview, setPreview]     = useState<StoreDetails | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true); setPreview(null);
    try {
      const details = await validateCode(code);
      setPreview(details);
    } catch {
      setError("Invalid store code. Please try again.");
    } finally { setLoading(false); }
  }

  function handleConfirm() {
    if (preview) onConfirm(preview);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-border-light">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Enter Store Code</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-black">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-5">
          Unlock exclusive in-store inventory by entering your store code.
        </p>

        {/* Input */}
        <form onSubmit={handleValidate} className="space-y-3">
          <input
            type="text"
            value={code}
            maxLength={10}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. STR-001"
            className="w-full px-4 py-3 rounded-xl border border-border-light focus:border-black outline-none transition-all uppercase font-medium tracking-wider text-sm"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* Store preview */}
          {preview && (
            <div className="bg-surface-light rounded-xl border border-border-light p-4 space-y-1">
              <p className="text-sm font-bold text-black">{preview.storeName}</p>
              <p className="text-xs text-neutral-500">{preview.address}</p>
              <p className="text-xs text-neutral-500">{preview.hours}</p>
            </div>
          )}

          {!preview ? (
            <button
              type="submit"
              disabled={loading || code.length < 3}
              className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              {loading ? "Validating..." : "Connect to Store"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full premium-gradient-horizontal text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all"
            >
              Switch to Store Mode
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
