import type { CartItem } from "../../types";

interface Props {
  userEmail: string;
  cart: CartItem[];
  onSignOut: () => void;
  onClose: () => void;
}

export default function SettingsPanel({ userEmail, cart, onSignOut, onClose }: Props) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-border-light overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border-light">
          <h3 className="text-lg font-bold">Settings</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-black">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Account</p>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-neutral-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-neutral-400">person</span>
              </div>
              <div>
                <p className="text-sm font-bold text-black">{userEmail}</p>
                <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-tight">Member</p>
              </div>
            </div>
          </div>

          {/* Cart summary */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Cart</p>
            {cart.length === 0 ? (
              <p className="text-sm text-neutral-400">Your cart is empty.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3">
                    <img src={item.imageUrl} alt={item.name} className="size-10 rounded-lg object-cover border border-border-light" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-black truncate">{item.name}</p>
                      <p className="text-[10px] text-neutral-400">{item.size} · {item.color} · ×{item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold">₹{item.price.toLocaleString("en-IN")}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border-light">
                  <p className="text-sm font-bold">Total</p>
                  <p className="text-sm font-black">₹{total.toLocaleString("en-IN")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={onSignOut}
            className="w-full border border-black/10 text-black font-bold py-3 rounded-xl hover:bg-neutral-50 transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
