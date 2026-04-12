import React from 'react';
import { LogOut as LogoutIcon, Users, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/utils';
import { calculateCardServiceFee, CARD_FEE_SERVICE_NAME } from '../../utils/calculations';
import { BookingFormData, BookingFormUpdate } from '../../types/bookingForm';
import CurrencyInput from '../CurrencyInput';

interface PaymentSectionProps {
  form: BookingFormData;
  setForm: (data: BookingFormUpdate) => void;
  financials: {
    roomTotal: number;
    serviceTotal: number;
    discountTotal: number;
    surcharge: number;
    grandTotal: number;
    debt: number;
    preTaxTotal: number;
  };
  isGroupMode: boolean;
  canEditPayment?: boolean;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  form,
  setForm,
  financials,
  isGroupMode,
  canEditPayment = true,
}) => {
  const handleEarlyCheckout = () => {
    const today = new Date().toISOString().split('T')[0];
    if (!window.confirm("Xác nhận trả phòng sớm vào ngày hôm nay?")) return;
    
    setForm((prev: BookingFormData) => ({
      ...prev,
      checkOut: today,
      status: 'checked-out'
    }));
  };

  const handleApplyCardServiceFee = () => {
    const outstandingBeforeFee = Math.max(0, financials.preTaxTotal - (form.paid || 0));
    const cardFeeAmount = calculateCardServiceFee(outstandingBeforeFee);
    if (cardFeeAmount <= 0) return;

    setForm((prev: BookingFormData) => {
      const existingServices = prev.services || [];
      const updatedServices = existingServices.filter((service) => service.name !== CARD_FEE_SERVICE_NAME);

      return {
        ...prev,
        services: [...updatedServices, { name: CARD_FEE_SERVICE_NAME, price: cardFeeAmount, qty: 1 }],
        surcharge: 0, // Remove the dynamic surcharge as it's now a fixed service
      };
    });
  };

  // Determine if this is a multi-room group to show a warning hint
  // We check if groupId exists and if it's not a new creation
  const isLinkedGroup = !!form.groupId;

  return (
    <section className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4">
      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
        <span>Tiền phòng {isGroupMode && !form.id ? '(Đoàn)' : ''}</span>
        <span className="font-bold">{formatCurrency(financials.roomTotal)}</span>
      </div>
      {(financials.serviceTotal > 0 || financials.discountTotal > 0) && (
        <>
          <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
            <span>Tổng Dịch vụ</span>
            <span className="font-bold">{formatCurrency(financials.serviceTotal)}</span>
          </div>
          {financials.discountTotal > 0 && (
            <div className="flex justify-between items-center text-xs text-orange-600">
              <span>Tổng Giảm trừ</span>
              <span className="font-bold">-{formatCurrency(financials.discountTotal)}</span>
            </div>
          )}
        </>
      )}

      <div className="border-t border-gray-300 dark:border-gray-700 my-2"></div>

      <div className="flex justify-between items-center">
        <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Đã Thanh toán / Cọc</span>
            {isLinkedGroup && (
                <span className="text-[9px] text-blue-600 flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={10}/> Tổng quỹ đoàn
                </span>
            )}
        </div>
        
        <CurrencyInput 
            value={form.paid} 
            onChange={val => setForm({ ...form, paid: val })} 
            disabled={!canEditPayment}
            className="w-36 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold text-right outline-none focus:border-blue-500 text-blue-800 dark:text-blue-400" 
        />
      </div>

      {!canEditPayment && (
        <p className="text-[11px] text-amber-600 font-medium">
          Tài khoản staff chỉ được xem mục thanh toán. Chỉ owner/admin được cập nhật số tiền đã trả.
        </p>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs font-black uppercase text-gray-500 tracking-widest flex items-center gap-1">
          Phương thức
          <select 
            value={form.paymentMethod} 
            onChange={e => setForm({ ...form, paymentMethod: e.target.value as BookingFormData['paymentMethod'] })} 
            disabled={!canEditPayment}
            className="bg-transparent font-bold text-gray-800 dark:text-gray-200 outline-none ml-1"
          >
            <option value="cash">Tiền mặt / CK</option>
            <option value="card">Quẹt thẻ (+4%)</option>
          </select>
        </span>
        {financials.surcharge > 0 && <span className="text-xs text-orange-600 font-bold italic">+ {formatCurrency(financials.surcharge)} phí</span>}
      </div>

      <button
        onClick={handleApplyCardServiceFee}
        disabled={!canEditPayment || form.paymentMethod !== 'card' || financials.debt <= 0}
        className="w-full py-2 bg-blue-500 text-white rounded-xl font-bold text-xs hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Thêm phí quẹt thẻ (4%)
      </button>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center shadow-sm">
        <span className="font-black text-sm uppercase text-gray-900 dark:text-gray-100">Tổng còn lại</span>
        <span className={`text-xl font-black ${financials.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(financials.debt)}</span>
      </div>

      {form.status === 'checked-in' && financials.debt === 0 && (
        <button onClick={handleEarlyCheckout} className="w-full py-3 bg-white border-2 border-orange-100 text-orange-600 rounded-2xl font-bold text-xs hover:bg-orange-50 flex items-center justify-center gap-2">
          <LogoutIcon size={16} /> Trả phòng ngay
        </button>
      )}

    </section>
  );
};

export default React.memo(PaymentSection);
