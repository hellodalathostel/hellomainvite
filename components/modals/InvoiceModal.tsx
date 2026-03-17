
import React, { useState } from 'react';
import { Printer, X, Copy, Globe } from 'lucide-react';
import { InvoiceData, PropertyInfo } from '../../types/types';
import { formatCurrency } from '../../utils/utils';
import { useUI } from '../../context/UIContext';

interface InvoiceModalProps {
  show: boolean;
  onClose: () => void;
  data: InvoiceData | null;
  propertyInfo: PropertyInfo;
  zaloTemplate?: string;
}

const INVOICE_TEXT = {
  vi: {
    title: "HÓA ĐƠN THANH TOÁN",
    printDate: "Ngày in",
    guest: "KHÁCH HÀNG",
    checkIn: "CHECK-IN",
    checkOut: "CHECK-OUT",
    services: "DỊCH VỤ SỬ DỤNG",
    surcharge: "Phí dịch vụ / Thẻ",
    total: "Tổng cộng",
    paid: "Đã thanh toán",
    balance: "CÒN LẠI",
    paidFull: "ĐÃ THANH TOÁN ĐỦ",
    bankInfo: "THÔNG TIN CHUYỂN KHOẢN",
    accNum: "STK",
    accOwner: "Chủ TK",
    qrHint: "Quét để chuyển khoản",
    footerDefault: "Hẹn gặp lại quý khách!",
    cut: "→ CẮT PHIẾU"
  },
  en: {
    title: "RECEIPT / INVOICE",
    printDate: "Print Date",
    guest: "GUEST NAME",
    checkIn: "CHECK-IN",
    checkOut: "CHECK-OUT",
    services: "SERVICES USED",
    surcharge: "Surcharge / Fees",
    total: "Total",
    paid: "Paid / Deposit",
    balance: "BALANCE DUE",
    paidFull: "FULLY PAID",
    bankInfo: "BANK TRANSFER INFO",
    accNum: "Account No.",
    accOwner: "Account Name",
    qrHint: "Scan to transfer",
    footerDefault: "Thank you for staying with us!",
    cut: "→ CUT HERE"
  }
};

