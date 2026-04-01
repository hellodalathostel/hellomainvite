
import React, { useState } from 'react';
import { Coffee, Plus, PlusCircle, Trash2, Tag } from 'lucide-react';
import { ServiceDefinition, DiscountDefinition, Discount, Service } from '../../types/types';
import { BookingFormData, BookingFormUpdate } from '../../types/bookingForm';
import { formatCurrency } from '../../utils/utils';
import CurrencyInput from '../CurrencyInput';

interface ServicesSectionProps {
  form: BookingFormData;
  setForm: (data: BookingFormUpdate) => void;
  masterServices: ServiceDefinition[];
  masterDiscounts: DiscountDefinition[];
}

const ServicesSection: React.FC<ServicesSectionProps> = ({
  form,
  setForm,
  masterServices,
  masterDiscounts
}) => {
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showDiscountPicker, setShowDiscountPicker] = useState(false);

  const addService = (serviceDef: ServiceDefinition) => {
    const newService = { name: serviceDef.name, price: serviceDef.price, qty: 1 };
    setForm((prev: BookingFormData) => ({
      ...prev,
      services: [...(prev.services || []), newService]
    }));
    setShowServicePicker(false);
  };

  const addEmptyService = () => {
    const newService = { name: '', price: 0, qty: 1 };
    setForm((prev: BookingFormData) => ({
      ...prev,
      services: [...(prev.services || []), newService]
    }));
  };

  const removeServiceItem = (index: number) => {
    const item = form.services[index];
    let extraUpdates = {};
    if (item.name === 'Phụ thu nhận phòng sớm') extraUpdates = { hasEarlyCheckIn: false };
    if (item.name === 'Phụ thu trả phòng trễ') extraUpdates = { hasLateCheckOut: false };

    setForm((prev: BookingFormData) => ({
      ...prev,
      ...extraUpdates,
      services: prev.services.filter((_: Service, i: number) => i !== index)
    }));
  };

  const addDiscount = (discount: DiscountDefinition) => {
    setForm((prev: BookingFormData) => ({
      ...prev,
      discounts: [...(prev.discounts || []), { description: discount.description, amount: discount.amount }]
    }));
    setShowDiscountPicker(false);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Coffee size={16} className="text-blue-600" /><h4 className="text-xs font-black uppercase text-gray-500 tracking-widest">Dịch vụ đi kèm</h4></div>
          <div className="flex gap-2">
            <button onClick={addEmptyService} className="text-[10px] font-bold text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"><Plus size={14} /></button>
            <button onClick={() => setShowServicePicker(!showServicePicker)} className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-100 transition-colors"><PlusCircle size={12} /> Thêm DV</button>
          </div>
        </div>
        {showServicePicker && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-2xl">
            {masterServices.map(s => <button key={s.id} onClick={() => addService(s)} className="text-left p-2 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 hover:border-blue-500"><p className="text-[10px] font-bold text-gray-900 dark:text-white line-clamp-1">{s.name}</p><p className="text-[10px] text-blue-700 font-black">{formatCurrency(s.price)}</p></button>)}
          </div>
        )}
        <div className="space-y-2">
          {form.services?.map((s: Service, idx: number) => (
            <div key={idx} className="flex gap-3 items-center bg-white dark:bg-gray-800 p-3 rounded-2xl border dark:border-gray-800 shadow-sm animate-in fade-in">
              <input value={s.name} onChange={e => { const n = [...form.services]; n[idx].name = e.target.value; setForm({ ...form, services: n }) }} className="flex-1 text-xs font-bold outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400" placeholder="Tên dịch vụ..." />
              <CurrencyInput value={s.price} onChange={(val) => { const n = [...form.services]; n[idx].price = val; setForm({ ...form, services: n }) }} className="w-24 text-xs text-right outline-none bg-transparent font-medium text-blue-700 dark:text-blue-400" />
              <input type="number" min="1" value={s.qty} onChange={e => { const n = [...form.services]; n[idx].qty = Number(e.target.value); setForm({ ...form, services: n }) }} className="w-8 text-xs text-center outline-none bg-transparent font-bold text-gray-900 dark:text-white" />
              <button onClick={() => removeServiceItem(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Tag size={16} className="text-orange-500" /><h4 className="text-xs font-black uppercase text-gray-500 tracking-widest">Ưu đãi & Giảm giá</h4></div>
          <button onClick={() => setShowDiscountPicker(!showDiscountPicker)} className="text-[10px] font-bold text-orange-700 bg-orange-50 dark:bg-orange-900/30 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-orange-100 transition-colors"><PlusCircle size={12} /> Thêm ưu đãi</button>
        </div>
        {showDiscountPicker && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-2xl">
            {masterDiscounts.map((d, i) => <button key={i} onClick={() => addDiscount(d)} className="text-left p-2 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 hover:border-orange-500"><p className="text-[10px] font-bold text-gray-900 dark:text-white line-clamp-1">{d.description}</p><p className="text-[10px] text-orange-600 font-black">-{formatCurrency(d.amount)}</p></button>)}
            <button onClick={() => addDiscount({ id: 'custom', description: '', amount: 0 })} className="p-2 rounded-xl bg-orange-500 text-white text-[10px] font-bold text-center flex items-center justify-center">Tự nhập...</button>
          </div>
        )}
        <div className="space-y-2">
          {form.discounts?.map((d: Discount, idx: number) => (
            <div key={idx} className="flex gap-3 items-center bg-white dark:bg-gray-800 p-3 rounded-2xl border dark:border-gray-800 shadow-sm animate-in fade-in">
              <input value={d.description} onChange={e => { const n = [...form.discounts]; n[idx].description = e.target.value; setForm({ ...form, discounts: n }) }} className="flex-1 text-xs font-bold outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400" placeholder="Lý do giảm..." />
              <CurrencyInput value={d.amount} onChange={(val) => { const n = [...form.discounts]; n[idx].amount = val; setForm({ ...form, discounts: n }) }} className="w-24 text-xs text-right outline-none bg-transparent font-medium text-orange-600" />
              <button onClick={() => setForm({ ...form, discounts: form.discounts.filter((_: Discount, i: number) => i !== idx) })} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default React.memo(ServicesSection);
