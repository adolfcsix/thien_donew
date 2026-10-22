'use strict';
function changeCalendarInput() { const v = document.getElementById('birthCalendar').value; document.getElementById('solarFields').hidden = v === 'lunar'; document.getElementById('lunarFields').hidden = v !== 'lunar'; }
function chartForm() { let s = chartInput; return `<div class="card"><div class="section-head"><h2>Khởi tạo lá số</h2><span class="badge">ENGINE V7 · 14 PHỤ TINH · ĐỐI CHIẾU</span></div><p style="font-size:12px">Tính toán cục bộ trên thiết bị (UTC+7), không tự gửi ngày sinh lên máy chủ. Bộ an sao Tam Hợp và Tứ Hóa niên sinh có phiên bản; xem giới hạn trong tài liệu. Không dùng làm dự đoán chắc chắn.</p><form id="birthForm" onsubmit="generateChart(event)"><div class="form-group"><label for="userName">Tên hiển thị (có thể dùng biệt danh)</label><input id="userName" maxlength="70" required value="${esc(s.name)}" placeholder="Nhập tên hiển thị" /></div><div class="form-grid"><div class="form-group"><label for="birthCalendar">Loại lịch</label><select id="birthCalendar" onchange="changeCalendarInput()"><option value="solar" ${s.calendar === 'solar' ? 'selected' : ''}>Dương lịch</option><option value="lunar" ${s.calendar === 'lunar' ? 'selected' : ''}>Âm lịch</option></select></div><div class="form-group"><label for="gender">Giới tính an sao</label><select id="gender"><option ${s.gender === 'Nam' ? 'selected' : ''}>Nam</option><option ${s.gender === 'Nữ' ? 'selected' : ''}>Nữ</option></select></div></div><div id="solarFields" class="form-group" ${s.calendar === 'lunar' ? 'hidden' : ''}><label for="birthDate">Ngày sinh dương lịch</label><input type="date" id="birthDate" min="1900-01-01" max="2100-12-31" value="${esc(s.solarDate)}" /></div><div id="lunarFields" ${s.calendar !== 'lunar' ? 'hidden' : ''}><div class="form-grid"><div class="form-group"><label for="lunarDay">Ngày âm</label><input type="number" id="lunarDay" min="1" max="30" value="${s.lunarDay}"/></div><div class="form-group"><label for="lunarMonth">Tháng âm</label><input type="number" id="lunarMonth" min="1" max="12" value="${s.lunarMonth}"/></div></div><div class="form-grid"><div class="form-group"><label for="lunarYear">Năm âm</label><input type="number" id="lunarYear" min="1900" max="2100" value="${s.lunarYear}"/></div><div class="form-group"><label class="lunar-check" for="lunarLeap"><input type="checkbox" id="lunarLeap" ${s.lunarLeap ? 'checked' : ''}/> Tháng nhuận</label></div></div></div><div class="form-grid"><div class="form-group"><label for="birthTime">Giờ và phút sinh</label><input type="time" id="birthTime" value="${esc(s.birthTime)}" required/></div><div class="form-group"><label for="birthPlace">Múi giờ lịch</label><select id="birthPlace"><option value="7">Việt Nam UTC+7</option></select></div></div><div class="form-group"><label for="school">Bộ quy tắc</label><select id="school"><option value="tam-hop">Tam Hợp + Tứ Hóa Toàn Tập (V6 rules)</option></select></div><button class="btn block" type="submit">☯ &nbsp; Tính lá số 12 cung →</button><p class="tiny-note" style="margin-top:12px">Đã tính: Mệnh/Thân, Cục, 14 chính tinh, 14 phụ tinh (9 + 5), 3 vòng sao, đại hạn và Tứ Hóa niên sinh. Chưa có tiểu hạn, lưu niên đầy đủ, phi hóa và luận giải tự động.</p><p class="tiny-note">V7: dữ liệu chỉ được gửi lên máy chủ khi bạn chủ động lưu vào tài khoản.</p><div id="formError" role="alert" aria-live="polite"></div></form></div>`; }
const palaceGlossary = ['Bản mệnh, tính cách và định hướng phát triển trong diễn giải truyền thống.', 'Các mối quan hệ và điều kiện liên quan đến cha mẹ.', 'Phúc phần, đời sống tinh thần và nền tảng gia đình.', 'Nhà cửa, tài sản và môi trường cư trú.', 'Công việc, vị trí xã hội và định hướng nghề nghiệp.', 'Bạn bè, đồng nghiệp và quan hệ cộng tác.', 'Môi trường bên ngoài, dịch chuyển và giao tiếp xã hội.', 'Sức khỏe và các vấn đề cần chăm sóc bản thân; không dùng để chẩn đoán.', 'Tài chính, cách quản lý nguồn lực và thu nhập.', 'Quan hệ với con cái và thế hệ sau.', 'Quan hệ hôn nhân, bạn đời và tình cảm.', 'Anh chị em và các quan hệ cùng thế hệ.'];
let selectedDetailTab = 'meaning';
function setDetailTab(t) { selectedDetailTab = t; const el = document.getElementById('palaceDetail'); if (el)
    el.innerHTML = palaceDetail(); }
