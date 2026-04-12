import type { BookingComIcalRoomConfig, RoomDefinition } from '../types/types';

const normalizeUrl = (value?: string) => value?.trim() || '';

const DEFAULT_BOOKING_COM_IMPORT_URLS: Record<string, string> = {
  '101': 'https://ical.booking.com/v1/export?t=b1ab231c-2f85-4ab0-9f19-df6bf40945f7',
  '201': 'https://ical.booking.com/v1/export?t=db6e47bd-70a2-4738-b996-71491703011a',
  '102': 'https://ical.booking.com/v1/export?t=4693b5ff-e19b-4270-ba3b-480a2afc459d',
  '202': 'https://ical.booking.com/v1/export?t=12402194-925a-451a-9066-59388b67895d',
  '301': 'https://ical.booking.com/v1/export?t=1771fb8a-0a9f-4456-999c-688e0decda25',
  '302': 'https://ical.booking.com/v1/export?t=b50ff260-6040-4609-8cbe-b4b242148989',
  '103': 'https://ical.booking.com/v1/export?t=7980a6e2-295a-4370-843d-4e1cfbce8a6c',
  '203': 'https://ical.booking.com/v1/export?t=9f1a1d5a-4c4e-4a8c-b1aa-e50c07a2ecbc',
};

export const createDefaultBookingComIcalRoomConfig = (room: RoomDefinition): BookingComIcalRoomConfig => ({
  roomId: room.id,
  roomName: room.name,
  importUrl: normalizeUrl(DEFAULT_BOOKING_COM_IMPORT_URLS[room.id]),
  exportUrl: '',
  importEnabled: false,
  exportEnabled: false,
});

export const buildBookingComIcalRoomConfigs = (
  rooms: RoomDefinition[],
  existing?: Record<string, BookingComIcalRoomConfig>
): Record<string, BookingComIcalRoomConfig> => {
  return rooms.reduce<Record<string, BookingComIcalRoomConfig>>((acc, room) => {
    const current = existing?.[room.id];
    const importUrl = normalizeUrl(current?.importUrl) || normalizeUrl(DEFAULT_BOOKING_COM_IMPORT_URLS[room.id]);

    acc[room.id] = {
      ...createDefaultBookingComIcalRoomConfig(room),
      ...current,
      roomId: room.id,
      roomName: room.name,
      importUrl,
      exportUrl: normalizeUrl(current?.exportUrl),
      importEnabled: Boolean(current?.importEnabled && importUrl),
      exportEnabled: Boolean(current?.exportEnabled && normalizeUrl(current?.exportUrl)),
    };

    return acc;
  }, {});
};

export const countConfiguredBookingComIcalRooms = (configs: Record<string, BookingComIcalRoomConfig>) => {
  return Object.values(configs).reduce(
    (summary, config) => {
      if (config.importUrl) summary.importRooms += 1;
      if (config.exportUrl) summary.exportRooms += 1;
      if (config.importEnabled) summary.enabledImports += 1;
      if (config.exportEnabled) summary.enabledExports += 1;
      return summary;
    },
    { importRooms: 0, exportRooms: 0, enabledImports: 0, enabledExports: 0 }
  );
};