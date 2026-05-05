type TableEmptyStateProps = {
  colSpan?: number;
  title?: string;
  description?: string;
};

export function TableEmptyState({
  colSpan = 999,
  title = "No data yet",
  description = "Once records are added, they will appear here.",
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "1.15rem 0.5rem" }}>
        <div
          style={{
            display: "grid",
            gap: 8,
            justifyItems: "center",
            textAlign: "center",
            padding: "1.35rem 1rem",
            borderRadius: 20,
            border: "1px dashed rgba(32, 180, 134, 0.35)",
            background:
              "linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(241, 248, 255, 0.92))",
            color: "#475569",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(32, 180, 134, 0.12)",
              color: "#0f766e",
              fontSize: "1.1rem",
              fontWeight: 800,
            }}
          >
            •
          </div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{title}</div>
          <div style={{ maxWidth: 480, lineHeight: 1.5, color: "#64748b" }}>{description}</div>
        </div>
      </td>
    </tr>
  );
}