(() => {
  const assetRoot = new URL('./vendor/', document.currentScript.src);
  let dependencies;

  function loadScript(file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(file, assetRoot).href;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error(`Could not load ${file}`));
      };
      document.head.append(script);
    });
  }

  function loadDependencies() {
    if (!dependencies) {
      dependencies = (async () => {
        if (!window.jspdf) await loadScript('jspdf.umd.min.js');
        if (!window.jspdf.jsPDF.API.autoTable) await loadScript('jspdf.plugin.autotable.min.js');
        if (!window.tripPdfFont) await loadScript('manrope-pdf-font.js');
      })().catch(error => {
        dependencies = undefined;
        throw error;
      });
    }
    return dependencies;
  }

  function cellText(cell) {
    const read = node => {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return '';
      if (node.matches('script, style, button, summary, [aria-hidden="true"], .material-symbols-rounded')) return '';
      if (node.tagName === 'BR') return '\n';
      const text = [...node.childNodes].map(read).join('');
      return /^(DIV|P|LI|B|STRONG|SPAN|DETAILS|A)$/.test(node.tagName) ? `${text}\n` : text;
    };
    return read(cell).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  window.downloadTripTables = async tables => {
    if (!tables.length) throw new Error('No itinerary tables found');
    // Capture only table cells, including expanded details, independently of the active tab.
    const content = tables.map(table => ({
      head: [...table.querySelectorAll('thead tr')].map(row => [...row.children].map(cellText)),
      body: [...table.querySelectorAll('tbody tr')].map(row => [...row.children].map(cellText))
    }));
    await loadDependencies();
    const pdf = new window.jspdf.jsPDF({orientation: 'landscape', unit: 'pt', format: 'a3', putOnlyUsedFonts: true, compress: true});
    pdf.addFileToVFS('Manrope.ttf', window.tripPdfFont);
    pdf.addFont('Manrope.ttf', 'Manrope', 'normal');
    pdf.setFont('Manrope');
    pdf.setProperties({title: 'Таблицы маршрута — Китай 2026'});
    const tableWidth = pdf.internal.pageSize.getWidth() - 64;
    const columnStyles = Object.fromEntries([0.06, 0.14, 0.09, 0.20, 0.12, 0.13, 0.26].map((share, index) => [index, {cellWidth: tableWidth * share}]));
    content.forEach((table, index) => {
      if (index) pdf.addPage();
      pdf.autoTable({
        ...table,
        theme: 'grid',
        margin: 32,
        columnStyles,
        styles: {font: 'Manrope', fontStyle: 'normal', fontSize: 10.5, cellPadding: 8, overflow: 'linebreak', valign: 'top', textColor: '#221919', lineColor: '#d8c2c2', lineWidth: 0.5},
        headStyles: {fontStyle: 'normal', fillColor: '#8f4a4e', textColor: '#ffffff'},
        alternateRowStyles: {fillColor: '#fff8f7'},
        showHead: 'everyPage',
        rowPageBreak: 'avoid'
      });
    });
    await pdf.save('china-2026-tables.pdf', {returnPromise: true});
  };
})();
