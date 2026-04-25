// Font'u CDN'den base64'e çeviren fonksiyon
async function loadFontAsBase64(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function createBrandReport(brandData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- TÜRKÇE FONT YÜKLEME (jsDelivr CDN) ---
    // latin-ext subset: ş ğ ı ü ö ç gibi tüm Türkçe karakterleri içerir
    const FONT_CDN_REGULAR = 'https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-400-normal.woff';
    const FONT_CDN_BOLD    = 'https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-700-normal.woff';

    const fontRegular = await loadFontAsBase64(FONT_CDN_REGULAR);
    doc.addFileToVFS('Roboto-Regular.woff', fontRegular);
    doc.addFont('Roboto-Regular.woff', 'Roboto', 'normal');

    const fontBold = await loadFontAsBase64(FONT_CDN_BOLD);
    doc.addFileToVFS('Roboto-Bold.woff', fontBold);
    doc.addFont('Roboto-Bold.woff', 'Roboto', 'bold');

    const primaryYellow = [255, 255, 180];
    const textColor = [30, 41, 59];
    const trendGreen = [16, 185, 129];

    // --- 1. BAŞLIK BÖLÜMÜ ---
    doc.setDrawColor(0); 
    doc.setFillColor(...primaryYellow);
    doc.roundedRect(15, 15, 180, 40, 8, 8, 'FD'); 

    doc.setFont("Roboto", "bold");
    doc.setTextColor(...textColor);
    doc.setFontSize(22);
    doc.text(brandData.title, 105, 30, { align: "center" });

    doc.setFontSize(16);
    doc.text(`${brandData.name} x BRAND ON`, 25, 45);
    
    doc.setFontSize(10);
    doc.text(`${brandData.startDate} - ${brandData.endDate}`, 185, 45, { align: "right" });

    // --- 2. ORTA İKİLİ KUTU ---
    doc.setFillColor(...primaryYellow);
    doc.roundedRect(15, 60, 180, 45, 10, 10, 'FD');

    doc.setDrawColor(0);
    doc.line(105, 60, 95, 105); 

    doc.setFont("Roboto", "normal");
    doc.setFontSize(11);
    doc.text("Toplam Ciro", 30, 75);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(20);
    doc.text(`${brandData.revenue}`, 25, 90);
    doc.setFontSize(10);
    doc.setTextColor(...trendGreen);
    doc.text("↑ %18.7", 85, 85);

    doc.setTextColor(...textColor);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(11);
    doc.text("Toplam Harcama", 120, 75);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(20);
    doc.text(`${brandData.spend}`, 115, 90);
    doc.setFontSize(10);
    doc.setTextColor(...trendGreen);
    doc.text("↑ %15.2", 175, 85);

    // --- 3. 6'LI METRİK GRİDİ ---
    const gridStartX = 15;
    const gridStartY = 110;
    const colWidth = 58;
    const rowHeight = 35;

    const metrics = [
        { label: "Sipariş Sayısı",  value: brandData.orderCount, trend: "↑ %4.3" },
        { label: "Tıklamalar",      value: brandData.clicks,     trend: "↑ %1.8" },
        { label: "ROAS",            value: brandData.roas,       trend: "↑ %6.5" },
        { label: "Erişim",          value: brandData.reach,      trend: "↑ %4.3" },
        { label: "Ort. Sepet",      value: brandData.aov,        trend: "↑ %4.3" },
        { label: "Günlük Harcama",  value: brandData.dailySpend, trend: "↑ %4.3" }
    ];

    doc.setTextColor(...textColor);
    
    metrics.forEach((m, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = gridStartX + (col * colWidth) + (col * 3);
        const y = gridStartY + (row * rowHeight) + (row * 3);

        doc.setFillColor(...primaryYellow);
        doc.roundedRect(x, y, colWidth, rowHeight, 6, 6, 'FD');

        doc.setFont("Roboto", "normal");
        doc.setFontSize(9);
        doc.text(m.label, x + 5, y + 10);
        doc.setFont("Roboto", "bold");
        doc.setFontSize(13);
        doc.text(m.value, x + 5, y + 25);
        
        doc.setTextColor(...trendGreen);
        doc.setFont("Roboto", "normal");
        doc.setFontSize(8);
        doc.text(m.trend, x + colWidth - 12, y + 20, { align: "right" });
        doc.setTextColor(...textColor);
    });

    return doc;
}

async function generateFinalPDF() {
    const brandName = currentActiveBrand;
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    if (!brandName || !start || !end) {
        alert("Lütfen marka ve tarih aralığı seçin!");
        return;
    }

    const { data, error } = await _supabase.from('marketing_reports')
        .select('*')
        .eq('brand_name', brandName)
        .gte('report_date', start)
        .lte('report_date', end);

    if (error || !data || data.length === 0) {
        alert("Bu tarih aralığında veri bulunamadı!");
        return;
    }

    const totals = data.reduce((acc, curr) => {
        acc.rev  += (curr.revenue         || 0);
        acc.spnd += (curr.spend           || 0);
        acc.ord  += (curr.order_count     || 0);
        acc.clk  += (curr.clicks          || 0);
        acc.rch  += (curr.reach           || 0);
        acc.msg  += (curr.messaging_count || 0);
        return acc;
    }, { rev: 0, spnd: 0, ord: 0, clk: 0, rch: 0, msg: 0 });

    const diffDays = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    const reportTitle = diffDays <= 10 ? "Haftalık Performans Raporu" : "Aylık Performans Raporu";

    const reportData = {
        name:       brandName,
        title:      reportTitle,
        startDate:  new Date(start).toLocaleDateString('tr-TR'),
        endDate:    new Date(end).toLocaleDateString('tr-TR'),
        revenue:    totals.rev.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL",
        spend:      totals.spnd.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL",
        roas:       totals.spnd > 0 ? (totals.rev / totals.spnd).toFixed(2) : "0.00",
        orderCount: totals.ord.toLocaleString('tr-TR'),
        clicks:     totals.clk.toLocaleString('tr-TR'),
        reach:      totals.rch.toLocaleString('tr-TR'),
        aov:        (totals.ord > 0 ? totals.rev / totals.ord : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL",
        dailySpend: (totals.spnd / data.length).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL"
    };

    const doc = await createBrandReport(reportData);

    // Dosya adı için sadece burada Türkçe karakter temizliyoruz
    const safeFileName = brandName
        .replace(/ş/g,'s').replace(/Ş/g,'S')
        .replace(/ı/g,'i').replace(/İ/g,'I')
        .replace(/ğ/g,'g').replace(/Ğ/g,'G')
        .replace(/ü/g,'u').replace(/Ü/g,'U')
        .replace(/ö/g,'o').replace(/Ö/g,'O')
        .replace(/ç/g,'c').replace(/Ç/g,'C');

    doc.save(`${safeFileName}_${start}_${end}.pdf`);
}