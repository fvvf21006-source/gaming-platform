// CSV & PDF Export Helper Utilities

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
): void {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const columns = headers ?? Object.keys(data[0]).map((key) => ({ key, label: key }));

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Anti-CSV Formula Injection: Prefix formula triggers with a single quote '
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerRow = columns.map((c) => escapeCSV(c.label)).join(",");
  const bodyRows = data.map((item) => columns.map((c) => escapeCSV(item[c.key])).join(","));

  const csvContent = "\uFEFF" + [headerRow, ...bodyRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrintReport(): void {
  window.print();
}
