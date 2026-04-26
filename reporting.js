async function createBrandReport(brandData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- RENK PALETİ ---
    const bgColor = [173, 224, 255]; 
    const cardColor = [255, 255, 255]; 
    const textColor = [0, 0, 0]; 
    const trendRed = [255, 99, 71]; 
    const trendGreen = [16, 185, 129]; // Artış için yeşil ekledik

    // 1. ARKA PLAN BOYAMA
    doc.setFillColor(...bgColor);
    doc.rect(0, 0, 210, 297, 'F');

    // --- ÜST BAŞLIK BÖLÜMÜ ---
    doc.setFont("Roboto-Bold", "bold");
    doc.setTextColor(...textColor);
    doc.setFontSize(28);
    doc.text("Haftalık", 15, 25);
    doc.text("Performans Raporu", 15, 35);

    doc.setFontSize(16);
    doc.text(`${brandData.name} X BRAND ON`, 195, 20, { align: "right" });

    // Tarih Kutusu
    doc.setDrawColor(0);
    doc.setFillColor(...cardColor);
    doc.roundedRect(145, 25, 50, 10, 5, 5, 'FD');
    doc.setFontSize(8);
    doc.setFont("Roboto-Regular", "normal");
    doc.text(`${brandData.startDate} - ${brandData.endDate}`, 170, 31.5, { align: "center" });

    // --- METRİK KARTLARI ---
    const gridStartX = 20; 
    const gridStartY = 65;
    const colWidth = 52;   
    const rowHeight = 45; 
    const gapX = 8;        
    const gapY = 12;       

    // DİNAMİK TRENDLERİ BURADA EŞLEŞTİRİYORUZ
    const metrics = [
        { label: "Toplam Ciro", value: brandData.revenue, isCurrency: true, trend: brandData.revenueTrend },
        { label: "Toplam Harcama", value: brandData.spend, isCurrency: true, trend: brandData.spendTrend },
        { label: "Sipariş Sayısı", value: brandData.orderCount, isCurrency: false, trend: brandData.orderTrend },
        { label: "Tıklamalar", value: brandData.clicks, isCurrency: false, trend: null },
        { label: "ROAS", value: brandData.roas, isCurrency: false, trend: brandData.roasTrend },
        { label: "Erişim", value: brandData.reach, isCurrency: false, trend: null },
        { label: "Ortalama Sepet Tutarı", value: brandData.aov, isCurrency: true, trend: null },
        { label: "Günlük Harcama", value: brandData.dailySpend, isCurrency: true, trend: null }
    ];

    metrics.forEach((m, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = gridStartX + (col * (colWidth + gapX));
        const y = gridStartY + (row * (rowHeight + gapY));

        doc.setFillColor(...cardColor);
        doc.setDrawColor(0);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, y, colWidth, rowHeight, 8, 8, 'FD');

        doc.setFillColor(...cardColor);
        doc.roundedRect(x + 4, y - 5, colWidth - 8, 10, 5, 5, 'FD');
        doc.setFont("Roboto-Bold", "bold");
        doc.setFontSize(8);
        doc.text(m.label, x + (colWidth / 2), y + 1.5, { align: "center" });

        doc.setFontSize(16);
        let displayValue = m.value.toString().split(' ')[0]; 
        if (m.isCurrency) displayValue += " TL";
        doc.text(displayValue, x + (colWidth / 2), y + 20, { align: "center" });

        // --- DİNAMİK TREND VE OK ÇİZİMİ ---
        // --- DİNAMİK TREND VE OK ÇİZİMİ ( createBrandReport içindeki ilgili yer ) ---
        if (m.trend && m.trend.percent) {
            doc.setFontSize(9);
            const trendTextX = x + (colWidth / 2) - 4;
            const trendY = y + 32;
            
            // Renk: Artışsa Yeşil, Azalışsa Kırmızı
            const currentColor = m.trend.isUp ? trendGreen : trendRed;
            doc.setTextColor(...currentColor);
            doc.text(m.trend.percent, trendTextX, trendY, { align: "center" });
            
            doc.setDrawColor(...currentColor);
            doc.setLineWidth(0.6);
            const arrowX = trendTextX + 6;

            if (m.trend.isUp) {
                // YUKARI OK
                const arrowY = trendY - 1; 
                doc.line(arrowX, arrowY, arrowX, arrowY - 4); 
                doc.line(arrowX, arrowY - 4, arrowX - 1.5, arrowY - 2.5);
                doc.line(arrowX, arrowY - 4, arrowX + 1.5, arrowY - 2.5);
            } else {
                // AŞAĞI OK ( Koordinatlar tersine döner )
                const arrowY = trendY - 5; 
                doc.line(arrowX, arrowY, arrowX, arrowY + 4); 
                doc.line(arrowX, arrowY + 4, arrowX - 1.5, arrowY + 2.5);
                doc.line(arrowX, arrowY + 4, arrowX + 1.5, arrowY + 2.5);
            }
            doc.setTextColor(0, 0, 0); 
        }
    });

    return doc;
}

