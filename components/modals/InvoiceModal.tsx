
import React, { useState } from 'react';
import { Printer, X, Scissors, Copy, Globe } from 'lucide-react';
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
    phone: "SỐ ĐIỆN THOẠI",
    checkIn: "CHECK-IN",
    checkOut: "CHECK-OUT",
    desc: "Diễn giải",
    amount: "Thành tiền",
    surcharge: "Phí dịch vụ / Thẻ",
    total: "TỔNG CỘNG",
    paid: "ĐÃ THANH TOÁN",
    balance: "CÒN LẠI",
    paidFull: "ĐÃ THANH TOÁN ĐỦ",
    bankInfo: "Thông tin chuyển khoản",
    bankName: "Ngân hàng",
    accNum: "STK",
    accOwner: "Chủ TK",
    note: "Vui lòng giữ phiếu này để đối soát.",
    footerDefault: "Hẹn gặp lại quý khách!",
    cut: "Cắt phiếu"
  },
  en: {
    title: "RECEIPT / INVOICE",
    printDate: "Print Date",
    guest: "GUEST NAME",
    phone: "PHONE NUMBER",
    checkIn: "CHECK-IN",
    checkOut: "CHECK-OUT",
    desc: "Description",
    amount: "Amount",
    surcharge: "Surcharge / Fees",
    total: "TOTAL",
    paid: "PAID / DEPOSIT",
    balance: "BALANCE DUE",
    paidFull: "FULLY PAID",
    bankInfo: "Bank Transfer Info",
    bankName: "Bank Name",
    accNum: "Account No.",
    accOwner: "Account Name",
    note: "Please keep this receipt for your records.",
    footerDefault: "Thank you for staying with us!",
    cut: "Cut Here"
  }
};

