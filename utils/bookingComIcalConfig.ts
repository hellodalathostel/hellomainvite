import type { BookingComIcalRoomConfig, RoomDefinition } from '../types/types';

const normalizeUrl = (value?: string) => value?.trim() || '';

export const createDefaultBookingComIcalRoomConfig = (room: RoomDefinition): BookingComIcalRoomConfig => ({
  roomId: room.id,
  roomName: room.name,
  importUrl: '',
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

    acc[room.id] = {
      ...createDefaultBookingComIcalRoomConfig(room),
      ...current,
      roomId: room.id,
      roomName: room.name,
      importUrl: normalizeUrl(current?.importUrl),
      exportUrl: normalizeUrl(current?.exportUrl),
      importEnabled: Boolean(current?.importEnabled && normalizeUrl(current?.importUrl)),
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