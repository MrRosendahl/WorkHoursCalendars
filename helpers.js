function formatDate(year, month, day) {
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

function getDTSTAMP() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function shouldSkipDay(year, month, day, skipDays) {
  const date = new Date(year, month - 1, day);
  return skipDays.includes(date.getDay());
}

function foldICalLine(line, lineEnding = '\r\n ') {
  const chunks = line.match(/.{1,75}/g) || [];
  return chunks.join(lineEnding);
}

function generateUID(year, month, day, lang) {
  return `workhours-${lang}-${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}@arcticcoder.com`;
}

module.exports = {
  formatDate,
  getDTSTAMP,
  capitalizeFirstLetter,
  shouldSkipDay,
  foldICalLine,
  generateUID
};