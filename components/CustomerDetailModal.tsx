import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, Trash2, Calendar, Phone, MapPin, FileText } from 'lucide-react';
import type { CustomerRecord, CustomerUsageRecord } from '../types/types';
import { formatDate } from '../utils/utils';

interface CustomerDetailModalProps {
  customer: CustomerRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDelete?: (customerId: string) => Promise<void>;
  usageHistory: CustomerUsageRecord[];
  loadingUsage?: boolean;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSave,
  onDelete,
  usageHistory,
  loadingUsage = false,
}) => {
  const [isEditing, setIsEditing] = useState(!customer);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    cccd: customer?.cccd || '',
    source: customer?.source || '',
    note: customer?.note || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        // Đang xem khách cũ
        setIsEditing(false);
        setFormData({
          name: customer.name,
          phone: customer.phone,
          cccd: customer.cccd || '',
          source: customer.source || '',
          note: customer.note || '',
        });
      } else {
        // Thêm khách mới
        setIsEditing(true);
        setFormData({
          name: '',
          phone: '',
          cccd: '',
          source: '',
          note: '',
        });
      }
      setError(null);
    }
  }, [isOpen, customer]);

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      setError('Tên và SĐT không được để trống');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: customer?.id,
        name: formData.name,
        phone: formData.phone,
        cccd: formData.cccd,
        source: formData.source,
        note: formData.note,
      });
      setIsEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customer || !onDelete) return;
    if (!window.confirm('Bạn chắc chắn muốn xóa khách hàng này?')) return;

    setIsSaving(true);
    try {
      await onDelete(customer.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pt-4 pb-safe-modal">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50 dark:bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Thêm khách hàng mới' : 'Thông tin khách hàng'}
            </h2>
            {customer && !isEditing && (
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">ID: {customer.id}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X size={20} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Form Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Tên khách hàng *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder="Nhập tên"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  <Phone size={16} className="inline mr-2" />
                  SĐT *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder="Nhập SĐT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  CCCD/CMND
                </label>
                <input
                  type="text"
                  value={formData.cccd}
                  onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder="Nhập số CCCD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  <MapPin size={16} className="inline mr-2" />
                  Nguồn
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder="Tìm kiếm từ, quảng cáo, ..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                <FileText size={16} className="inline mr-2" />
                Ghi chú
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50 resize-none h-24"
                placeholder="Ghi chú thêm"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
                  >
                    <Save size={16} />
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    onClick={customer ? () => setIsEditing(false) : onClose}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    <Edit2 size={16} />
                    Chỉnh sửa
                  </button>
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition"
                    >
                      <Trash2 size={16} />
                      Xóa
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Usage History Section */}
          {customer && (
            <>
              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar size={20} />
                  Lịch sử sử dụng dịch vụ
                </h3>

                {loadingUsage ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center py-4">Đang tải...</p>
                ) : usageHistory.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center py-4">Chưa có lịch sử sử dụng</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {usageHistory.map((usage, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{usage.bookingName}</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Đặt phòng: {usage.bookingId}</p>
                          </div>
                          <div className="text-right text-sm text-gray-700 dark:text-slate-300">
                            <p>{formatDate(usage.checkIn)} ~ {formatDate(usage.checkOut)}</p>
                          </div>
                        </div>
                        {usage.source && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">Nguồn: {usage.source}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
