import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

const SIZE = {
  sm:   { maxWidth: "480px",  maxHeight: "92vh", minHeight: "auto" },
  md:   { maxWidth: "680px",  maxHeight: "92vh", minHeight: "auto" },
  lg:   { maxWidth: "860px",  maxHeight: "92vh", minHeight: "auto" },
  xl:   { maxWidth: "90vw",   maxHeight: "92vh", minHeight: "70vh" },
  full: { maxWidth: "98vw",   maxHeight: "97vh", minHeight: "97vh" },
};

export default function Modal({ title, onClose, children, wide = false, size }) {
  const resolved = size ? SIZE[size] : wide ? SIZE.xl : SIZE.md;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col w-full
                   border border-gray-100 dark:border-slate-700"
        style={resolved}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       text-gray-400 dark:text-slate-500
                       hover:bg-gray-100 dark:hover:bg-slate-700
                       hover:text-gray-600 dark:hover:text-slate-300
                       transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-content overflow-y-auto px-8 py-7 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
