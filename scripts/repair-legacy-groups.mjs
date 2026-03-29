import fs from 'node:fs';

const [groupsPath = 'groups-snapshot.json', bookingsPath = 'bookings-snapshot.json', outPath = 'groups-repair.json'] = process.argv.slice(2);

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeKey = (value) => normalizeText(value).toLowerCase();

const invalidGuestNames = new Set(['', 'unknown', 'unknow', 'chua co ten khach']);
const invalidScalarValues = new Set(['', 'null', 'undefined']);
const invalidPhoneValues = new Set(['', '0', 'null', 'undefined']);

const hasMeaningfulGuestName = (value) => !invalidGuestNames.has(normalizeKey(value));
const hasMeaningfulValue = (value) => !invalidScalarValues.has(normalizeKey(value));
const hasMeaningfulPhone = (value) => !invalidPhoneValues.has(normalizeKey(value));

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const groups = readJson(groupsPath);
const bookings = readJson(bookingsPath);
const now = Date.now();

const bookingsByGroup = new Map();

for (const booking of Object.values(bookings)) {
  if (!booking || typeof booking !== 'object') continue;

  const groupId = normalizeText(booking.groupId);
  if (!groupId) continue;

  if (!bookingsByGroup.has(groupId)) {
    bookingsByGroup.set(groupId, []);
  }

  bookingsByGroup.get(groupId).push(booking);
}

const sortBookings = (list) => list.slice().sort((left, right) => {
  const leftTime = Number(left.createdAt) || 0;
  const rightTime = Number(right.createdAt) || 0;
  return leftTime - rightTime;
});

const pickFirst = (list, predicate) => list.find(predicate);

const deriveRoomIds = (bookingsForGroup, existingRoomIds) => {
  const normalizedExisting = existingRoomIds && typeof existingRoomIds === 'object' ? { ...existingRoomIds } : {};
  const hasExistingRoomIds = Object.keys(normalizedExisting).length > 0;
  if (hasExistingRoomIds) return normalizedExisting;

  const derived = {};
  for (const booking of bookingsForGroup) {
    if (!booking?.id || !booking?.roomId || booking.isDeleted === true) continue;
    derived[booking.id] = booking.roomId;
  }
  return derived;
};

const buildCustomer = (group, bookingsForGroup) => {
  const existingCustomer = group?.customer && typeof group.customer === 'object' ? group.customer : {};
  const firstNamedBooking = pickFirst(bookingsForGroup, (booking) => hasMeaningfulGuestName(booking.guestName));
  const firstBookingWithPhone = pickFirst(bookingsForGroup, (booking) => hasMeaningfulPhone(booking.phone));
  const firstBookingWithSource = pickFirst(bookingsForGroup, (booking) => hasMeaningfulValue(booking.source));
  const firstBookingWithNote = pickFirst(bookingsForGroup, (booking) => hasMeaningfulValue(booking.note));
  const firstBookingWithOta = pickFirst(bookingsForGroup, (booking) => hasMeaningfulValue(booking.otaBookingNumber));

  const name = hasMeaningfulGuestName(existingCustomer.name)
    ? normalizeText(existingCustomer.name)
    : normalizeText(firstNamedBooking?.guestName);

  const phone = hasMeaningfulPhone(existingCustomer.phone)
    ? normalizeText(existingCustomer.phone)
    : normalizeText(firstBookingWithPhone?.phone);

  const source = hasMeaningfulValue(existingCustomer.source)
    ? normalizeText(existingCustomer.source)
    : normalizeText(firstBookingWithSource?.source);

  const note = hasMeaningfulValue(existingCustomer.note)
    ? normalizeText(existingCustomer.note)
    : normalizeText(firstBookingWithNote?.note);

  const otaBookingNumber = hasMeaningfulValue(existingCustomer.otaBookingNumber)
    ? normalizeText(existingCustomer.otaBookingNumber)
    : normalizeText(firstBookingWithOta?.otaBookingNumber);

  const customer = {
    ...existingCustomer,
    name,
    phone,
    source,
    note,
  };

  if (otaBookingNumber) {
    customer.otaBookingNumber = otaBookingNumber;
  } else {
    delete customer.otaBookingNumber;
  }

  return customer;
};

const repairPayload = {};

for (const [groupId, bookingsForGroupRaw] of bookingsByGroup.entries()) {
  const bookingsForGroup = sortBookings(bookingsForGroupRaw);
  const existingGroup = groups[groupId] && typeof groups[groupId] === 'object' ? groups[groupId] : {};
  const customer = buildCustomer(existingGroup, bookingsForGroup);
  const roomIds = deriveRoomIds(bookingsForGroup, existingGroup.roomIds);
  const candidateBooking = bookingsForGroup[0] || {};
  const payment = existingGroup.payment && typeof existingGroup.payment === 'object'
    ? existingGroup.payment
    : { paid: Number(candidateBooking.paid) || 0 };

  const repairedGroup = {
    ...existingGroup,
    id: normalizeText(existingGroup.id) || groupId,
    customer,
    payment,
    roomIds,
    status: normalizeText(existingGroup.status) || 'active',
    createdAt: Number(existingGroup.createdAt) || Number(candidateBooking.createdAt) || now,
    updatedAt: now,
  };

  if (!hasMeaningfulGuestName(repairedGroup.customer?.name)) {
    continue;
  }

  if (Object.keys(repairedGroup.roomIds || {}).length === 0) {
    continue;
  }

  const existingCustomer = existingGroup.customer && typeof existingGroup.customer === 'object' ? existingGroup.customer : {};
  const existingRoomIds = existingGroup.roomIds && typeof existingGroup.roomIds === 'object' ? existingGroup.roomIds : {};

  const needsRepair =
    Object.keys(existingGroup).length === 0 ||
    !normalizeText(existingGroup.id) ||
    !existingGroup.payment ||
    !existingGroup.status ||
    !existingGroup.createdAt ||
    !hasMeaningfulGuestName(existingCustomer.name) ||
    (!hasMeaningfulPhone(existingCustomer.phone) && hasMeaningfulPhone(repairedGroup.customer.phone)) ||
    (!hasMeaningfulValue(existingCustomer.source) && hasMeaningfulValue(repairedGroup.customer.source)) ||
    (!hasMeaningfulValue(existingCustomer.note) && hasMeaningfulValue(repairedGroup.customer.note)) ||
    (!hasMeaningfulValue(existingCustomer.otaBookingNumber) && hasMeaningfulValue(repairedGroup.customer.otaBookingNumber)) ||
    Object.keys(existingRoomIds).length === 0;

  if (needsRepair) {
    repairPayload[groupId] = repairedGroup;
  }
}

fs.writeFileSync(outPath, JSON.stringify(repairPayload, null, 2));
console.log(`Prepared ${Object.keys(repairPayload).length} group repairs in ${outPath}`);