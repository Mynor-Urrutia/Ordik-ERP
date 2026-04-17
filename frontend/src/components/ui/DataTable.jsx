import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faInbox } from "@fortawesome/free-solid-svg-icons";

function SkeletonRow({ cols }) {
  return (
    <tr className="border-b border-gray-100 dark:border-slate-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-16" />
      </td>
    </tr>
  );
}

export default function DataTable({ columns, data, onEdit, onDelete, extra, loading, sortKey, sortDir, onSort }) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700 dark:bg-slate-800 text-white text-left">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-700 dark:bg-slate-800 text-white text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 font-medium whitespace-nowrap ${
                  c.sortable && onSort ? "cursor-pointer select-none hover:bg-slate-600" : ""
                }`}
                onClick={c.sortable && onSort ? () => onSort(c.key) : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable && onSort && (
                      <span className="text-xs opacity-60">
                        {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    )}
                  </span>
                  {c.filterSlot && (
                    <span onClick={(e) => e.stopPropagation()}>{c.filterSlot}</span>
                  )}
                </div>
              </th>
            ))}
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-14 text-gray-400 dark:text-slate-500"
              >
                <FontAwesomeIcon icon={faInbox} className="text-4xl mb-2 block mx-auto opacity-30" />
                <span className="text-sm">Sin registros</span>
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-gray-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors ${
                i % 2 === 0
                  ? "bg-white dark:bg-slate-800"
                  : "bg-gray-50 dark:bg-slate-800/70"
              }`}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2.5 whitespace-nowrap text-gray-700 dark:text-slate-300">
                  {c.render ? c.render(row) : (row[c.key] ?? "—")}
                </td>
              ))}
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      title="Editar"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                                 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400
                                 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPen} />
                      Editar
                    </button>
                  )}
                  {extra && extra(row)}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row.id)}
                      title="Eliminar"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                                 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400
                                 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Eliminar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
