import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateBookingForm } from './bookingWorkflow';
import type { BookingFormData } from './../types/bookingForm';

describe('validateBookingForm', () => {
  const baseForm = {
    guestName: 'John Doe',
    phone: '0912345678',
    roomId: 'room-1',
    selectedRooms: ['room-1'],
  } as BookingFormData;

  describe('guestName validation', () => {
    it('should return error if guestName is missing', () => {
      const form = { ...baseForm, guestName: undefined as any };
      assert.strictEqual(validateBookingForm(form, false), 'Vui lòng nhập tên khách.');
    });

    it('should return error if guestName is empty string', () => {
      const form = { ...baseForm, guestName: '' };
      assert.strictEqual(validateBookingForm(form, false), 'Vui lòng nhập tên khách.');
    });

    it('should return error if guestName is only spaces', () => {
      const form = { ...baseForm, guestName: '   ' };
      assert.strictEqual(validateBookingForm(form, false), 'Vui lòng nhập tên khách.');
    });
  });

  describe('phone validation', () => {
    it('should not return error if phone is valid', () => {
      const form = { ...baseForm, phone: '0912345678' };
      assert.strictEqual(validateBookingForm(form, false), null);
    });

    it('should not return error if phone is empty', () => {
      const form = { ...baseForm, phone: '' };
      assert.strictEqual(validateBookingForm(form, false), null);
    });

    it('should not return error if phone is missing', () => {
      const form = { ...baseForm, phone: undefined as any };
      assert.strictEqual(validateBookingForm(form, false), null);
    });

    it('should return error if phone is invalid', () => {
      const invalidPhones = ['1234567890', '0212345678', '091234567', '09123456789'];
      invalidPhones.forEach(phone => {
        const form = { ...baseForm, phone };
        assert.strictEqual(
          validateBookingForm(form, false),
          'Số điện thoại không hợp lệ (VD: 0912345678).'
        );
      });
    });
  });

  describe('room validation (isGroupMode = false)', () => {
    it('should return error if roomId is missing', () => {
      const form = { ...baseForm, roomId: '' };
      assert.strictEqual(validateBookingForm(form, false), 'Vui lòng chọn ít nhất 1 phòng.');
    });

    it('should return null if roomId is valid', () => {
      const form = { ...baseForm, roomId: 'room-1' };
      assert.strictEqual(validateBookingForm(form, false), null);
    });
  });

  describe('room validation (isGroupMode = true)', () => {
    describe('new booking (!form.id)', () => {
      it('should return error if selectedRooms is empty', () => {
        const form = { ...baseForm, id: undefined, selectedRooms: [] };
        assert.strictEqual(validateBookingForm(form, true), 'Vui lòng chọn ít nhất 1 phòng.');
      });

      it('should return error if selectedRooms contains empty strings', () => {
        const form = { ...baseForm, id: undefined, selectedRooms: ['room-1', ''] };
        assert.strictEqual(validateBookingForm(form, true), 'Vui lòng chọn ít nhất 1 phòng.');
      });

      it('should return null if selectedRooms is valid', () => {
        const form = { ...baseForm, id: undefined, selectedRooms: ['room-1', 'room-2'] };
        assert.strictEqual(validateBookingForm(form, true), null);
      });
    });

    describe('edit booking (form.id exists)', () => {
      it('should check roomId instead of selectedRooms', () => {
        const form = { ...baseForm, id: 'booking-1', roomId: '', selectedRooms: ['room-1'] };
        assert.strictEqual(validateBookingForm(form, true), 'Vui lòng chọn ít nhất 1 phòng.');
      });

      it('should return null if roomId is valid', () => {
        const form = { ...baseForm, id: 'booking-1', roomId: 'room-1', selectedRooms: [] };
        assert.strictEqual(validateBookingForm(form, true), null);
      });
    });
  });
});