function selectCycleYear(value) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1900 || year > 2100)
        return;
    cycleYear = year;
    refreshChartData();
}
function refreshChartData() {
    const area = document.querySelector('.chart-area');
    if (area) {
        const old = area.scrollLeft;
        area.innerHTML = chartGrid();
        area.scrollLeft = old;
    }
    const details = document.getElementById('palaceDetail');
    if (details)
        details.innerHTML = palaceDetail();
    document.querySelectorAll('[data-layer]').forEach(btn => btn.setAttribute('aria-pressed', String(chartLayer[btn.dataset.layer])));
    const annual = document.getElementById('annualYearLabel');
    if (annual)
        annual.textContent = chartResult ? `Chi năm ${cycleYear}: ${ThienDoTuVi.BRANCHES[ThienDoCycles.yearBranch(cycleYear)]}` : '';
}
function layerTags(h) {
    let tags = [];
    for (const k of ['thaiTue', 'bacSi', 'trangSinh'])
        if (chartLayer[k]) {
            const label = { thaiTue: 'Tuế', bacSi: 'Bác', trangSinh: 'Sinh' }[k];
            tags.push(`<span class="cycle-star cycle-${k}" title="${label} · ${esc(h.cycleStars[k][0])}">${label}: ${esc(h.cycleStars[k][0])}</span>`);
        }
    if (chartLayer.daiHan && h.daiHan) {
        const age = cycleYear - chartResult.lunar.year + 1;
        const isActive = age >= h.daiHan.fromAge && age <= h.daiHan.toAge;
        tags.push(`<span class="cycle-age ${isActive ? 'cycle-active' : ''}">${isActive ? '◉ ' : ''}Đại hạn ${h.daiHan.fromAge}–${h.daiHan.toAge} tuổi mụ</span>`);
    }
    if (chartLayer.annual && h.branchIndex === ThienDoCycles.yearBranch(cycleYear))
        tags.push(`<span class="annual-tag">◎ Lưu Thái Tuế ${cycleYear}</span>`);
    return tags.length ? `<div class="cycle-tags">${tags.join('')}</div>` : '';
}
function chartGrid() { let inner = Array(16).fill(''); if (!chartResult) {
    ThienDoTuVi.BRANCHES.forEach((branch, i) => { const cell = ThienDoTuVi.POS_CELL[i]; inner[cell] = `<div class="palace waiting-palace"><div><small>ĐỊA CHI ${branch}</small></div><div class="stars">Nhập ngày giờ sinh để tính vị trí 12 cung, chính tinh, phụ tinh và Tứ Hóa</div></div>`; });
}
else {
    chartResult.houses.forEach(h => { const i = palaces.indexOf(h.palace); const starHua = n => h.tuHoa.filter(x => x.star === n).map(x => ` <span class="hoa-inline" title="${esc(x.name)}">${esc(x.name.replace('Hóa ', ''))}</span>`).join(''); inner[h.cell] = `<button aria-label="Chọn cung ${h.palace}" aria-pressed="${selectedPalace === i}" class="palace ${selectedPalace === i ? 'selected' : ''}" onclick="selectPalace(${i})"><div><small>${esc(h.stem)} ${esc(h.branch)} · ${h.isThan ? 'THÂN CƯ' : ''}</small><div style="margin-top:3px"><b>${esc(h.palace)}</b></div></div><div class="stars major-star-list">${h.stars.length ? h.stars.map(x => `<span class="major-star">${esc(x)}${chartLayer.hua ? starHua(x) : ''}</span>`).join('') : '<span class="no-star">Vô chính diệu</span>'}${chartLayer.aux ? h.auxiliaryStars.map(x => `<span class="aux-star">✧ ${esc(x)}${chartLayer.hua ? starHua(x) : ''}</span>`).join('') : ''}${chartLayer.yearStars ? h.yearStars.map(x => `<span class="aux-star year-star">✦ ${esc(x)}</span>`).join('') : ''}${chartLayer.hua && !chartLayer.aux ? h.tuHoa.filter(x => h.auxiliaryStars.includes(x.star)).map(x => `<span class="aux-hua-mark">${esc(x.name)} · ${esc(x.star)}</span>`).join('') : ''}</div>${layerTags(h)}<div class="tail"><span>☯</span><span>${String(i + 1).padStart(2, '0')}/12</span></div></button>`; });
} inner[5] = `<div class="chart-center"><h3>天 · 圖</h3><p id="chartPerson">${chartResult ? esc(chartInput.name) : 'Chưa tạo lá số'}</p><p>${chartResult ? `${esc(chartResult.yearCanChi)} · ${esc(chartResult.cuc.name)}` : 'Chọn ngày sinh và giờ sinh'}</p><span>${chartResult ? `Mệnh ${esc(chartResult.menh)} · Thân ${esc(chartResult.than)}` : '◈ ENGINE V6 ◈'}</span></div>`; return `<div class="chart-grid">${inner.map(x => x || '').join('')}</div>`; }
function toggleChartLayer(layer) { if (!Object.prototype.hasOwnProperty.call(chartLayer, layer))
    return; chartLayer[layer] = !chartLayer[layer]; refreshChartData(); }
