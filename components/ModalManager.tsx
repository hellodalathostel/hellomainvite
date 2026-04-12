
import React, { Suspense } from 'react';
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';
const BookingModal = React.lazy(() => import('./modals/BookingModal'));
const ExpenseModal = React.lazy(() => import('./modals/ExpenseModal'));
const InvoiceModal = React.lazy(() => import('./modals/InvoiceModal'));
const ConfirmationModal = React.lazy(() => import('./modals/ConfirmationModal'));
import { Booking, Expense, InvoiceData, ConfirmationData, UserRole } from '../types/types';
import type { SaveBookingPayload } from '../types/bookingForm';
import { calculateBill } from '../utils/calculations';
import { formatDate } from '../utils/utils';

// ModalManager now consumes DataContext directly, no need for props drilling
const ModalManager: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const { modalState, closeModal, openBookingModal, openInvoiceModal, openConfirmationModal } = useUI();
  const { 
      bookings, rooms, masterServices, masterDiscounts, propertyInfo, zaloTemplate, suggestedGuest, setSuggestedGuest, actions 
  } = useData();

  const handleSwitchBooking = (bookingId: string) => {
      const targetBooking = bookings.find(b => b.id === bookingId);
      if (targetBooking) {
          openBookingModal(targetBooking);
      }
  };

  const handleSaveBooking = async (data: SaveBookingPayload) => {
      await actions.saveBooking(data);
      closeModal();
  };

  const handleCancelBooking = async (id: string, grp: boolean, gid?: string) => {
      await actions.cancelBooking(id, grp, gid);
      closeModal();
  };

    const getDocumentDateRange = (booking: Booking, forceGroup: boolean) => {
      if (!forceGroup || !booking.groupId) {
        return {
          checkIn: formatDate(booking.checkIn),
          checkOut: formatDate(booking.checkOut),
        };
      }

      const groupBookings = bookings.filter(
        b => b.groupId === booking.groupId && b.status !== 'cancelled' && !b.isDeleted
      );

      if (!groupBookings.length) {
        return {
          checkIn: formatDate(booking.checkIn),
          checkOut: formatDate(booking.checkOut),
        };
      }

      const groupCheckIn = groupBookings.reduce((min, current) =>
        current.checkIn < min ? current.checkIn : min,
        groupBookings[0].checkIn
      );

      const groupCheckOut = groupBookings.reduce((max, current) =>
        current.checkOut > max ? current.checkOut : max,
        groupBookings[0].checkOut
      );

      return {
        checkIn: formatDate(groupCheckIn),
        checkOut: formatDate(groupCheckOut),
      };
    };

  const generateInvoice = (booking: Booking, forceGroup = false) => { 
      const bill = calculateBill(booking, bookings, rooms, forceGroup);
      const dateRange = getDocumentDateRange(booking, forceGroup);
      openInvoiceModal({
        guestName: booking.guestName,
        phone: booking.phone,
        otaBookingNumber: booking.otaBookingNumber,
        date: new Date().toLocaleDateString('vi-VN'),
        checkIn: dateRange.checkIn,
        checkOut: dateRange.checkOut,
        isGroupInvoice: bill.isGroup,
        items: bill.items,
        surcharge: bill.surcharge,
        total: bill.total,
        paid: bill.paid,
        balance: bill.balance
      });
  };

  const generateConfirmation = (booking: Booking, forceGroup = false) => { 
      const bill = calculateBill(booking, bookings, rooms, forceGroup);
      const dateRange = getDocumentDateRange(booking, forceGroup);
      openConfirmationModal({
        guestName: booking.guestName,
        phone: booking.phone,
        otaBookingNumber: booking.otaBookingNumber,
        date: new Date().toLocaleDateString('vi-VN'),
        checkIn: dateRange.checkIn,
        checkOut: dateRange.checkOut,
        isGroupInvoice: bill.isGroup,
        items: bill.items,
        surcharge: bill.surcharge,
        total: bill.total,
        paid: bill.paid,
        balance: bill.balance
      });
  };

  const bookingData = modalState.type === 'booking' ? modalState.data : null;
  const expenseData = modalState.type === 'expense' ? modalState.data : null;
  const invoiceData = modalState.type === 'invoice' ? modalState.data : null;
  const confirmationData = modalState.type === 'confirmation' ? modalState.data : null;

  return (
    <Suspense fallback={null}>
      <BookingModal 
        show={modalState.type === 'booking'} 
        onClose={closeModal} 
        editingBooking={bookingData}
        findGuestByPhone={actions.findGuestByPhone}
        findGuestByName={actions.findGuestByName}
        suggestedGuest={suggestedGuest}
        setSuggestedGuest={setSuggestedGuest}
        onSave={handleSaveBooking}
        onDelete={handleCancelBooking}
        onInvoice={generateInvoice}
        onConfirmation={generateConfirmation}
        checkRoomCollision={actions.checkRoomCollision}
        onSplitBooking={actions.splitBooking}
        onSwitchBooking={handleSwitchBooking}
        onRepairGroup={actions.repairGroup}
        onExtendBooking={actions.extendBooking}
        addRoomToGroup={actions.addRoomToGroup}
        convertSingleToGroup={actions.convertSingleToGroup}
        removeRoomFromGroup={actions.removeRoomFromGroup}
        userRole={userRole}
        masterServices={masterServices}
        masterDiscounts={masterDiscounts}
        allBookings={bookings}
        rooms={rooms}
      />
      
      <ExpenseModal 
        show={modalState.type === 'expense'} 
        onClose={closeModal} 
        onSave={(d) => { actions.saveExpense(d); closeModal(); }}
        editingExpense={expenseData}
      />
      
      <InvoiceModal 
        show={modalState.type === 'invoice'} 
        onClose={closeModal} 
        data={invoiceData}
        propertyInfo={propertyInfo}
        zaloTemplate={zaloTemplate}
      />

      <ConfirmationModal
        show={modalState.type === 'confirmation'}
        onClose={closeModal}
        data={confirmationData}
        propertyInfo={propertyInfo}
        zaloTemplate={zaloTemplate}
      />
    </Suspense>
  );
};

export default ModalManager;
