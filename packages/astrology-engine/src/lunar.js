/*
 * THIÊN ĐỒ — Vietnamese astronomical lunisolar arithmetic (1900–2100, UTC+7).
 * Independently written implementation of published new-moon, solar-longitude,
 * and Julian-day formulae associated with the Hồ Ngọc Đức approach.
 * Interpret results as a calendrical implementation requiring further external
 * ephemeris comparison before use in critical applications.
 * No dependencies; supports browser + Node CommonJS.
 */
(function (root) {
    'use strict';
    const PI = Math.PI, FLOOR = Math.floor, TZ = 7;
    function validSolar(y, m, d) { return Number.isInteger(y) && y >= 1900 && y <= 2100 && Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(d) && d >= 1 && d <= 31 && new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === `${y.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
    function jd(d, m, y) {
        let a = FLOOR((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
        let j = d + FLOOR((153 * mm + 2) / 5) + 365 * yy + FLOOR(yy / 4) - FLOOR(yy / 100) + FLOOR(yy / 400) - 32045;
        if (j < 2299161)
            j = d + FLOOR((153 * mm + 2) / 5) + 365 * yy + FLOOR(yy / 4) - 32083;
        return j;
    }
    function jdToDate(j) {
        let a, b, c;
        if (j > 2299160) {
            a = j + 32044;
            b = FLOOR((4 * a + 3) / 146097);
            c = a - FLOOR(b * 146097 / 4);
        }
        else {
            b = 0;
            c = j + 32082;
        }
        const d = FLOOR((4 * c + 3) / 1461), e = c - FLOOR(1461 * d / 4), m = FLOOR((5 * e + 2) / 153);
        const day = e - FLOOR((153 * m + 2) / 5) + 1, month = m + 3 - 12 * FLOOR(m / 10), year = b * 100 + d - 4800 + FLOOR(m / 10);
        return { year, month, day };
    }
    function newMoonDay(k, tz = TZ) {
        const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
        const j1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
        const j2 = j1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
        const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
        const Mp = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
        const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
        let corr = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * M * dr) - 0.4068 * Math.sin(Mp * dr) + 0.0161 * Math.sin(2 * Mp * dr) - 0.0004 * Math.sin(3 * Mp * dr)
            + 0.0104 * Math.sin(2 * F * dr) - 0.0051 * Math.sin((M + Mp) * dr) - 0.0074 * Math.sin((M - Mp) * dr) + 0.0004 * Math.sin((2 * F + M) * dr)
            - 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mp) * dr) + 0.0010 * Math.sin((2 * F - Mp) * dr) + 0.0005 * Math.sin((2 * Mp + M) * dr);
        const delta = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
        return FLOOR(j2 + corr - delta + 0.5 + tz / 24);
    }
    function solarSector(j, tz = TZ) {
        const t = (j - 2451545.5 - tz / 24) / 36525, t2 = t * t, dr = PI / 180;
        const M = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
        const L0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
        const dl = (1.914600 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * M) + (0.019993 - 0.000101 * t) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
        const L = ((L0 + dl) % 360 + 360) % 360;
        return FLOOR(L / 30);
    }
    function month11(y, tz = TZ) { const k = FLOOR((jd(31, 12, y) - 2415021) / 29.530588853); let nm = newMoonDay(k, tz); if (solarSector(nm, tz) >= 9)
        nm = newMoonDay(k - 1, tz); return nm; }
    function leapOffset(a11, tz = TZ) {
        const k = FLOOR(0.5 + (a11 - 2415021.076998695) / 29.530588853);
        let old = -1, i = 1, sector = solarSector(newMoonDay(k + i, tz), tz);
        do {
            old = sector;
            i++;
            sector = solarSector(newMoonDay(k + i, tz), tz);
        } while (sector !== old && i < 14);
        return i - 1;
    }
    function solarToLunar(year, month, day) {
        if (!validSolar(year, month, day))
            throw new RangeError('Ngày dương không hợp lệ hoặc ngoài 1900–2100');
        const dayNumber = jd(day, month, year), k = FLOOR((dayNumber - 2415021.076998695) / 29.530588853);
        let cursor = k + 1, start = newMoonDay(cursor);
        // Astronomical approximations may put the initial lunation index one off.
        for (let n = 0; start > dayNumber && n < 3; n++) {
            cursor--;
            start = newMoonDay(cursor);
        }
        for (let n = 0; newMoonDay(cursor + 1) <= dayNumber && n < 3; n++) {
            cursor++;
            start = newMoonDay(cursor);
        }
        let a11 = month11(year), b11 = a11, lunarYear;
        if (a11 >= start) {
            lunarYear = year;
            a11 = month11(year - 1);
        }
        else {
            lunarYear = year + 1;
            b11 = month11(year + 1);
        }
        const lunarDay = dayNumber - start + 1, diff = FLOOR((start - a11) / 29);
        let lunarMonth = diff + 11, leap = false;
        if (b11 - a11 > 365) {
            const p = leapOffset(a11);
            if (diff >= p) {
                lunarMonth = diff + 10;
                if (diff === p)
                    leap = true;
            }
        }
        if (lunarMonth > 12)
            lunarMonth -= 12;
        if (lunarMonth >= 11 && diff < 4)
            lunarYear--;
        return { year: lunarYear, month: lunarMonth, day: lunarDay, leap };
    }
    function lunarToSolar(year, month, day, leap = false) {
        // Do not coerce strings/numbers to booleans: the lunar and leap months
        // can share a month number, so a truthy string like 'false' changes the date.
        if (typeof leap !== 'boolean')
            throw new RangeError('Cờ tháng nhuận phải là giá trị boolean');
        if (!Number.isInteger(year) || year < 1899 || year > 2101 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30)
            throw new RangeError('Ngày âm không hợp lệ hoặc ngoài 1900–2100');
        let a11, b11;
        if (month < 11) {
            a11 = month11(year - 1);
            b11 = month11(year);
        }
        else {
            a11 = month11(year);
            b11 = month11(year + 1);
        }
        let off = month - 11;
        if (off < 0)
            off += 12;
        if (b11 - a11 > 365) {
            const p = leapOffset(a11), leapMonth = (p + 10) % 12 || 12;
            if (leap && month !== leapMonth)
                throw new RangeError('Tháng nhuận không tồn tại trong năm được chọn');
            if (leap || off >= p)
                off++;
        }
        else if (leap) {
            throw new RangeError('Năm âm này không có tháng nhuận');
        }
        const k = FLOOR(0.5 + (a11 - 2415021.076998695) / 29.530588853), start = newMoonDay(k + off), out = jdToDate(start + day - 1);
        if (!validSolar(out.year, out.month, out.day))
            throw new RangeError('Kết quả ngoài giới hạn hỗ trợ');
        const round = solarToLunar(out.year, out.month, out.day);
        if (round.year !== year || round.month !== month || round.day !== day || round.leap !== leap)
            throw new RangeError('Ngày âm vượt số ngày trong tháng hoặc tháng nhuận không hợp lệ');
        return out;
    }
    const api = Object.freeze({ solarToLunar, lunarToSolar, jd, validSolar });
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.ThienDoLunar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
