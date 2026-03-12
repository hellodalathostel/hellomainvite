
import React from 'react';
import { Printer, X, Scissors, Copy } from 'lucide-react';
import { ConfirmationData, PropertyInfo } from '../../types/types';
import { formatCurrency } from '../../utils/utils';
import { useUI } from '../../context/UIContext';

interface ConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  data: ConfirmationData | null;
  propertyInfo: PropertyInfo;
  zaloTemplate?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ show, onClose, data, propertyInfo, zaloTemplate }) => {
  const { addToast } = useUI();
  if (!show || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyZalo = () => {
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

          // Items (If template asks for it)
          if (text.includes('{items}')) {
              const itemsList = data.items.map(i => {
                const isDiscount = i.amount < 0;
                return `${isDiscount ? '🎁' : '▪️'} ${i.desc}`;
              }).join('\n');
              text = text.replace(/{items}/g, itemsList);
          }

      } else {
        // Fallback Logic
        const roomLines = data.items.filter(i => !i.desc.startsWith('+') && !i.desc.startsWith('-'));
        const roomDesc = data.isGroupInvoice
          ? `Đoàn (${roomLines.length} phòng)`
          : (roomLines[0]?.desc.split('\n')[0] || 'Phòng nghỉ');
        const mapLink = propertyInfo.address ? `https://maps.google.com/?q=${encodeURIComponent(propertyInfo.address)}` : '';

        text = `🏨 *${propertyInfo.name}*
📍 ${propertyInfo.address}
----------------------------
👋 Khách hàng: *${data.guestName}*
📱 SĐT: ${data.phone || '...'}
🏠 ${roomDesc}
📥 Check-in: ${data.checkIn} (14:00)
📤 Check-out: ${data.checkOut} (12:00)
----------------------------
💰 Tổng tiền: ${formatCurrency(data.total)}
✅ Đã cọc: ${formatCurrency(data.paid)}
👉 Cần thanh toán: ${formatCurrency(data.balance)}
----------------------------
🗺️ Vị trí: ${mapLink}
Cảm ơn bạn đã lựa chọn ${propertyInfo.name}! ❤️`;
      }

      navigator.clipboard.writeText(text);
      addToast('Đã sao chép tin nhắn Zalo!', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">
        
        {/* Actions Header - Hidden on Print */}
        <div className="p-4 bg-gray-100 border-b border-gray-300 flex justify-between items-center print:hidden">
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-700 transition-colors">
                <X size={20}/>
            </button>
            <div className="flex gap-2">
                <button onClick={handleCopyZalo} className="bg-blue-100 text-blue-900 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-200 transition-all border border-blue-200">
                    <Copy size={16}/> Zalo
                </button>
                <button onClick={handlePrint} className="bg-blue-800 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20">
                    <Printer size={16}/> In phiếu
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
              <h2 className="text-xs font-black uppercase tracking-[0.1em] px-2 whitespace-nowrap text-gray-900 border-2 border-gray-900 p-1 rounded">{data.isGroupInvoice ? 'PHIẾU XÁC NHẬN ĐOÀN' : 'PHIẾU XÁC NHẬN'}</h2>
                <div className="flex-1 h-0.5 bg-gray-400"></div>
            </div>
            <p className="text-[10px] font-bold text-gray-700 text-right">Ngày tạo: {data.date}</p>
            
            {propertyInfo.invoiceHeader && (
                <p className="mt-2 italic text-gray-700 px-4 font-medium">"{propertyInfo.invoiceHeader}"</p>
            )}
          </div>

          <div className="mb-6 space-y-2 pb-4 border-b-2 border-dashed border-gray-400">
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
                <span className="text-gray-700 font-bold">KHÁCH HÀNG:</span>
                <span className="font-black text-gray-900 text-sm">{data.guestName}</span>
            </div>
            {data.phone && (
                <div className="flex justify-between items-end">
                    <span className="text-gray-700 font-bold">SỐ ĐIỆN THOẠI:</span>
                    <span className="font-bold text-gray-900">{data.phone}</span>
                </div>
            )}
            <div className="flex justify-between items-end">
                <span className="text-gray-700 font-bold">CHECK-IN:</span>
                <span className="font-bold text-gray-900">{data.checkIn} (14:00)</span>
            </div>
            <div className="flex justify-between items-end">
                <span className="text-gray-700 font-bold">CHECK-OUT:</span>
                <span className="font-bold text-gray-900">{data.checkOut} (12:00)</span>
            </div>
          </div>

          <div className="space-y-0 mb-8">
            {/* Table Header */}
            <div className="flex justify-between font-black text-[10px] uppercase bg-gray-200 p-2 rounded-t mb-2 border-b border-gray-400 text-gray-900">
                <span>Thông tin phòng / DV</span>
                <span>Giá tiền</span>
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
            </div>
          </div>

          <div className="border-t-2 border-gray-900 border-dashed pt-4 space-y-2">
            <div className="flex justify-between items-end">
              <span className="uppercase tracking-widest font-bold text-gray-800">TỔNG TIỀN DỰ KIẾN</span>
              <span className="text-sm font-black text-gray-900">{formatCurrency(data.total)}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="font-bold text-gray-700">ĐÃ ĐẶT CỌC</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.paid)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-300">
              <span className="text-blue-900 font-black uppercase text-xs">CÒN LẠI THANH TOÁN</span>
              <span className="text-lg font-black text-red-700">
                  {formatCurrency(data.balance)}
              </span>
            </div>
          </div>

          {/* Bank & QR Section */}
          <div className="mt-8 flex gap-4 items-start bg-gray-100 p-4 border border-gray-400 rounded-2xl">
             <div className="flex-1 text-[10px] leading-relaxed">
                <p className="font-black text-blue-900 uppercase mb-2 border-b border-blue-200 pb-1">Thông tin thanh toán:</p>
                <p className="font-bold text-gray-900 text-xs">{propertyInfo.bankName || 'Vietcombank (VCB)'}</p>
                <div className="flex items-center gap-1 mt-1">
                   <span className="text-gray-700">STK:</span>
                   <span className="font-black text-base text-gray-900 tracking-wider">{propertyInfo.bankAccountNumber || '1014095502'}</span>
                </div>
                <p className="text-gray-800">Chủ TK: <span className="font-black uppercase text-gray-900">{propertyInfo.bankOwner || 'Nguyễn Thanh Hiếu'}</span></p>
                <p className="mt-2 italic font-medium text-gray-600">* Vui lòng giữ phiếu này để đối soát.</p>
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
                {propertyInfo.invoiceFooter || "Cảm ơn quý khách đã tin tưởng!"}
            </p>
          </div>
          
          <div className="mt-8 flex justify-center print:hidden">
              <div className="border-t-2 border-dashed border-gray-400 w-full relative h-4">
                  <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-white px-2 flex items-center gap-2 text-gray-500">
                    <Scissors size={14}/>
                    <span className="text-[9px] font-bold uppercase">Cắt phiếu</span>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
