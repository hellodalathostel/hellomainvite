import test from 'node:test';
import assert from 'node:assert/strict';

import type { BookingComIcalRoomConfig, RoomDefinition } from '../types/types';
import {
  buildBookingComIcalRoomConfigs,
  countConfiguredBookingComIcalRooms,
  createDefaultBookingComIcalRoomConfig,
} from '../utils/bookingComIcalConfig.ts';

const rooms: RoomDefinition[] = [
  { id: '101', name: '101 - Family', price: 450000 },
  { id: '201', name: '201 - Deluxe Queen', price: 400000 },
];

test('creates default booking.com iCal room config from room definition', () => {
  const config = createDefaultBookingComIcalRoomConfig(rooms[0]);

  assert.deepEqual(config, {
    roomId: '101',
    roomName: '101 - Family',
    importUrl: '',
    exportUrl: '',
    importEnabled: false,
    exportEnabled: false,
  });
});

test('builds normalized config map for all rooms', () => {
  const existing: Record<string, BookingComIcalRoomConfig> = {
    '101': {
      roomId: '101',
      roomName: 'old',
      importUrl: '  https://example.com/import-101.ics  ',
      exportUrl: '   ',
      importEnabled: true,
      exportEnabled: true,
    },
  };

  const configs = buildBookingComIcalRoomConfigs(rooms, existing);

  assert.equal(Object.keys(configs).length, 2);
  assert.equal(configs['101'].roomName, '101 - Family');
  assert.equal(configs['101'].importUrl, 'https://example.com/import-101.ics');
  assert.equal(configs['101'].importEnabled, true);
  assert.equal(configs['101'].exportUrl, '');
  assert.equal(configs['101'].exportEnabled, false);
  assert.equal(configs['201'].roomId, '201');
  assert.equal(configs['201'].importEnabled, false);
});

test('counts configured rooms by direction and enabled state', () => {
  const counts = countConfiguredBookingComIcalRooms({
    '101': {
      roomId: '101',
      importUrl: 'https://example.com/import-101.ics',
      exportUrl: 'https://example.com/export-101.ics',
      importEnabled: true,
      exportEnabled: false,
    },
    '201': {
      roomId: '201',
      importUrl: '',
      exportUrl: 'https://example.com/export-201.ics',
      importEnabled: false,
      exportEnabled: true,
    },
  });

  assert.deepEqual(counts, {
    importRooms: 1,
    exportRooms: 2,
    enabledImports: 1,
    enabledExports: 1,
  });
});