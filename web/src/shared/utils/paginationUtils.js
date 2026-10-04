// Page buttons to render, e.g. [1, "gap", 4, 5, 6, "gap", 20] — never more than ~7 buttons.
export function pagerItems(page, pageCount) {
    const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
    const numbers = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

    return numbers.flatMap((n, i) => (i > 0 && n - numbers[i - 1] > 1 ? ["gap", n] : [n]));
}
