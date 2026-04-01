import fs from 'node:fs';

const args = process.argv.slice(2);

if (args.length < 6) {
  console.error(
    'Usage: node scripts/generate-missing-fields-restore.mjs <sourceBookings> <targetBookings> <sourceGroups> <targetGroups> <outBookingsPatch> <outGroupsPatch>'
  );
  process.exit(1);
}

const [
  sourceBookingsPath,
  targetBookingsPath,
  sourceGroupsPath,
  targetGroupsPath,
  outBookingsPatchPath,
  outGroupsPatchPath,
] = args;

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2));

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const isMissingGuestName = (value) => {
  const key = normalizeText(value).toLowerCase();
  return key === '' || key === 'unknown' || key === 'unknow' || key === 'chua co ten khach';
};

const isMeaningfulGuestName = (value) => !isMissingGuestName(value);

const isMissingPhone = (value) => {
  const key = normalizeText(value).toLowerCase();
  return key === '' || key === '0' || key === 'null' || key === 'undefined';
};

const isMeaningfulPhone = (value) => !isMissingPhone(value);

const isMissingPrice = (value) => {
  if (typeof value === 'number') return !Number.isFinite(value) || value <= 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return !Number.isFinite(parsed) || parsed <= 0;
  }
  return true;
};

const asPriceNumber = (value) => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const sourceBookings = readJson(sourceBookingsPath);
const targetBookings = readJson(targetBookingsPath);
const sourceGroups = readJson(sourceGroupsPath);
const targetGroups = readJson(targetGroupsPath);

const bookingsPatch = {};
const groupsPatch = {};

const stats = {
  bookingsGuestNameRecovered: 0,
  bookingsPriceRecovered: 0,
  groupsCustomerNameRecovered: 0,
  groupsCustomerPhoneRecovered: 0,
  groupsCustomerSourceRecovered: 0,
};

for (const [bookingId, targetBooking] of Object.entries(targetBookings)) {
  if (!targetBooking || typeof targetBooking !== 'object') continue;

  const sourceBooking = sourceBookings[bookingId];
  if (!sourceBooking || typeof sourceBooking !== 'object') continue;

  const sourceGuestName = normalizeText(sourceBooking.guestName);
  const targetGuestName = normalizeText(targetBooking.guestName);

  if (isMissingGuestName(targetGuestName) && isMeaningfulGuestName(sourceGuestName)) {
    bookingsPatch[`${bookingId}/guestName`] = sourceGuestName;
    stats.bookingsGuestNameRecovered += 1;
  }

  const sourcePrice = asPriceNumber(sourceBooking.price);
  if (isMissingPrice(targetBooking.price) && Number.isFinite(sourcePrice) && sourcePrice > 0) {
    bookingsPatch[`${bookingId}/price`] = sourcePrice;
    stats.bookingsPriceRecovered += 1;
  }
}

for (const [groupId, targetGroup] of Object.entries(targetGroups)) {
  if (!targetGroup || typeof targetGroup !== 'object') continue;

  const sourceGroup = sourceGroups[groupId];
  if (!sourceGroup || typeof sourceGroup !== 'object') continue;

  const sourceCustomer = sourceGroup.customer && typeof sourceGroup.customer === 'object' ? sourceGroup.customer : {};
  const targetCustomer = targetGroup.customer && typeof targetGroup.customer === 'object' ? targetGroup.customer : {};

  const sourceName = normalizeText(sourceCustomer.name);
  const targetName = normalizeText(targetCustomer.name);

  if (isMissingGuestName(targetName) && isMeaningfulGuestName(sourceName)) {
    groupsPatch[`${groupId}/customer/name`] = sourceName;
    stats.groupsCustomerNameRecovered += 1;
  }

  const sourcePhone = normalizeText(sourceCustomer.phone);
  const targetPhone = normalizeText(targetCustomer.phone);
  if (isMissingPhone(targetPhone) && isMeaningfulPhone(sourcePhone)) {
    groupsPatch[`${groupId}/customer/phone`] = sourcePhone;
    stats.groupsCustomerPhoneRecovered += 1;
  }

  const sourceSource = normalizeText(sourceCustomer.source);
  const targetSource = normalizeText(targetCustomer.source);
  if (!targetSource && sourceSource) {
    groupsPatch[`${groupId}/customer/source`] = sourceSource;
    stats.groupsCustomerSourceRecovered += 1;
  }
}

writeJson(outBookingsPatchPath, bookingsPatch);
writeJson(outGroupsPatchPath, groupsPatch);

console.log('Restore patch generation complete.');
console.log(JSON.stringify({
  outBookingsPatchPath,
  outGroupsPatchPath,
  bookingsPatchEntries: Object.keys(bookingsPatch).length,
  groupsPatchEntries: Object.keys(groupsPatch).length,
  stats,
}, null, 2));