const InvoiceModal: React.FC<InvoiceModalProps> = ({ show, onClose, data, propertyInfo, zaloTemplate }) => {
  const { addToast } = useUI();
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  
  if (!show || !data) return null;

  const t = INVOICE_TEXT[lang];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyZalo = () => {
      // Common Item List Generator
      const itemsList = data.items.map(i => {
          const isDiscount = i.amount < 0;
          return `${isDiscount ? '🎁' : '▪️'} ${i.desc}: ${formatCurrency(Math.abs(i.amount))}`;
      }).join('\n');

      let text = '';
      
      if (zaloTemplate) {
          text = zaloTemplate;
          // Basic Fields
          text = text.replace(/{guestName}/g, data.guestName);
          text = text.replace(/{phone}/g, data.phone || '...');
          text = text.replace(/{checkIn}/g, data.checkIn);
          text = text.replace(/{checkOut}/g, data.checkOut);
          
          // Money Fields
          text = text.replace(/{total}/g, formatCurrency(data.total));
          text = text.replace(/{deposit}/g, formatCurrency(data.paid));
          text = text.replace(/{balance}/g, formatCurrency(data.balance));

          if (text.includes('{items}')) {
               text = text.replace(/{items}/g, itemsList);
          }

      } else {
        const mapLink = propertyInfo.address ? `https://maps.google.com/?q=${encodeURIComponent(propertyInfo.address)}` : '';
        const roomLineCount = data.items.filter(i => !i.desc.startsWith('+') && !i.desc.startsWith('-')).length;
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

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center px-4 pt-4 pb-safe-modal backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">
        
        {/* Actions Header - Hidden on Print */}
        <div className="p-4 bg-gray-100 border-b border-gray-300 flex justify-between items-center print:hidden">
            <div className="flex gap-2 items-center">
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-700 transition-colors">
                    <X size={20}/>
                </button>
                <button 
                    onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors text-gray-800"
                >
                    <Globe size={14}/> {lang === 'vi' ? 'EN' : 'VI'}
                </button>
            </div>
            <div className="flex gap-2">
                <button onClick={handleCopyZalo} className="bg-blue-100 text-blue-900 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-200 transition-all border border-blue-200">
                    <Copy size={16}/> Zalo
                </button>
                <button onClick={handlePrint} className="bg-blue-800 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20">
                    <Printer size={16}/> Print
                </button>
            </div>
        </div>

        {/* Receipt Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar font-mono text-[11px] bg-white text-gray-900 print:p-8 print-only">
          
          <div className="text-center mb-6">
            <h1 className="text-base font-black uppercase tracking-tighter text-gray-900 leading-tight">{propertyInfo.name}</h1>
            <p className="text-gray-800 mt-1 leading-relaxed font-medium">{propertyInfo.address}</p>
            <p className="text-gray-800 font-bold">Hotline: {propertyInfo.phone}</p>
            
            <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-0.5 bg-gray-400"></div>
              <h2 className="text-xs font-black uppercase tracking-[0.1em] px-2 whitespace-nowrap text-gray-900 border-2 border-gray-900 p-1 rounded">{data.isGroupInvoice ? `${t.title} - ĐOÀN` : t.title}</h2>
                <div className="flex-1 h-0.5 bg-gray-400"></div>
            </div>
            <p className="text-[10px] font-bold text-gray-700 text-right">{t.printDate}: {data.date}</p>
            
            {propertyInfo.invoiceHeader && lang === 'vi' && (
                <p className="mt-2 italic text-gray-700 px-4 font-medium">"{propertyInfo.invoiceHeader}"</p>
            )}
          </div>

          <div className="mb-6 space-y-2 pb-4 border-b-2 border-dashed border-gray-400">
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
                <span className="text-gray-700 font-bold">{t.guest}:</span>
                <span className="font-black text-gray-900 text-sm">{data.guestName}</span>
            </div>
            {data.phone && (
                <div className="flex justify-between items-end">
                    <span className="text-gray-700 font-bold">{t.phone}:</span>
                    <span className="font-bold text-gray-900">{data.phone}</span>
                </div>
            )}
            <div className="flex justify-between items-end">
                <span className="text-gray-700 font-bold">{t.checkIn}:</span>
                <span className="font-bold text-gray-900">{data.checkIn} (14:00)</span>
            </div>
            <div className="flex justify-between items-end">
                <span className="text-gray-700 font-bold">{t.checkOut}:</span>
                <span className="font-bold text-gray-900">{data.checkOut} (12:00)</span>
            </div>
          </div>

          <div className="space-y-0 mb-8">
            {/* Table Header */}
            <div className="flex justify-between font-black text-[10px] uppercase bg-gray-200 p-2 rounded-t mb-2 border-b border-gray-400 text-gray-900">
                <span>{t.desc}</span>
                <span>{t.amount}</span>
            </div>
            
            {/* Table Body */}
            <div className="space-y-3 px-2">
                {data.items.map((item, i) => {
                    const isDiscount = item.amount < 0;
                    return (
                        <div key={i} className="flex justify-between items-start gap-4 border-b border-gray-100 pb-2 last:border-0">
                            <span className={`${isDiscount ? 'text-gray-700 italic' : 'font-bold text-gray-900'} leading-relaxed whitespace-pre-wrap`}>
                                {item.desc}
                            </span>
                            <span className={`font-black whitespace-nowrap ${isDiscount ? 'text-gray-700' : 'text-gray-900'}`}>
                                {isDiscount ? '-' : ''}{formatCurrency(Math.abs(item.amount))}
                            </span>
                        </div>
                    );
                })}
                
                {data.surcharge > 0 && (
                    <div className="flex justify-between items-start text-gray-700 pt-2">
                        <span className="font-bold italic">{t.surcharge}</span>
                        <span className="font-black">{formatCurrency(data.surcharge)}</span>
                    </div>
                )}
            </div>
          </div>

          <div className="border-t-2 border-gray-900 border-dashed pt-4 space-y-2">
            <div className="flex justify-between items-end">
              <span className="uppercase tracking-widest font-bold text-gray-800">{t.total}</span>
              <span className="text-sm font-black text-gray-900">{formatCurrency(data.total)}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="font-bold text-gray-700">{t.paid}</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.paid)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-300">
              <span className="text-blue-900 font-black uppercase text-xs">{t.balance}</span>
              <span className={`text-lg font-black ${data.balance > 0 ? 'text-red-700' : 'text-blue-900'}`}>
                  {data.balance > 0 ? formatCurrency(data.balance) : t.paidFull}
              </span>
            </div>
          </div>

          {/* Bank & QR Section */}
          <div className="mt-8 flex gap-4 items-start bg-gray-100 p-4 border border-gray-400 rounded-2xl">
             <div className="flex-1 text-[10px] leading-relaxed">
                <p className="font-black text-blue-900 uppercase mb-2 border-b border-blue-200 pb-1">{t.bankInfo}:</p>
                <p className="font-bold text-gray-900 text-xs">{propertyInfo.bankName || 'Vietcombank (VCB)'}</p>
                <div className="flex items-center gap-1 mt-1">
                   <span className="text-gray-700">{t.accNum}:</span>
                   <span className="font-black text-base text-gray-900 tracking-wider">{propertyInfo.bankAccountNumber || '1014095502'}</span>
                </div>
                <p className="text-gray-800">{t.accOwner}: <span className="font-black uppercase text-gray-900">{propertyInfo.bankOwner || 'Nguyễn Thanh Hiếu'}</span></p>
             </div>
             {propertyInfo.qrUrl && (
                 <div className="w-20 h-20 bg-white p-1 border border-gray-400 rounded-lg shrink-0">
                    <img src={propertyInfo.qrUrl} className="w-full h-full object-contain grayscale contrast-125" alt="Payment QR" />
                 </div>
             )}
          </div>

          <div className="text-center mt-12 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                ***
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-800">
                {(lang === 'vi' && propertyInfo.invoiceFooter) ? propertyInfo.invoiceFooter : t.footerDefault}
            </p>
          </div>
          
          <div className="mt-8 flex justify-center print:hidden">
              <div className="border-t-2 border-dashed border-gray-400 w-full relative h-4">
                  <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-white px-2 flex items-center gap-2 text-gray-500">
                    <Scissors size={14}/>
                    <span className="text-[9px] font-bold uppercase">{t.cut}</span>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
