    const supabaseUrl = 'https://npcuixdegetaiqylkknu.supabase.co'; 
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY3VpeGRlZ2V0YWlxeWxra251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDkwNjcsImV4cCI6MjA5MDc4NTA2N30.5qfSuiy9d9kWRvT7Vu-cyL9SuJe4dMKAbfjBPFEIVNY'; 
    const _supabase = supabase.createClient(supabaseUrl, supabaseKey);
    const OPENAI_API_KEY = 'BURAYA_OPENAI_KEYINI_YAPISTIR_KRAL'; // KRAL BURAYA KEYİ YAPIŞTIR!

    // Türkçe karakterleri normalize eden fonksiyon
    function normalizeTurkish(text) {
        return text
            .toLocaleLowerCase('tr-TR')
            .replace(/ı/g, 'i')
            .replace(/ş/g, 's')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .trim();
    }

    const brandItems = document.querySelectorAll('.brand-list li');
    const brandTitle = document.getElementById('current-brand');
    const brandView = document.getElementById('brand-view');
    const homeView = document.getElementById('home-view');
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const brandSearch = document.getElementById('brand-search');
    let currentActiveBrand = "";
    let currentUser = null;
    let myChart = null;
    let startPicker, endPicker;

    // Ctrl+K kısayolu için
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();  // Tarayıcının varsayılan Ctrl+K'sini engelle
            document.getElementById('brand-search').focus();  // Arama input'una odaklan
        }
    });
    window.onload = () => {
        const savedUser = localStorage.getItem('brandOn_session');
        if (savedUser) { currentUser = JSON.parse(savedUser); applyPermissions(); }

        // Flatpickr başlatma - sadece görünüm için Türkçe
        const fpConfig = {
            altInput: true,
            altFormat: "d/m/Y",
            dateFormat: "Y-m-d",
            locale: "tr"
        };
        startPicker = flatpickr("#start-date", fpConfig);
        endPicker = flatpickr("#end-date", fpConfig);

        // YENİ: Enter tuşuna basınca giriş yap
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
        // Arama işlevi - Türkçe karakterlerle tutarlı arama
        const brandSearch = document.getElementById('brand-search');
        brandSearch.addEventListener('input', function() {
            const query = normalizeTurkish(this.value);  
            const brandItems = document.querySelectorAll('.brand-list li');  
            
            brandItems.forEach(item => {
                if (item.id === 'dash-btn') return; 
                
                const text = normalizeTurkish(item.textContent);  
                if (text.includes(query)) {
                    item.style.display = 'flex';  
                } else {
                    item.style.display = 'none';  
                }
            });
        });
    };

    async function handleLogin() {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const { data, error } = await _supabase.from('users_access').select('*').eq('username', user).eq('password', pass).single();
        if (data) { currentUser = data; localStorage.setItem('brandOn_session', JSON.stringify(data)); applyPermissions(); }
        else { document.getElementById('login-error').style.display = 'block'; }
    }

    function applyPermissions() {
        document.getElementById('login-screen').style.display = 'none';
        if (currentUser.role === 'client') {
            document.getElementById('sidebar-lists-container').style.display = 'none';
            document.getElementById('dash-btn').style.display = 'none'; 
            if(!document.getElementById('client-brand-nav')) {
                const html = `<div id="client-brand-nav"><div class="nav-label">Yetkili Markanız</div><ul class="brand-list"><li class="active"><i class="fa-solid fa-star"></i> ${currentUser.brand_name}</li><li onclick="logout()" style="color:#ef4444; margin-top:20px;"><i class="fa-solid fa-right-from-bracket"></i> ÇIKIŞ YAP</li></ul></div>`;
                document.querySelector('.sidebar-content').insertAdjacentHTML('beforeend', html);
            }
            brandTitle.innerText = currentUser.brand_name;
            fetchBrandData(currentUser.brand_name, true);
        } else { showHome(); }
    }

    function logout() { localStorage.removeItem('brandOn_session'); location.reload(); }

    function toggleSidebar() { 
        const isShowing = sidebar.classList.toggle('show'); 
        overlay.classList.toggle('active');
        document.body.classList.toggle('no-scroll', isShowing);
    }
    menuToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
    overlay.addEventListener('click', toggleSidebar);

    function showHome() {
        brandView.style.display = 'none'; homeView.style.display = 'block';
        brandItems.forEach(li => li.classList.remove('active'));
        document.getElementById('dash-btn').classList.add('active');
        if(window.innerWidth <= 992) toggleSidebar();
    }

    async function setDynamicDates(brandName) {
        const { data } = await _supabase.from('marketing_reports').select('report_date').eq('brand_name', brandName).order('report_date', { ascending: true });
        if(data && data.length > 0) {
            startPicker.setDate(data[0].report_date);
            endPicker.setDate(data[data.length - 1].report_date);
        }
    }

    async function fetchBrandData(brandNameFull, isFirstClick = true) {
        let brandName = brandNameFull.replace(/<i.*<\/i>/, "").trim();
        if (currentUser.role === 'client') brandName = currentUser.brand_name;
        
        currentActiveBrand = brandName;
        document.getElementById('current-brand').innerText = brandName;
        homeView.style.display = 'none'; brandView.style.display = 'block';

        if(isFirstClick) await setDynamicDates(brandName);

        const start = document.getElementById('start-date').value;
        const end = document.getElementById('end-date').value;
        
        const { data, error } = await _supabase.from('marketing_reports')
            .select('*')
            .eq('brand_name', brandName)
            .gte('report_date', start)
            .lte('report_date', end)
            .order('report_date', { ascending: false });

        if (error || !data || data.length === 0) { 
            resetValues(); 
            document.getElementById('date-range').innerHTML = "Veri bulunamadı!"; 
            return; 
        }

        updateChart(data);

        // Önceki dönem tarihlerini hesapla
        const startDate = new Date(start);
        const endDate = new Date(end);
        const selectedDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // Seçilen gün sayısı
        const prevEnd = new Date(startDate);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - selectedDays + 1);

        // Önceki dönem verisini çek
        const { data: prevData } = await _supabase.from('marketing_reports')
            .select('*')
            .eq('brand_name', brandName)
            .gte('report_date', prevStart.toISOString().split('T')[0])
            .lte('report_date', prevEnd.toISOString().split('T')[0]);

        // Trend hesaplama fonksiyonu
        const trendHesapla = (key) => {
            const selectedTotal = data.reduce((s, c) => s + (c[key] || 0), 0);
            const prevTotal = prevData ? prevData.reduce((s, c) => s + (c[key] || 0), 0) : 0;
            if (prevTotal === 0) return "";
            const fark = ((selectedTotal - prevTotal) / prevTotal) * 100;
            const ikon = fark >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            const renk = fark >= 0 ? 'trend-up' : 'trend-down';
            return `<span class="trend-badge ${renk}"><i class="fa-solid ${ikon}"></i> %${Math.abs(fark).toFixed(1)}</span>`;
        };

        const totals = data.reduce((acc, curr) => {
            acc.rev += (curr.revenue || 0); 
            acc.spnd += (curr.spend || 0); 
            acc.ord += (curr.order_count || 0);
            acc.clk += (curr.clicks || 0); 
            acc.rch += (curr.reach || 0); 
            acc.msg += (curr.messaging_count || 0);
            return acc;
        }, { rev: 0, spnd: 0, ord: 0, clk: 0, rch: 0, msg: 0 });

        const f = (n) => parseFloat(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        
        // Değerleri Ekrana Yazdırırken Trendleri Yanına Ekle
        document.getElementById('total-revenue').innerHTML = `${f(totals.rev)} <span class="unit">TL</span> ${trendHesapla('revenue')}`;
        document.getElementById('total-spend').innerHTML = `${f(totals.spnd)} <span class="unit">TL</span> ${trendHesapla('spend')}`;
        
        const currentRoas = totals.spnd > 0 ? (totals.rev / totals.spnd) : 0;
        document.getElementById('roas').innerHTML = `${currentRoas.toFixed(2)} ${trendHesapla('revenue')}`;
        
        document.getElementById('avg-order-value').innerHTML = `${f(totals.ord > 0 ? totals.rev / totals.ord : 0)} <span class="unit">TL</span>`;
        document.getElementById('order-count').innerText = parseInt(totals.ord).toLocaleString('tr-TR');
        document.getElementById('clicks').innerText = parseInt(totals.clk).toLocaleString('tr-TR');
        document.getElementById('reach').innerText = parseInt(totals.rch).toLocaleString('tr-TR');
        document.getElementById('message-count').innerText = parseInt(totals.msg).toLocaleString('tr-TR');
        document.getElementById('daily-avg-spend').innerHTML = `${f(totals.spnd / data.length)} <span class="unit">TL</span>`;
        document.getElementById('report-date').innerText = new Date(data[0].report_date).toLocaleDateString('tr-TR');
        document.getElementById('date-range').innerText = `Periyot: ${new Date(start).toLocaleDateString('tr-TR')} - ${new Date(end).toLocaleDateString('tr-TR')}`;
    }

    function resetValues() { document.querySelectorAll('#brand-view .value').forEach(v => v.innerHTML = '--'); }

    function updateChart(data) {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        if (myChart) myChart.destroy();
        const sorted = [...data].reverse();
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(d => new Date(d.report_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })),
                datasets: [
                    { label: 'Ciro (TL)', data: sorted.map(d => d.revenue), borderColor: '#4680ff', backgroundColor: 'rgba(70, 128, 255, 0.1)', fill: true, tension: 0.4 },
                    { label: 'Harcama (TL)', data: sorted.map(d => d.spend), borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end' } } }
        });
    }
    // PDF RAPORLAMA FONKSİYONU
    async function exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const content = document.getElementById('report-content');
        const canvas = await html2canvas(content, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        doc.save(`${currentActiveBrand}_Rapor_${new Date().toLocaleDateString('tr-TR')}.pdf`);
    }

    // AI CHAT FONKSİYONLARI
    function toggleAIChat() {
        const chat = document.getElementById('ai-chat-container');
        chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
    }

                async function sendMessage() {
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if(!msg) return;

            addMessage(msg, 'user');
            input.value = '';

            const metrics = {
                marka: currentActiveBrand || "Genel Dashboard",
                ciro: document.getElementById('total-revenue')?.innerText || "0",
                harcama: document.getElementById('total-spend')?.innerText || "0",
                roas: document.getElementById('roas')?.innerText || "0"
            };

            // BURAYA KEY'İ TEKRAR KONTROL EDEREK YAPIŞTIR
            const GEMINI_API_KEY = 'AIzaSyBvIIlNHoYvuugkbgvX3ZVutBrDLLiH-UA'; 

                try {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{
                                        text: `Sen bir pazarlama uzmanısın. Marka: ${metrics.marka}, Ciro: ${metrics.ciro}, Harcama: ${metrics.harcama}, ROAS: ${metrics.roas}. Soru: ${msg}`
                                    }]
                                }]
                            })
                        }
                    );

                    const data = await response.json();
                    console.log("GEMINI CEVABI:", data);

                    if (data.error) {
                        console.error("Gemini Hata:", data.error);
                        addMessage(`Hata: ${data.error.message}`, 'ai');
                        return;
                    }

                    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    addMessage(aiText || "Cevap boş döndü kral.", 'ai');

                } catch (e) {
                    console.error("Fetch hatası:", e);
                    addMessage("Bağlantı hatası kral, konsola bak.", 'ai');
                }
        }

    function addMessage(text, side) {
        const container = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `message msg-${side}`;
        div.innerText = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

        function refreshWithDate() {
    fetchBrandData(currentActiveBrand, false);
}
    brandItems.forEach(item => {
        item.addEventListener('click', function() {
            if(this.id === 'dash-btn') return;
            document.querySelectorAll('.brand-list li').forEach(li => li.classList.remove('active'));
            this.classList.add('active'); brandTitle.innerText = this.innerText; 
            fetchBrandData(this.innerHTML, true);
            if(window.innerWidth <= 992) toggleSidebar();
        });
    });