async function generateFinalPDF() {
    const brandName = currentActiveBrand;
    const start = document.getElementById('header-start-date').value || document.getElementById('start-date').value;
    const end = document.getElementById('header-end-date').value || document.getElementById('end-date').value;

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

    // generateFinalPDF fonksiyonunun içindeki reportData kısmı
    const reportData = {
        name: brandName,
        title: reportTitle,
        startDate: new Date(start).toLocaleDateString('tr-TR'),
        endDate: new Date(end).toLocaleDateString('tr-TR'),
        revenue: totals.rev.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        spend: totals.spnd.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        roas: totals.spnd > 0 ? (totals.rev / totals.spnd).toFixed(2) : "0.00",
        orderCount: totals.ord.toLocaleString('tr-TR'),
        clicks: totals.clk.toLocaleString('tr-TR'),
        reach: totals.rch.toLocaleString('tr-TR'),
        aov: (totals.ord > 0 ? totals.rev / totals.ord : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        dailySpend: (totals.spnd / data.length).toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        // BUNLARI EKLEMEN ŞART:
        revenueTrend: calcTrend('revenue'),
        spendTrend: calcTrend('spend'),
        roasTrend: calcTrend('revenue'), // ROAS için de ciro trendini baz alabiliriz
        orderTrend: calcTrend('order_count')
    };

    const doc = await createBrandReport(reportData);

    const safeFileName = brandName
        .replace(/ş/g,'s').replace(/Ş/g,'S')
        .replace(/ı/g,'i').replace(/İ/g,'I')
        .replace(/ğ/g,'g').replace(/Ğ/g,'G')
        .replace(/ü/g,'u').replace(/Ü/g,'U')
        .replace(/ö/g,'o').replace(/Ö/g,'O')
        .replace(/ç/g,'c').replace(/Ç/g,'C');

    doc.save(`${safeFileName}_${start}_${end}.pdf`);
}
async function downloadAllReportsAsZip() {
    const start = document.getElementById('header-start-date').value || document.getElementById('start-date').value;
    const end = document.getElementById('header-end-date').value || document.getElementById('end-date').value;
    const overlay = document.getElementById('loading-overlay');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');

    if (!start || !end) {
        alert("Lütfen tüm markalar için tarih aralığı seçin!");
        return;
    }

    // --- ÖNCEKİ DÖNEM TARİHLERİNİ HESAPLA (ZIP İÇİN) ---
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(startDate); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - diffDays + 1);
    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    overlay.style.display = 'flex';
    loadingText.innerText = "Marka listesi çekiliyor...";

    try {
        const { data: brandList, error: brandError } = await _supabase.from('marketing_reports').select('brand_name');
        if (brandError) throw brandError;

        const uniqueBrands = [...new Set(brandList.map(item => item.brand_name))];
        const totalBrands = uniqueBrands.length;
        const zip = new JSZip();
        const folder = zip.folder(`BrandOn_Raporlari_${start}_${end}`);

        let processedCount = 0;

        for (const brandName of uniqueBrands) {
            processedCount++;
            loadingText.innerText = `${brandName} Raporu Hazırlanıyor...`;
            loadingProgress.innerText = `${processedCount} / ${totalBrands}`;

            // 1. SEÇİLİ DÖNEM VERİSİNİ ÇEK
            const { data: currentData } = await _supabase.from('marketing_reports').select('*')
                .eq('brand_name', brandName).gte('report_date', start).lte('report_date', end);

            if (!currentData || currentData.length === 0) continue;

            // 2. ÖNCEKİ DÖNEM VERİSİNİ ÇEK (EKSİK OLAN KISIM BURAYDI)
            const { data: prevData } = await _supabase.from('marketing_reports').select('*')
                .eq('brand_name', brandName).gte('report_date', prevStartStr).lte('report_date', prevEndStr);

            // 3. TREND HESAPLAMA YARDIMCISI (ZIP DÖNGÜSÜ İÇİN)
            const calcTrend = (key) => {
                const currentTotal = currentData.reduce((s, c) => s + (c[key] || 0), 0);
                const prevTotal = prevData ? prevData.reduce((s, c) => s + (c[key] || 0), 0) : 0;
                if (prevTotal === 0) return { percent: "0%", isUp: true };
                const diff = ((currentTotal - prevTotal) / prevTotal) * 100;
                return { percent: Math.abs(diff).toFixed(1) + "%", isUp: diff >= 0 };
            };

            const totals = currentData.reduce((acc, curr) => {
                acc.rev += (curr.revenue || 0); acc.spnd += (curr.spend || 0);
                acc.ord += (curr.order_count || 0); acc.clk += (curr.clicks || 0);
                acc.rch += (curr.reach || 0);
                return acc;
            }, { rev: 0, spnd: 0, ord: 0, clk: 0, rch: 0 });

            const reportData = {
                name: brandName,
                title: diffDays <= 10 ? "Haftalık Performans Raporu" : "Aylık Performans Raporu",
                startDate: new Date(start).toLocaleDateString('tr-TR'),
                endDate: new Date(end).toLocaleDateString('tr-TR'),
                revenue: totals.rev.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
                spend: totals.spnd.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
                roas: totals.spnd > 0 ? (totals.rev / totals.spnd).toFixed(2) : "0.00",
                orderCount: totals.ord.toLocaleString('tr-TR'),
                clicks: totals.clk.toLocaleString('tr-TR'),
                reach: totals.rch.toLocaleString('tr-TR'),
                aov: (totals.ord > 0 ? totals.rev / totals.ord : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
                dailySpend: (totals.spnd / currentData.length).toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
                // TRENDLER ARTIK ZIP'TE DE VAR!
                revenueTrend: calcTrend('revenue'),
                spendTrend: calcTrend('spend'),
                roasTrend: calcTrend('revenue'),
                orderTrend: calcTrend('order_count')
            };

            const doc = await createBrandReport(reportData);
            const pdfBlob = doc.output('blob');
            const safeName = brandName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".pdf";
            folder.file(safeName, pdfBlob);
        }

        loadingText.innerText = "ZIP Paketi Oluşturuluyor...";
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `BrandOn_Toplu_Rapor_${start}.zip`;
        link.click();

    } catch (err) {
        console.error("Toplu işlem hatası:", err);
        alert("Bir hata oluştu: " + err.message);
    } finally {
        overlay.style.display = 'none';
    }
}