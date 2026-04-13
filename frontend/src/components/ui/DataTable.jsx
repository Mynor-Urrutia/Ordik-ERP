export default function DataTable({ columns, data, onEdit, onDelete, extra, loading, sortKey, sortDir, onSort }) {
  if (loading)
    return <div className="text-center py-12 text-gray-400 text-sm">Cargando…</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-700 text-white text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 font-medium whitespace-nowrap ${c.sortable && onSort ? "cursor-pointer select-none hover:bg-slate-600" : ""}`}
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
                    <span onClick={(e) => e.stopPropagation()}>
                      {c.filterSlot}
                    </span>
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
                className="text-center py-10 text-gray-400"
              >
                Sin registros
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                i % 2 === 0 ? "bg-white" : "bg-gray-50"
              }`}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2.5 whitespace-nowrap">
                  {c.render ? c.render(row) : (row[c.key] ?? "—")}
                </td>
              ))}
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Editar
                    </button>
                  )}
                  {extra && extra(row)}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row.id)}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
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
