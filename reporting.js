// reporting.js

function createBrandReport(brandData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- RENK VE STİL TANIMLAMALARI ---
    const primaryYellow = [255, 255, 180]; // Kutuların sarısı
    const headerBlue = [70, 128, 255];    // Başlık mavisi
    const textColor = [30, 41, 59];       // Koyu gri metin
    const trendGreen = [16, 185, 129];    // Trend yeşili

    // --- 1. BAŞLIK BÖLÜMÜ ---
    doc.setDrawColor(0); 
    doc.setFillColor(...primaryYellow);
    doc.roundedRect(15, 15, 180, 40, 8, 8, 'FD'); 

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...headerBlue);
    doc.setFontSize(22);
    doc.text("Haftalık Performans Özeti", 105, 30, { align: "center" });

    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.text(`${brandData.name} x BRAND ON`, 25, 45);
    
    doc.setFontSize(10);
    doc.text(`${brandData.startDate} - ${brandData.endDate}`, 185, 45, { align: "right" });

    // --- 2. ORTA İKİLİ KUTU (Ciro & Harcama) ---
    doc.setFillColor(...primaryYellow);
    doc.roundedRect(15, 60, 180, 45, 10, 10, 'FD');

    // Ayırıcı Çizgi
    doc.setDrawColor(0);
    doc.line(105, 60, 95, 105); 

    // Sol: Toplam Ciro
    doc.setFontSize(11);
    doc.text("Toplam Ciro", 30, 75);
    doc.setFontSize(20);
    doc.text(`${brandData.revenue}`, 25, 90);
    doc.setFontSize(10);
    doc.setTextColor(...trendGreen);
    doc.text("↑ %18.7", 85, 85); // Örnek trend konumu

    // Sağ: Toplam Harcama
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.text("Toplam Harcama", 120, 75);
    doc.setFontSize(20);
    doc.text(`${brandData.spend}`, 115, 90);
    doc.setFontSize(10);
    doc.setTextColor(...trendGreen);
    doc.text("↑ %15.2", 175, 85);

    // --- 3. ALTTAKİ 6'LI METRİK GRİDİ ---
    // Grid Ayarları
    const gridStartX = 15;
    const gridStartY = 110;
    const colWidth = 58; // 180 / 3 = 60mm civarı
    const rowHeight = 35;

    const metrics = [
        { label: "Sipariş Sayısı", value: brandData.orderCount, trend: "↑ %4.3" },
        { label: "Tıklamalar", value: brandData.clicks, trend: "↑ %1.8" },
        { label: "ROAS", value: brandData.roas, trend: "↑ %6.5" },
        { label: "Erişim", value: brandData.reach, trend: "↑ %4.3" },
        { label: "Ort. Sepet", value: brandData.aov, trend: "↑ %4.3" },
        { label: "Günlük Harcama", value: brandData.dailySpend, trend: "↑ %4.3" }
    ];

    doc.setTextColor(...textColor);
    
    metrics.forEach((m, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = gridStartX + (col * colWidth) + (col * 3); // 3mm boşluk
        const y = gridStartY + (row * rowHeight) + (row * 3);

        // Metrik Kutusu
        doc.setFillColor(...primaryYellow);
        doc.roundedRect(x, y, colWidth, rowHeight, 6, 6, 'FD');

        // Metrik Yazıları
        doc.setFontSize(9);
        doc.text(m.label, x + 5, y + 10);
        doc.setFontSize(13);
        doc.text(m.value, x + 5, y + 25);
        
        // Metrik Trendi
        doc.setTextColor(...trendGreen);
        doc.setFontSize(8);
        doc.text(m.trend, x + colWidth - 12, y + 20, { align: "right" });
        doc.setTextColor(...textColor); // Rengi geri düzelt
    });

    return doc;
}

// reporting.js içindeki motoru dinamik yapalım
async function generateFinalPDF() {
    // 1. Ana sayfadaki seçicilerden değerleri al
    const brandName = currentActiveBrand; // script.js'den gelen o anki aktif marka
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    if (!brandName || !start || !end) {
        alert("Lütfen marka ve tarih aralığı seçin patron!");
        return;
    }

    // 2. Supabase'den o tarihler arasındaki veriyi çek (Aynı script.js'deki mantık)
    const { data, error } = await _supabase.from('marketing_reports')
        .select('*')
        .eq('brand_name', brandName)
        .gte('report_date', start)
        .lte('report_date', end);

    if (error || !data || data.length === 0) {
        alert("Bu tarih aralığında veri bulunamadı!");
        return;
    }

    // 3. Verileri toplam değerlere (totals) dönüştür
    const totals = data.reduce((acc, curr) => {
        acc.rev += (curr.revenue || 0);
        acc.spnd += (curr.spend || 0);
        acc.ord += (curr.order_count || 0);
        acc.clk += (curr.clicks || 0);
        acc.rch += (curr.reach || 0);
        acc.msg += (curr.messaging_count || 0);
        return acc;
    }, { rev: 0, spnd: 0, ord: 0, clk: 0, rch: 0, msg: 0 });

    // 4. PDF İçin Veriyi Formatla
    const reportData = {
        name: brandName,
        startDate: new Date(start).toLocaleDateString('tr-TR'),
        endDate: new Date(end).toLocaleDateString('tr-TR'),
        revenue: totals.rev.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL",
        spend: totals.spnd.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL",
        roas: totals.spnd > 0 ? (totals.rev / totals.spnd).toFixed(2) : "0.00",
        orderCount: totals.ord.toLocaleString('tr-TR'),
        clicks: totals.clk.toLocaleString('tr-TR'),
        reach: totals.rch.toLocaleString('tr-TR'),
        aov: (totals.ord > 0 ? totals.rev / totals.ord : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL",
        dailySpend: (totals.spnd / data.length).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL"
    };

    // 5. PDF'i Oluştur ve İndir
    const doc = createBrandReport(reportData);
    doc.save(`${brandName}_${start}_${end}.pdf`);
}