const InvoiceModal: React.FC<InvoiceModalProps> = ({ show, onClose, data, propertyInfo, zaloTemplate }) => {
  const { addToast } = useUI();
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  if (!show || !data) return null;

  const t = INVOICE_TEXT[lang];

  const handlePrint = () => window.print();

  const handleCopyZalo = () => {
    const itemsList = data.items.map(i => {
      const isDiscount = i.amount < 0;
      return `${isDiscount ? '🎁' : '▪️'} ${i.desc}: ${formatCurrency(Math.abs(i.amount))}`;
    }).join('\n');

    let text = '';

    if (zaloTemplate) {
      text = zaloTemplate;
      text = text.replace(/{guestName}/g, data.guestName);
      text = text.replace(/{phone}/g, data.phone || '...');
      text = text.replace(/{checkIn}/g, data.checkIn);
      text = text.replace(/{checkOut}/g, data.checkOut);
      text = text.replace(/{total}/g, formatCurrency(data.total));
      text = text.replace(/{deposit}/g, formatCurrency(data.paid));
      text = text.replace(/{balance}/g, formatCurrency(data.balance));
      if (text.includes('{items}')) text = text.replace(/{items}/g, itemsList);
    } else {
      const mapLink = propertyInfo.address ? `https://maps.google.com/?q=${encodeURIComponent(propertyInfo.address)}` : '';
      const roomLineCount = data.items.filter(i => i.roomId).length;
      const scopeLabel = data.isGroupInvoice ? `ĐOÀN (${roomLineCount} phòng)` : 'PHÒNG';

      text = `🧾 *HÓA ĐƠN THANH TOÁN*
🏨 *${propertyInfo.name}*
----------------------------
👋 Khách hàng: *${data.guestName}*
      🏷️ Phạm vi: ${scopeLabel}
📅 Ngày: ${data.date}
📥 Check-in: ${data.checkIn}
📤 Check-out: ${data.checkOut}
----------------------------
CHI TIẾT:
${itemsList}
${data.surcharge > 0 ? `💳 Phí dịch vụ: ${formatCurrency(data.surcharge)}` : ''}
----------------------------
💰 TỔNG CỘNG: *${formatCurrency(data.total)}*
✅ ĐÃ THANH TOÁN: ${formatCurrency(data.paid)}
${data.balance > 0 ? `👉 CÒN LẠI: ${formatCurrency(data.balance)}` : '🎉 ĐÃ THANH TOÁN ĐỦ'}
----------------------------
${propertyInfo.invoiceFooter || 'Cảm ơn và hẹn gặp lại!'}
📍 Vị trí: ${mapLink}`;
    }

    navigator.clipboard.writeText(text);
    addToast('Đã sao chép hóa đơn Zalo!', 'success');
  };

  const titleText = data.isGroupInvoice ? `${t.title} — ĐOÀN` : t.title;

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center px-4 pt-4 pb-safe-modal backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">

        {/* Action Bar — hidden on print */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center print:hidden">
          <div className="flex gap-2 items-center">
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
              <X size={20} />
            </button>
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors text-gray-700"
            >
              <Globe size={14} /> {lang === 'vi' ? 'EN' : 'VI'}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopyZalo} className="bg-blue-50 text-blue-800 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-200">
              <Copy size={15} /> Zalo
            </button>
            <button onClick={handlePrint} className="bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-800 transition-all shadow-md">
              <Printer size={15} /> In
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="overflow-y-auto custom-scrollbar bg-white print-only">

          {/* Green accent bar */}
          <div className="h-1.5 bg-green-700 w-full" />

          <div className="p-6">

            {/* Header: Logo + Property Info */}
            <div className="flex items-start gap-3 mb-5">
              {propertyInfo.logoUrl && (
                <img src={propertyInfo.logoUrl} alt="logo" className="h-16 w-auto object-contain flex-shrink-0" />
              )}
              <div className="flex-1">
                <h1 className="text-base font-black text-gray-900 uppercase leading-tight">{propertyInfo.name}</h1>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{propertyInfo.address}</p>
                <p className="text-xs text-gray-500">Hotline: {propertyInfo.phone}</p>
              </div>
            </div>

            <hr className="border-gray-200 mb-5" />

            {/* Title */}
            <div className="flex justify-center mb-4">
              <span className="border border-gray-800 px-5 py-1.5 text-[11px] font-black uppercase tracking-widest text-gray-900">
                {titleText}
              </span>
            </div>

            {/* Print Date */}
            <p className="text-right text-[10px] text-gray-400 mb-5">{t.printDate}: {data.date}</p>

            {/* Guest Info */}
            <div className="space-y-2.5 mb-5 text-[12px]">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t.guest}</span>
                <span className="font-black text-gray-900 text-sm">{data.guestName}</span>
              </div>
              {data.otaBookingNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">BOOKING NO.</span>
                  <span className="bg-green-700 text-white text-[10px] font-black px-2 py-0.5 rounded">
                    {data.otaBookingNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t.checkIn}</span>
                <span className="font-semibold text-gray-800">{data.checkIn} (14:00)</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t.checkOut}</span>
                <span className="font-semibold text-gray-800">{data.checkOut} (12:00)</span>
              </div>
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Section: Services */}
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t.services}</p>

            <div className="space-y-2 mb-5">
              {data.items.map((item, i) => {
                const lines = item.desc.split('\n');

                if (item.roomId) {
                  // Room card
                  return (
                    <div key={i} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-green-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0">
                            {item.roomId}
                          </span>
                          <span className="font-bold text-[13px] text-gray-900">{lines[0]}</span>
                        </div>
                        <span className="font-black text-[13px] text-gray-900 whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      {lines[1] && (
                        <p className="text-[10px] text-gray-500 mt-1 ml-0">{lines[1]}</p>
                      )}
                    </div>
                  );
                } else if (item.amount < 0) {
                  // Discount
                  return (
                    <div key={i} className="flex justify-between items-center text-[12px] px-1">
                      <span className="text-gray-500 italic">{item.desc.replace(/^- Ưu đãi: /, '')}</span>
                      <span className="text-green-700 font-bold whitespace-nowrap">− {formatCurrency(Math.abs(item.amount))}</span>
                    </div>
                  );
                } else {
                  // Service
                  return (
                    <div key={i} className="flex justify-between items-center text-[12px] px-1">
                      <span className="text-gray-700">{item.desc.replace(/^\+ DV: /, '')}</span>
                      <span className="font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(item.amount)}</span>
                    </div>
                  );
                }
              })}

              {data.surcharge > 0 && (
                <div className="flex justify-between items-center text-[12px] px-1">
                  <span className="text-gray-500 italic">{t.surcharge}</span>
                  <span className="font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(data.surcharge)}</span>
                </div>
              )}
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Summary */}
            <div className="space-y-2 mb-4 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">{t.total}</span>
                <span className="font-semibold text-gray-800">{formatCurrency(data.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">{t.paid}</span>
                <span className="font-semibold text-gray-800">{formatCurrency(data.paid)}</span>
              </div>
            </div>

            {/* Balance Box */}
            <div className="border border-gray-300 rounded-lg p-3 flex justify-between items-center mb-5">
              <span className="font-black text-[11px] uppercase tracking-wider text-gray-800">{t.balance}</span>
              <span className={`font-black text-xl ${data.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                {data.balance > 0 ? `${formatCurrency(data.balance)}` : t.paidFull}
              </span>
            </div>

            {/* Bank Info */}
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t.bankInfo}</p>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-[12px] text-gray-600 mb-0.5">{propertyInfo.bankName || 'Vietcombank'}</p>
                  <p className="text-xl font-black text-gray-900 tracking-widest leading-tight">
                    {propertyInfo.bankAccountNumber}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {t.accOwner}: <span className="font-bold text-gray-800 uppercase">{propertyInfo.bankOwner}</span>
                  </p>
                </div>
                {propertyInfo.qrUrl && (
                  <div className="flex flex-col items-center flex-shrink-0">
                    <img src={propertyInfo.qrUrl} alt="QR" className="w-20 h-20 object-contain" />
                    <p className="text-[9px] text-gray-400 mt-1 text-center">{t.qrHint}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <p className="text-center italic text-[11px] text-gray-500 mb-5">
              {(lang === 'vi' && propertyInfo.invoiceFooter) ? propertyInfo.invoiceFooter : t.footerDefault}
            </p>

            {/* Cut Line */}
            <div className="border-t border-dashed border-gray-300 pt-2 flex items-center justify-center print:hidden">
              <span className="text-[9px] text-gray-400 font-bold tracking-widest">{t.cut}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
