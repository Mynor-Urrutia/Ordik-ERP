import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

/**
 * <Tooltip text="Descripción del campo">
 *   <label>Campo</label>
 * </Tooltip>
 *
 * O como ícono standalone:
 * <Tooltip text="Descripción" icon />
 */
export default function Tooltip({ text, children, icon = false }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center gap-1"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {icon && (
        <FontAwesomeIcon
          icon={faCircleInfo}
          className="text-gray-400 dark:text-slate-500 text-xs cursor-help"
        />
      )}
      {visible && text && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                     px-2.5 py-1.5 text-xs font-normal leading-snug
                     bg-gray-900 dark:bg-slate-700 text-white rounded-lg shadow-lg
                     whitespace-nowrap pointer-events-none"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-slate-700" />
        </span>
      )}
    </span>
  );
}
