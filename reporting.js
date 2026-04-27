async function createBrandReport(brandData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- YENİ RENK PALETİ ---
    const bgColor = [252, 250, 242];    // Hafif krem arka plan
    const cardColor = [255, 255, 255];  // Beyaz kartlar
    const textColor = [20, 20, 20];     // Koyu metin
    const brandMor = [95, 30, 235];     // Üst grup chip rengi (Mor)
    const brandTuruncu = [255, 100, 50]; // Alt grup chip rengi (Turuncu)
    const trendGreen = [20, 140, 90];   // Artış yeşili
    const trendRed = [230, 50, 50];     // Azalış kırmızısı

    // 1. ARKA PLAN BOYAMA
    doc.setFillColor(...bgColor);
    doc.rect(0, 0, 210, 297, 'F');

    // --- ÜST BAŞLIK BÖLÜMÜ (Merkezlendi) ---
    doc.setFont("Montserrat-Bold", "bold");
    doc.setTextColor(...textColor);
    
    // Sağ üstte tarih aralığı
    doc.setFontSize(11);
    doc.text(`${brandData.startDate} - ${brandData.endDate}`, 195, 15, { align: "right" });

    // Ana Başlıklar
    doc.setFontSize(32);
    doc.text(`Brand On x ${brandData.name}`, 105, 35, { align: "center" });
    doc.setFontSize(26);
    doc.setFont("Montserrat-Regular", "normal");
    doc.text(brandData.title, 105, 50, { align: "center" });

    // --- METRİK KARTLARI AYARLARI ---
    const gridStartX = 15; 
    const gridStartY = 75;
    const colWidth = 58;   
    const rowHeight = 55; 
    const gapX = 5;        
    const gapY = 15;       

    // Metrik Listesi ve Renk Eşleşmeleri
    const metrics = [
        { label: "HARCAMA", value: brandData.spend, isCurrency: false, trend: brandData.spendTrend, color: brandMor },
        { label: "CİRO", value: brandData.revenue, isCurrency: false, trend: brandData.revenueTrend, color: brandMor },
        { label: "ROAS", value: brandData.roas, isCurrency: false, trend: brandData.roasTrend, color: brandMor },
        { label: "TIKLAMALAR", value: brandData.clicks, isCurrency: false, trend: null, color: brandTuruncu },
        { label: "ERİŞİM", value: brandData.reach, isCurrency: false, trend: null, color: brandTuruncu },
        { label: "SİPARİŞ SAYISI", value: brandData.orderCount, isCurrency: false, trend: brandData.orderTrend, color: brandTuruncu },
        { label: "Ortalama Sepet Tutarı", value: brandData.aov, isCurrency: false, trend: null, color: brandTuruncu },
        { label: "Günlük Harcama", value: brandData.dailySpend, isCurrency: false, trend: null, color: brandTuruncu }
    ];

    metrics.forEach((m, i) => {
        // Son iki kartı ortalamak için özel mantık
        let x, y;
        if (i < 6) {
            const col = i % 3;
            const row = Math.floor(i / 3);
            x = gridStartX + (col * (colWidth + gapX));
            y = gridStartY + (row * (rowHeight + gapY));
        } else {
            const col = i - 6;
            x = 42 + (col * (colWidth + gapX)); // Alt iki kartı ortaladık
            y = gridStartY + (2 * (rowHeight + gapY));
        }

        // 1. Kart Gövdesi
        doc.setFillColor(...cardColor);
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, colWidth, rowHeight, 8, 8, 'FD');

        // 2. Chip Başlık (Renkli)
        doc.setFillColor(...m.color);
        doc.roundedRect(x + 5, y - 6, colWidth - 10, 12, 6, 6, 'F');
        doc.setFont("Montserrat-Bold", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(m.label, x + (colWidth / 2), y + 1.5, { align: "center" });

        // 3. Büyük Değer
        doc.setTextColor(...textColor);
        doc.setFontSize(22);
        let val = m.value.toString().split(' ')[0]; // TL ekini ayıklıyoruz
        doc.text(val, x + (colWidth / 2), y + 25, { align: "center" });

        // 4. Dinamik Trend ve Oklar
        if (m.trend && m.trend.percent) {
            doc.setFontSize(18);
            const trendColor = m.trend.isUp ? trendGreen : trendRed;
            doc.setTextColor(...trendColor);
            
            // Yüzde metni
            const trendX = x + (colWidth / 2) - 5;
            doc.text(m.trend.percent, trendX, y + 42, { align: "center" });

            // Dolu Üçgen Çizimi (Artış/Azalışa göre)
            doc.setFillColor(...trendColor);
            const triX = trendX + 14;
            const triY = y + 41;
            
            if (m.trend.isUp) {
                // Yukarı üçgen
                doc.triangle(triX, triY - 3, triX - 3, triY + 1.5, triX + 3, triY + 1.5, 'F');
            } else {
                // Aşağı üçgen
                doc.triangle(triX, triY + 1.5, triX - 3, triY - 3, triX + 3, triY - 3, 'F');
            }
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