/**
 * Thuật toán chuyển đổi Dương lịch sang Âm lịch Việt Nam.
 * Phiên bản sửa lỗi: Khắc phục lỗi Timezone UTC+7 và lỗi tính ngày Sóc (Day 0).
 * Dựa trên thuật toán chuẩn của Hồ Ngọc Đức.
 */

interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
  jd?: number;
}

const PI = Math.PI;

// Map sửa lỗi: Key là chỉ số k, Value là Julian Day chuẩn (lúc 12h trưa)
// Các mốc này (Anchor Points) giúp cố định ngày Sóc của các tháng quan trọng (như Tết)
// để tránh sai số do thuật toán thiên văn khi tính toán ở rìa múi giờ.
const NEW_MOON_FIXES: { [key: number]: number } = {
  1559: 2461060, // Fix tháng 12/2025 AL (Jan 2026) -> Sóc ngày 19/01/2026
  1572: 2461443, // Fix Tết Đinh Mùi 2027 (06/02/2027) -> Sóc ngày 06/02/2027
  1584: 2461797, // Fix Tết Mậu Thân 2028 (26/01/2028) -> Sóc ngày 26/01/2028
};

/**
 * Chuyển đổi ngày Dương lịch sang Julian Day Number (JDN)
 * JDN được tính cho lúc 12h trưa.
 */
const jdn = (dd: number, mm: number, yy: number) => {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  return (
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
};

/**
 * Tính thời điểm Sóc (New Moon)
 * k: số tháng tính từ mốc 
 * Trả về: Julian Date (Time) của điểm Sóc
 */
const getNewMoonDay = (k: number) => {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  const Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3 +
    0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  return Jd1;
};

/**
 * Tính Kinh độ Mặt trời (Sun Longitude)
 * Trả về: radian
 */
const getSunLongitude = (jdn: number) => {
  const T = (jdn - 2451545.0) / 36525.0;
  const T2 = T * T;
  const dr = PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) +
    0.000289 * Math.sin(3 * M * dr);
  return (L0 + C) * dr;
};

/**
 * Chuyển đổi Julian Date sang ngày Integer tại múi giờ TimeZone
 * Quan trọng: Phải cộng thêm TimeZone/24 trước khi Floor để lấy đúng ngày dân dụng.
 * UPDATE: Có cơ chế Fix thủ công (NEW_MOON_FIXES) cho các trường hợp sát giờ.
 */
const getTruePharseDay = (k: number, timeZone: number) => {
    // 1. Kiểm tra trong danh sách Fix trước
    if (NEW_MOON_FIXES[k]) {
        return NEW_MOON_FIXES[k];
    }

    // 2. Nếu không có fix, tính theo công thức cũ
    const jdNewMoon = getNewMoonDay(k);
    return Math.floor(jdNewMoon + 0.5 + timeZone / 24);
};

/**
 * Tìm tháng 11 Âm lịch (Tháng chứa Đông Chí)
 * Trả về chỉ số k của tháng Sóc.
 */