function jumpToBranch(branch) { if (!chartResult)
    return; const h = chartResult.houses.find(x => x.branchIndex === branch); if (!h)
    return; selectPalace(palaces.indexOf(h.palace)); document.getElementById('palaceDetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function chart() { const r = chartResult; return `<section class="page-flair"><div><div class="eyebrow">PHÒNG NGHIÊN CỨU · TỬ VI ĐẨU SỐ</div><h2>Địa bàn mười hai cung</h2><p>Lập lá số theo bộ quy tắc có phiên bản. Có Đại hạn tuổi mụ, ba vòng sao và lớp Lưu Thái Tuế theo năm Can Chi. Chưa tính tiểu hạn và lưu niên đầy đủ.</p></div><span class="badge">☯ &nbsp; Astrology Engine V7</span></section><div class="page-subtabs"><span class="active">01 &nbsp; Thông tin</span><span class="active">02 &nbsp; 12 cung &amp; các sao</span><span class="active">03 &nbsp; Vòng sao & Đại hạn</span><span>04 &nbsp; Luận giải (chưa có)</span></div><div class="two-col"><aside><div class="rows">${chartForm()}<div class="card"><div class="eyebrow">THÔNG TIN TÍNH TOÁN</div><h3>${r ? 'Lá số đã được tính' : 'Chưa có dữ liệu cá nhân'}</h3>${r ? `<div class="pro-step"><span class="num">☯</span><div><strong>Dương: ${r.solar.day}/${r.solar.month}/${r.solar.year}</strong><p>Âm: ${r.lunar.day}/${r.lunar.month}/${r.lunar.year}${r.lunar.leap ? ' (nhuận)' : ''} · giờ ${esc(r.hourBranch)}</p></div></div><div class="pro-step"><span class="num">✦</span><div><strong>${esc(r.cuc.name)}</strong><p>Mệnh ${esc(r.menh)} · Thân tại ${esc(r.than)} (${esc(r.thanPalace)})</p></div></div><div class="pro-step"><span class="num">64</span><div><strong>14 chính · 14 phụ · 36 sao vòng</strong><p>Tử Vi ${esc(r.ziWei)} · Thiên Phủ ${esc(r.thienPhu)}</p></div></div><div class="tuhoa-panel"><strong>TỨ HÓA NIÊN SINH · ${esc(r.yearCanChi.split(' ')[0])}</strong>${r.transformations.map(h => `<button onclick="jumpToBranch(${h.branch})" title="Xem cung chứa sao này"><span class="hoa-marker ${h.name === 'Hóa Kỵ' ? 'caution' : ''}">${esc(h.name)}</span> <span>${esc(h.star)}</span><small>${esc(ThienDoTuVi.BRANCHES[h.branch])} ↗</small></button>`).join('')}</div><div class="subnotice validation-note">✓ ${ThienDoVerifier.check(r).passCount}/${ThienDoVerifier.check(r).total} kiểm tra cấu trúc đạt · chưa phải đối chiếu chuyên gia</div>${r.warnings.map(x => `<div class="subnotice caution">${esc(x)}</div>`).join('')}` : '<p class="tiny-note">Hãy nhập dữ liệu vào biểu mẫu. Trước đó, bảng 12 cung không hiển thị vị trí sao giả.</p>'}<div class="subnotice" style="margin-top:13px">Bộ quy tắc: <strong>tam-hop-core-v6.0</strong>. Cần đối chiếu thêm với chuyên gia, đặc biệt các dị bản Tứ Hóa và giờ Tý.</div></div></div></aside><section><div class="card"><div class="chart-head"><div><div class="eyebrow">ĐỊA BÀN ${r ? 'ĐÃ TÍNH' : 'CHƯA TÍNH'}</div><h2 class="serif" style="font-size:27px;margin:2px 0 6px">Tử vi · 12 cung</h2><span class="tiny-note">Chọn từng cung; kéo ngang địa bàn trên điện thoại để xem đầy đủ.</span></div><div class="chart-actions"><button onclick="downloadChartJSON()" title="Tải dữ liệu lá số, bao gồm thông tin sinh, xuống máy của bạn" ${r ? '' : 'disabled'}>⇩ Xuất JSON</button><button onclick="saveCurrentChart()" ${r ? '' : 'disabled'} title="Chỉ lưu khi đồng ý">▣ Lưu vào tài khoản</button><button onclick="resetPalace()">↺ Về cung Mệnh</button></div></div><div class="chart-layer-toolbar"><span>HIỂN THỊ</span><button data-layer="aux" aria-pressed="${chartLayer.aux}" onclick="toggleChartLayer('aux')">✧ 9 phụ tinh V4</button><button data-layer="yearStars" aria-pressed="${chartLayer.yearStars}" onclick="toggleChartLayer('yearStars')">✦ 5 sao theo năm</button><button data-layer="hua" aria-pressed="${chartLayer.hua}" onclick="toggleChartLayer('hua')">◈ Tứ Hóa</button><button data-layer="thaiTue" aria-pressed="${chartLayer.thaiTue}" onclick="toggleChartLayer('thaiTue')">☼ Vòng Thái Tuế</button><button data-layer="bacSi" aria-pressed="${chartLayer.bacSi}" onclick="toggleChartLayer('bacSi')">✧ Vòng Bác Sĩ</button><button data-layer="trangSinh" aria-pressed="${chartLayer.trangSinh}" onclick="toggleChartLayer('trangSinh')">❖ Vòng Tràng Sinh</button><button data-layer="daiHan" aria-pressed="${chartLayer.daiHan}" onclick="toggleChartLayer('daiHan')">◷ Đại hạn</button><button data-layer="annual" aria-pressed="${chartLayer.annual}" onclick="toggleChartLayer('annual')">◎ Lưu Thái Tuế</button></div><div class="cycle-controls"><label for="cycleYear">Năm Can Chi đang xem</label><select id="cycleYear" aria-label="Năm Can Chi tra cứu" onchange="selectCycleYear(this.value)">${Array.from({ length: 201 }, (_, i) => 1900 + i).map(y => `<option value="${y}" ${cycleYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select><span class="tiny-note" id="annualYearLabel">${r ? `Chi năm ${cycleYear}: ${ThienDoTuVi.BRANCHES[ThienDoCycles.yearBranch(cycleYear)]}` : 'Tạo lá số để xem'}</span></div><div class="chart-area">${chartGrid()}</div><div class="subnotice" style="margin-top:13px">${r ? 'Đã an 14 chính tinh + 14 phụ tinh + 4 Hóa niên sinh + 36 sao thuộc ba vòng + 12 đại hạn (tuổi mụ). Lưu Thái Tuế chỉ là vị trí chi năm; tiểu hạn và lưu niên đầy đủ chưa có.' : 'Chưa có dữ liệu tính toán. Không hiển thị lá số mẫu giả như kết quả thật.'}</div><div class="card soft palace-detail" id="palaceDetail">${palaceDetail()}</div></div><div class="card advanced" style="margin-top:16px"><div class="section-head"><h2 style="font-size:20px">Lớp dữ liệu chuyên sâu</h2><span class="tag">V6 · Có phân phiên bản</span></div><div class="detail-chips"><span class="tag">✓ 14 chính tinh</span><span class="tag">✓ 14 phụ tinh</span><span class="tag">✓ Tứ Hóa niên sinh</span><span class="tag">○ Miếu · Vượng · Hãm</span><span class="tag">✓ 3 vòng sao (36 sao)</span><span class="tag">✓ Đại hạn 10 năm</span><span class="tag">○ Tiểu hạn</span><span class="tag">○ Lưu niên đầy đủ</span><span class="tag">○ Phi hóa cung</span></div><p class="tiny-note" style="margin-top:13px">Tứ Hóa chỉ là dữ liệu theo năm sinh, không khẳng định kết quả tương lai. Bộ quy tắc cần xác minh chuyên môn; Tràng Sinh có dị bản điểm khởi khi đi nghịch.</p></div></section></div>`; }
function resetPalace() { selectPalace(0); selectedDetailTab = 'meaning'; setDetailTab('meaning'); }
function palaceDetail() { let h = chartResult?.houses.find(x => x.palace === palaces[selectedPalace]); return `<div class="section-head"><div><div class="eyebrow">KHÁM PHÁ 12 CUNG</div><h3>Cung ${esc(palaces[selectedPalace])}${h ? ` · ${esc(h.stem)} ${esc(h.branch)}` : ''}</h3></div><span class="tag">${String(selectedPalace + 1).padStart(2, '0')} / 12</span></div><div class="detail-tabs"><button class="${selectedDetailTab === 'meaning' ? 'active' : ''}" onclick="setDetailTab('meaning')">Ý nghĩa</button><button class="${selectedDetailTab === 'context' ? 'active' : ''}" onclick="setDetailTab('context')">Cách đọc</button><button class="${selectedDetailTab === 'research' ? 'active' : ''}" onclick="setDetailTab('research')">Nghiên cứu</button></div>${h ? `<div class="computed-banner"><strong>Chính tinh:</strong> ${h.stars.length ? h.stars.map(esc).join(' · ') : 'Vô chính diệu'}<div style="margin-top:6px"><strong>Phụ tinh V4 (9 sao):</strong> ${h.auxiliaryStars.length ? h.auxiliaryStars.map(esc).join(' · ') : 'Không có trong nhóm hiện hỗ trợ'}</div><div style="margin-top:6px"><strong>Sao theo chi năm (5 sao):</strong> ${h.yearStars.length ? h.yearStars.map(esc).join(' · ') : 'Không có tại cung này'}</div><div style="margin-top:6px"><strong>Đại hạn:</strong> ${h.daiHan.fromAge}–${h.daiHan.toAge} tuổi mụ (${h.cycleStars.trangSinh.join(', ')})</div><div style="margin-top:6px"><strong>3 vòng sao:</strong> ${h.cycleStars.thaiTue.join(', ')} · ${h.cycleStars.bacSi.join(', ')} · ${h.cycleStars.trangSinh.join(', ')}</div><div style="margin-top:6px"><strong>Lưu Thái Tuế ${cycleYear}:</strong> ${h.branchIndex === ThienDoCycles.yearBranch(cycleYear) ? 'Tại cung này' : 'Không ở cung này'}</div><div style="margin-top:6px"><strong>Tứ Hóa niên sinh:</strong> ${h.tuHoa.length ? h.tuHoa.map(x => `${esc(x.name)} (${esc(x.star)})`).join(' · ') : 'Không có tại cung này'}${h.isThan ? ' · Thân cư' : ''}</div></div>` : '<p class="tiny-note">Chưa có lá số được tính. Thông tin phía dưới là từ điển khái niệm cung.</p>'}${selectedDetailTab === 'meaning' ? `<p style="font-size:13px;line-height:1.75">${palaceGlossary[selectedPalace]}</p><p class="tiny-note">Đây là mô tả khái niệm, không phải luận giải số mệnh cá nhân.</p>` : selectedDetailTab === 'context' ? `<p style="font-size:12px;line-height:1.75">Khi nghiên cứu cung ${palaces[selectedPalace]}, cần xét chính tinh, phụ tinh, tổ hợp với các cung liên quan và hệ phái được chọn. Một cung không thể được suy đoán tách khỏi toàn lá số.</p>` : `<p style="font-size:12px;line-height:1.75">${h ? `Chi ${h.branch}, thiên can ${h.stem}, chính tinh: ${h.stars.length ? h.stars.map(esc).join(', ') : 'không có'}, phụ tinh: ${h.auxiliaryStars.length ? h.auxiliaryStars.map(esc).join(', ') : 'không có trong nhóm V6'}. Quy tắc: ${esc(chartResult.ruleSet)}, ${esc(chartResult.auxiliaryRuleSet)}, ${esc(chartResult.tuHoaRuleSet)}.` : 'Chưa có dữ liệu tính toán.'} Tham khảo bảng quy tắc gốc và lưu ý các dị bản hệ phái.</p>`}<div class="detail-chips"><span class="tag">${palaces[selectedPalace]}</span>${h ? `<span class="tag">${esc(h.branch)}</span>` : ''}<span class="tag">Tham khảo văn hóa</span></div>`; }
function selectPalace(i) { selectedPalace = i; document.querySelectorAll('.palace[aria-label]').forEach(el => { const active = el.getAttribute('aria-label') === `Chọn cung ${palaces[i]}`; el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); }); const el = document.getElementById('palaceDetail'); if (el)
    el.innerHTML = palaceDetail(); if (el && window.innerWidth < 760)
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function generateChart(e) {
    e.preventDefault();
    const form = e.target;
    const err = form.querySelector('#formError');
    err.textContent = '';
    const name = document.getElementById('userName').value.trim().slice(0, 70) || 'Người khám phá';
    const calendar = document.getElementById('birthCalendar').value;
    const birthTime = document.getElementById('birthTime').value;
    const [hour, minute] = birthTime.split(':').map(Number);
    const solarDate = document.getElementById('birthDate').value;
    const lunarDay = Number(document.getElementById('lunarDay').value), lunarMonth = Number(document.getElementById('lunarMonth').value), lunarYear = Number(document.getElementById('lunarYear').value), lunarLeap = document.getElementById('lunarLeap').checked, gender = document.getElementById('gender').value;
    try {
        const result = ThienDoTuVi.calculate({ date: calendar === 'solar' ? solarDate : `${String(lunarYear).padStart(4, '0')}-${String(lunarMonth).padStart(2, '0')}-${String(lunarDay).padStart(2, '0')}`, hour, minute, calendar, leap: lunarLeap, gender });
        const verification = ThienDoVerifier.check(result);
        if (!verification.passed)
            throw new Error('Kiểm tra cấu trúc lá số không đạt: ' + verification.checks.filter(x => !x.passed).map(x => x.name).join(', '));
        chartResult = result;
        chartGenerated = true;
        chartInput = { name, calendar, birthTime, solarDate, lunarDay, lunarMonth, lunarYear, lunarLeap, gender };
        selectedPalace = 0;
        selectedDetailTab = 'meaning';
        render();
        const feedback = document.createElement('div');
        feedback.className = 'subnotice form-notice';
        feedback.style.marginTop = '12px';
        feedback.setAttribute('role', 'status');
        feedback.textContent = `Đã tính 12 cung, 14 chính tinh, 14 phụ tinh, 36 sao vòng và 12 đại hạn: ${result.yearCanChi} · ${result.cuc.name}.`;
        document.getElementById('birthForm').appendChild(feedback);
    }
    catch (ex) {
        err.className = 'subnotice caution';
        err.style.marginTop = '12px';
        err.textContent = ex.message || 'Không thể tính lá số với dữ liệu nhập.';
    }
}
function downloadChartJSON() {
    if (!chartResult)
        return;
    const payload = {
        application: 'THIÊN ĐỒ', version: 'V6', exportedAt: new Date().toISOString(),
        warning: 'Tệp này chứa dữ liệu ngày giờ sinh cá nhân. Chỉ chia sẻ khi bạn đồng ý.',
        input: { ...chartInput }, calculated: chartResult,
        structuralValidation: ThienDoVerifier.check(chartResult)
    };
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thien-do-la-so-v6-' + chartResult.solar.year + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
