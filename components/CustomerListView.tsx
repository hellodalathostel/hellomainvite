import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import type { CustomerRecord, CustomerUsageRecord } from '../types/types';
import { CustomerDetailModal } from './CustomerDetailModal';
import { formatDate } from '../utils/utils';

interface CustomerListViewProps {
  customers: CustomerRecord[];
  loading?: boolean;
  onSaveCustomer: (customer: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
  onGetUsage: (customerId: string) => Promise<CustomerUsageRecord[]>;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  customers,
  loading = false,
  onSaveCustomer,
  onDeleteCustomer,
  onGetUsage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usageHistory, setUsageHistory] = useState<CustomerUsageRecord[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'phone' | 'date'>('date');
  const [saveError, setSaveError] = useState<string | null>(null);
  const usageCacheRef = useRef<Map<string, CustomerUsageRecord[]>>(new Map());

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Load usage history when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      const cached = usageCacheRef.current.get(selectedCustomer.id);
      if (cached) {
        setUsageHistory(cached);
        setLoadingUsage(false);
        return;
      }

      setLoadingUsage(true);
      onGetUsage(selectedCustomer.id)
        .then((usage) => {
          usageCacheRef.current.set(selectedCustomer.id, usage);
          setUsageHistory(usage);
        })
        .catch(err => console.error('Error loading usage:', err))
        .finally(() => setLoadingUsage(false));
    }
  }, [selectedCustomer, onGetUsage]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Search
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.cccd && c.cccd.includes(debouncedSearchQuery))
      );
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        break;
      case 'phone':
        sorted.sort((a, b) => a.phone.localeCompare(b.phone));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return sorted;
  }, [customers, debouncedSearchQuery, sortBy]);

  const handleSaveCustomer = async (customer: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      setSaveError(null);
      await onSaveCustomer(customer);
      setIsModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      setSaveError((err as Error).message);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      setSaveError(null);
      await onDeleteCustomer(customerId);
      setIsModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      setSaveError((err as Error).message);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenCustomerDetail = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Danh sách khách hàng</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Quản lý thông tin và lịch sử khách hàng</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Plus size={20} />
          Thêm khách hàng
        </button>
      </div>

      {/* Search & Sort */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, SĐT hoặc CCCD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
            />
          </div>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
        >
          <option value="date">Mới nhất</option>
          <option value="name">Tên A-Z</option>
          <option value="phone">SĐT</option>
        </select>
      </div>

      {/* Error message */}
      {saveError && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          {saveError}
        </div>
      )}

      {/* Customer Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">
            Đang tải danh sách khách hàng...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">
            {searchQuery ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng nào'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">Tên</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">SĐT</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">CCCD</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">Nguồn</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">Lần thêm</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-slate-300">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                      {customer.note && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">{customer.note}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{customer.phone}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{customer.cccd || '—'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{customer.source || '—'}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">
                      {formatDate(new Date(customer.createdAt).toISOString().split('T')[0])}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenCustomerDetail(customer)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {!loading && filteredCustomers.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-600 text-sm text-gray-700 dark:text-slate-300">
            Tổng cộng: <span className="font-semibold">{filteredCustomers.length}</span> khách hàng
            {searchQuery && ` (tìm thấy ${filteredCustomers.length} trong ${customers.length})`}
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCustomer}
        onDelete={handleDeleteCustomer}
        usageHistory={usageHistory}
        loadingUsage={loadingUsage}
      />
    </div>
  );
};
