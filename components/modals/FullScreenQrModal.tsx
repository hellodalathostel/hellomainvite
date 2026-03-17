import React from 'react';
import { X } from 'lucide-react';

interface FullScreenQrModalProps {
  show: boolean;
  onClose: () => void;
  qrImageUrl: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankOwner?: string;
  amount?: number;
  guestName?: string;
}

const FullScreenQrModal: React.FC<FullScreenQrModalProps> = ({
  show,
  onClose,
  qrImageUrl,
  bankName = 'Vietcombank',
  bankAccountNumber,
  bankOwner,
  amount,
  guestName,
}) => {
  if (!show) return null;

  const formatCurrency = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  return (
    <div className="fixed inset-0 bg-black z-[90] flex flex-col items-center justify-center">
      {/* Close Button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm"
        >
          <X size={28} />
        </button>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center justify-center flex-1 px-4">
        <img
          src={qrImageUrl}
          alt="Payment QR Code"
          className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain mb-8 rounded-2xl bg-white/5 p-4"
        />
        <p className="text-white text-lg font-bold text-center mt-4">
          Quét mã QR để chuyển khoản
        </p>
      </div>

      {/* Bank Info Footer */}
      <div className="w-full bg-black/60 backdrop-blur-md border-t border-white/10 px-4 py-6 sm:py-8">
        <div className="max-w-lg mx-auto space-y-3 text-white text-center">
          <p className="text-sm opacity-80">Thông tin chuyển khoản</p>
          <div>
            <p className="text-2xl font-black tracking-wider">{bankAccountNumber}</p>
            <p className="text-xs opacity-70 mt-1">{bankName}</p>
            <p className="text-xs opacity-70 mt-0.5">Chủ TK: {bankOwner}</p>
          </div>
          {amount && amount > 0 && (
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs opacity-80 mb-1">Số tiền</p>
              <p className="text-xl font-bold text-amber-300">{formatCurrency(amount)}</p>
            </div>
          )}
          {guestName && (
            <p className="text-xs opacity-70 pt-2">Khách: {guestName}</p>
          )}
        </div>
      </div>

      {/* Hint */}
      <div className="absolute bottom-20 sm:bottom-32 text-white text-center">
        <p className="text-sm opacity-60 animate-pulse">Giữ điện thoại gần camera để quét</p>
      </div>
    </div>
  );
};

export default FullScreenQrModal;