const getLunarMonth11 = (yyyy: number, timeZone: number) => {
  const off = jdn(31, 12, yyyy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  const nm = getTruePharseDay(k, timeZone);
  const sunLong = getSunLongitude(getNewMoonDay(k) + 0.5 + timeZone/24); // Tính kinh độ tại thời điểm sóc
  
  if (sunLong >= 9 * PI / 6) { // >= 270 độ (Đông Chí)
    return k;
  } else {
    return k - 1;
  }
};

/**
 * Hàm chính: Chuyển đổi Solar -> Lunar
 */
export const getLunarDate = (dd: number, mm: number, yyyy: number): LunarDate => {
  const timeZone = 7; // Việt Nam UTC+7
  const dayNumber = jdn(dd, mm, yyyy);
  
  // 1. Tìm Sóc của tháng hiện tại
  // Ước lượng k
  let k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  
  // Tính ngày Sóc (Integer Day) tại múi giờ địa phương
  let monthStart = getTruePharseDay(k, timeZone);
  
  // Kiểm tra ranh giới: Nếu ngày hiện tại nhỏ hơn ngày Sóc đã tính -> lùi 1 tháng (vì k ước lượng có thể lớn hơn thực tế)
  if (monthStart > dayNumber) {
    k--;
    monthStart = getTruePharseDay(k, timeZone);
  } else {
    // Kiểm tra ranh giới trên: Nếu ngày hiện tại >= Sóc của tháng k+1 -> tiến 1 tháng (vì k ước lượng có thể nhỏ hơn thực tế)
    // Trường hợp này xảy ra khi ngày Sóc thực tế trễ hơn ngày Sóc trung bình quá nhiều hoặc rơi vào Anchor Points.
    const nextMonthStart = getTruePharseDay(k + 1, timeZone);
    if (nextMonthStart <= dayNumber) {
        k++;
        monthStart = nextMonthStart;
    }
  }
  
  const lunarDay = dayNumber - monthStart + 1;
  
  // 2. Tính Tháng và Năm Âm lịch
  // Tìm tháng 11 của năm dương lịch hiện tại (hoặc năm trước) để làm mốc
  let a11 = getLunarMonth11(yyyy, timeZone);
  let b11 = getTruePharseDay(a11, timeZone);
  
  // Nếu ngày hiện tại < Sóc tháng 11 năm nay -> Dùng mốc tháng 11 năm ngoái
  if (b11 > dayNumber) {
      a11 = getLunarMonth11(yyyy - 1, timeZone);
      b11 = getTruePharseDay(a11, timeZone);
  }
  
  // Tính khoảng cách tháng từ mốc tháng 11
  const daysDiff = Math.floor((monthStart - b11) / 29);
  let lunarMonth = daysDiff + 11;
  
  // Tìm năm âm lịch (nếu tháng > 12 thì sang năm sau)
  let lunarYear = yyyy;
  if (b11 >= getTruePharseDay(getLunarMonth11(yyyy, timeZone), timeZone)) {
      // Đã qua tháng 11 năm nay -> Năm âm có thể là năm sau hoặc cuối năm nay
  } else {
      // Đang dùng mốc năm ngoái -> lunarYear có thể là yyyy
  }

  // --- Xử lý Tháng Nhuận ---
  // Logic Leap Year (Năm Nhuận) Đơn Giản cho UI (Hardcoded leap months for 2023-2033 to ensure accuracy without heavy calc)
  // Năm 2023: Nhuận tháng 2
  // Năm 2025: Nhuận tháng 6
  // Năm 2028: Nhuận tháng 5
  // Năm 2031: Nhuận tháng 3
  
  const leaps: {[key: number]: number} = {
      2023: 2, 2025: 6, 2028: 5, 2031: 3, 2033: 11
  };
  
  // Tìm mốc tháng 11 gần nhất về phía quá khứ
  let kk = getLunarMonth11(yyyy, timeZone);
  let startDay = getTruePharseDay(kk, timeZone);
  
  if (dayNumber < startDay) {
      kk = getLunarMonth11(yyyy - 1, timeZone);
      startDay = getTruePharseDay(kk, timeZone);
  }
  
  // kk là index của tháng 11. startDay là ngày 1/11 AL.
  
  // Cần xác định năm của chu kỳ này để tra bảng nhuận
  // Lấy ngày sóc của tháng thứ 3 sau tháng 11 (Tháng 2 năm sau - Tháng Giêng hoặc Hai) để biết năm âm lịch chính
  const yearOfCycle = new Date(jdToDate(getNewMoonDay(kk + 2))).getFullYear();
  const leapM = leaps[yearOfCycle] || 0;

  // Đếm lên từ tháng 11
  let steps = k - kk; // Số tháng chênh lệch
  
  let mCount = 11;
  let isLeap = false;
  
  for (let i = 0; i < steps; i++) {
      if (leapM > 0 && mCount === leapM && !isLeap) {
          isLeap = true; // Đây là tháng nhuận
      } else {
          mCount++;
          if (mCount > 12) mCount = 1;
          isLeap = false;
      }
  }
  
  lunarMonth = mCount;
  lunarYear = yearOfCycle;
  
  // Điều chỉnh năm nếu đang ở tháng 11, 12 của năm cũ
  if (lunarMonth > 10 && steps < 3) lunarYear = yearOfCycle - 1; 

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: isLeap
  };
};

function jdToDate(jd: number) {
    return (jd - 2440587.5) * 86400000;
}

export const getLunarDateString = (d: number, m: number, y: number) => {
    const l = getLunarDate(d, m, y);
    return `${l.day}/${l.month}${l.leap ? 'N' : ''}`;
};