export default function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div
        className={`bg-white rounded-xl shadow-2xl flex flex-col w-full`}
        style={{
          maxWidth: wide ? "90vw" : "680px",
          maxHeight: "92vh",
          minHeight: wide ? "70vh" : "auto",
        }}
      >
        <div className="flex items-center justify-between px-8 py-5 border-b shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="modal-content overflow-y-auto px-8 py-7 flex-1">{children}</div>
      </div>
    </div>
  );
}
