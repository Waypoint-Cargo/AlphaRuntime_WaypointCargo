import { pagerItems } from "@/shared/utils/paginationUtils";

// ‹ 1 … 4 5 6 … 20 › — styled by the shared `.pager` rules in App.css.
export default function Pager({ page, pageCount, onPage }) {
  return (
    <div className="pager">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
      {pagerItems(page, pageCount).map((item, i) => (
        item === "gap"
          ? <span key={`gap-${i}`} className="pager-gap" aria-hidden="true">…</span>
          : (
            <button
              type="button" key={item} className={item === page ? "on" : ""}
              aria-label={`Page ${item}`} aria-current={item === page ? "page" : undefined}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          )
      ))}
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">›</button>
    </div>
  );
}
