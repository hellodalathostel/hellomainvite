
import React, { useMemo, useState } from 'react';
import { Printer, X, Copy, MapPin, Phone, Maximize2 } from 'lucide-react';
import { ConfirmationData, PropertyInfo } from '../../types/types';
import { buildVietQrImageUrl, formatCurrency } from '../../utils/utils';
import { useUI } from '../../context/UIContext';
import FullScreenQrModal from './FullScreenQrModal';

interface ConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  data: ConfirmationData | null;
  propertyInfo: PropertyInfo;
  zaloTemplate?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ show, onClose, data, propertyInfo, zaloTemplate }) => {
  const { addToast } = useUI();
  const [showFullQr, setShowFullQr] = useState(false);

  const qrImageUrl = useMemo(() => {
    if (!data) return undefined;

    const generatedQr = buildVietQrImageUrl({
      bankCode: propertyInfo.bankCode,
      bankAccountNumber: propertyInfo.bankAccountNumber,
      bankOwner: propertyInfo.bankOwner,
      amount: data.balance > 0 ? data.balance : undefined,
      addInfo: data.balance > 0 ? `Dat coc ${data.guestName}` : undefined,
    });

    return generatedQr || propertyInfo.qrUrl;
  }, [data, propertyInfo.bankCode, propertyInfo.bankAccountNumber, propertyInfo.bankOwner, propertyInfo.qrUrl]);

  if (!show || !data) return null;

  const handlePrint = () => window.print();

  const handleCopyZalo = () => {
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
      if (text.includes('{items}')) {
        const itemsList = data.items.map(i => {
          const isDiscount = i.amount < 0;
          return `${isDiscount ? '🎁' : '▪️'} ${i.desc}`;
        }).join('\n');
        text = text.replace(/{items}/g, itemsList);
      }
    } else {
      const roomLines = data.items.filter(i => i.roomId);
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

  const titleText = data.isGroupInvoice ? 'PHIẾU XÁC NHẬN ĐOÀN' : 'PHIẾU XÁC NHẬN';
  const mapLink = propertyInfo.address ? `https://maps.google.com/?q=${encodeURIComponent(propertyInfo.address)}` : '';

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center px-4 pt-4 pb-safe-modal backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">

        {/* Action Bar — hidden on print */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center print:hidden">
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={20} />
          </button>
          <div className="flex gap-2">
            <button onClick={handleCopyZalo} className="bg-blue-50 text-blue-800 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-200">
              <Copy size={15} /> Zalo
            </button>
            <button onClick={handlePrint} className="bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-800 transition-all shadow-md">
              <Printer size={15} /> In phiếu
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

            {/* Creation Date */}
            <p className="text-right text-[10px] text-gray-400 mb-5">Ngày tạo: {data.date}</p>

            {/* Guest Info */}
            <div className="space-y-2.5 mb-5 text-[12px]">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">KHÁCH HÀNG</span>
                <span className="font-black text-gray-900 text-sm">{data.guestName}</span>
              </div>
              {data.phone && (
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">SỐ ĐIỆN THOẠI</span>
                  <span className="font-semibold text-gray-800">{data.phone}</span>
                </div>
              )}
              {data.otaBookingNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">BOOKING NO.</span>
                  <span className="bg-green-700 text-white text-[10px] font-black px-2 py-0.5 rounded">
                    {data.otaBookingNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CHECK-IN</span>
                <span className="font-semibold text-gray-800">{data.checkIn} (14:00)</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CHECK-OUT</span>
                <span className="font-semibold text-gray-800">{data.checkOut} (12:00)</span>
              </div>
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Section: Room Info */}
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">THÔNG TIN PHÒNG</p>

            <div className="space-y-2 mb-5">
              {data.items.map((item, i) => {
                const lines = item.desc.split('\n');

                if (item.roomId) {
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
                        <p className="text-[10px] text-gray-500 mt-1">{lines[1]}</p>
                      )}
                    </div>
                  );
                } else if (item.amount < 0) {
                  return (
                    <div key={i} className="flex justify-between items-center text-[12px] px-1">
                      <span className="text-gray-500 italic">{item.desc.replace(/^- Ưu đãi: /, '')}</span>
                      <span className="text-green-700 font-bold whitespace-nowrap">− {formatCurrency(Math.abs(item.amount))}</span>
                    </div>
                  );
                } else {
                  return (
                    <div key={i} className="flex justify-between items-center text-[12px] px-1">
                      <span className="text-gray-700">{item.desc.replace(/^\+ DV: /, '')}</span>
                      <span className="font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(item.amount)}</span>
                    </div>
                  );
                }
              })}
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Summary */}
            <div className="space-y-2 mb-4 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Tổng tiền dự kiến</span>
                <span className="font-semibold text-gray-800">{formatCurrency(data.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700 font-semibold">Đã đặt cọc</span>
                <span className="text-green-700 font-semibold">− {formatCurrency(data.paid)}</span>
              </div>
            </div>

            {/* Balance Box */}
            <div className="border border-gray-300 rounded-lg p-3 flex justify-between items-center mb-5">
              <span className="font-black text-[11px] uppercase tracking-wider text-gray-800">CÒN LẠI THANH TOÁN</span>
              <span className="font-black text-xl text-red-600">{formatCurrency(data.balance)}</span>
            </div>

            {/* Bank Info */}
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">THÔNG TIN CHUYỂN KHOẢN</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                <div>
                  <p className="text-[12px] text-gray-600 mb-0.5">{propertyInfo.bankName || 'Vietcombank'}</p>
                  <p className="text-xl font-black text-gray-900 tracking-widest leading-tight">
                    {propertyInfo.bankAccountNumber}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Chủ TK: <span className="font-bold text-gray-800 uppercase">{propertyInfo.bankOwner}</span>
                  </p>
                </div>
                {qrImageUrl && (
                  <div className="flex flex-col items-center self-center sm:self-start flex-shrink-0 relative group">
                    <img src={qrImageUrl} alt="QR" className="w-28 h-28 object-contain" />
                    <button
                      onClick={() => setShowFullQr(true)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/40 sm:hidden"
                      title="Xem QR lớn hơn"
                    >
                      <Maximize2 size={24} className="text-white" />
                    </button>
                    <p className="text-[9px] text-gray-400 mt-1 text-center max-w-24">Quét để chuyển khoản / đặt cọc</p>
                  </div>
                )}
              </div>
            </div>

            {/* Directions Section */}
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">HƯỚNG DẪN ĐẾN HOSTEL</p>
              {propertyInfo.invoiceHeader && (
                <p className="text-[12px] text-gray-700 leading-relaxed mb-3">{propertyInfo.invoiceHeader}</p>
              )}
              {mapLink && (
                <div className="flex items-start gap-2 mb-2">
                  <MapPin size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-gray-700">Google Maps: </span>
                    <a href={mapLink} className="text-[11px] text-blue-600 underline break-all">{mapLink}</a>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-700">
                  <span className="font-bold">Hotline / Zalo: </span>{propertyInfo.phone}
                </span>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center italic text-[11px] text-gray-500 mb-5">
              {propertyInfo.invoiceFooter || 'Cảm ơn quý khách đã tin tưởng!'}
            </p>

            {/* Cut Line */}
            <div className="border-t border-dashed border-gray-300 pt-2 flex items-center justify-center print:hidden">
              <span className="text-[9px] text-gray-400 font-bold tracking-widest">→ CẮT PHIẾU</span>
            </div>

          </div>
        </div>
      </div>
      
      {qrImageUrl && (
        <FullScreenQrModal
          show={showFullQr}
          onClose={() => setShowFullQr(false)}
          qrImageUrl={qrImageUrl}
          bankName={propertyInfo.bankName || 'Vietcombank'}
          bankAccountNumber={propertyInfo.bankAccountNumber}
          bankOwner={propertyInfo.bankOwner}
          amount={data.balance > 0 ? data.balance : undefined}
          guestName={data.guestName}
        />
      )}
    </div>
  );
};

export default ConfirmationModal;
