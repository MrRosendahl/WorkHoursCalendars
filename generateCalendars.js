// USAGE: node .\generateCalendars.js -inputFolder ./output/work_hours/ [-skipDays "0,6"]

const fs = require('fs');
const path = require('path');

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  if (key && value) {
    options[key.replace(/^-+/, '')] = value; // Remove leading dashes from keys
  }
}

// Validate input folder
if (!options.inputFolder) {
  console.error('Usage: node generateCalendars.js -inputFolder <inputFolderPath> [-skipDays "0,6"]');
  process.exit(1);
}

const inputFolder = options.inputFolder;
if (!fs.existsSync(inputFolder) || !fs.lstatSync(inputFolder).isDirectory()) {
  console.error(`Error: Input folder not found or is not a directory: ${inputFolder}`);
  process.exit(1);
}

// Parse skipped days (default to Saturday [6] and Sunday [0])
const skipDays = options.skipDays
  ? options.skipDays.split(',').map(day => parseInt(day.trim(), 10))
  : [0, 6]; // Default to Sunday (0) and Saturday (6)

function shouldSkipDay(year, month, day) {
  const date = new Date(year, month - 1, day);
  return skipDays.includes(date.getDay());
}

const numLatestFiles = 2;

const inputFiles = fs.readdirSync(inputFolder)
  .filter(file => path.extname(file).toLowerCase() === '.json')
  .sort((a, b) => {
    const yearA = parseInt(a.match(/\d{4}/)?.[0] || 0, 10);
    const yearB = parseInt(b.match(/\d{4}/)?.[0] || 0, 10);
    return yearB - yearA;
  })
  .slice(0, numLatestFiles);

if (inputFiles.length === 0) {
  console.error(`Error: No JSON files found in the input folder: ${inputFolder}`);
  process.exit(1);
}

console.log(`\u2139\ufe0f  Found the ${numLatestFiles} latest year files: ${inputFiles.join(', ')}`);

const languages = [
  { 
    lang: 'en', 
    textSummary: 'Work Hours: ${hours}', 
    textDescription: 'Work hours for ${day} ${monthName}: ${hours} hours',
    textMonthTotal: 'Total work hours for ${monthName}: ${hours}',
    textYear: 'Year',
    textYearlyTotals: 'Yearly totals:\n${monthlyTotals}\nTotal: ${yearTotalHours} hours',
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  },
  { 
    lang: 'sv', 
    textSummary: 'Arbetstid: ${hours}', 
    textDescription: 'Arbetstid ${day} ${monthName}: ${hours} timmar',
    textMonthTotal: 'Totalt arbetstid för ${monthName}: ${hours}',
    textYear: 'År',
    textYearlyTotals: 'Årsvis sammanställning:\n${monthlyTotals}\nTotal: ${yearTotalHours} timmar',
    monthNames: ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
  },
];

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

const dtstamp = getDTSTAMP();

const calendarsDir = path.join(__dirname, 'output', 'calendars');
if (!fs.existsSync(calendarsDir)) {
  fs.mkdirSync(calendarsDir, { recursive: true });
}

languages.forEach(({ lang, textYear, textSummary, textDescription, textMonthTotal, textYearlyTotals, monthNames }) => {
  let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n`;
  const events = [];

  [...inputFiles].reverse().forEach(file => {
    const filePath = path.join(inputFolder, file);
    console.log(`Processing file: ${filePath}`);

    const workHoursData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const monthlyTotalsMap = {};
    let yearTotalHours = 0;

    Object.entries(workHoursData.months).forEach(([monthIndex, days]) => {
      const total = Object.values(days).reduce((sum, h) => sum + (h || 0), 0);
      monthlyTotalsMap[monthIndex] = total;
      yearTotalHours += total;
    });

    Object.entries(workHoursData.months).forEach(([monthIndex, days]) => {
      const parsedMonthIndex = parseInt(monthIndex, 10);
      const monthName = monthNames[parsedMonthIndex - 1];
      const year = workHoursData.year;
      const dayKeys = Object.keys(days).map(d => parseInt(d, 10));
      const lastDayOfMonth = Math.max(...dayKeys);

      for (let day = 1; day <= lastDayOfMonth; day++) {
        if (shouldSkipDay(year, parsedMonthIndex, day)) {
          continue;
        }

        const hours = days[day] || 0;
        const date = formatDate(year, parsedMonthIndex, day);
        const eventSummary = `\ud83d\udd52 ${textSummary.replace('${hours}', hours)}`;
        let eventDescription = textDescription
          .replace('${day}', day)
          .replace('${monthName}', monthName)
          .replace('${hours}', hours);

        if (day === lastDayOfMonth) {
          const monthTotalHours = monthlyTotalsMap[parsedMonthIndex];
          const totalDescription = textMonthTotal.replace('${monthName}', monthName).replace('${hours}', monthTotalHours);
          eventDescription += `\n\n${totalDescription}`;
        }

        if (parsedMonthIndex === 12 && day === lastDayOfMonth) {
          const monthlyTotals = Object.entries(monthlyTotalsMap).map(([mIndex, total]) => {
            return `${capitalizeFirstLetter(monthNames[parseInt(mIndex, 10) - 1])}: ${total}`;
          });

          eventDescription += '\n\n' + textYearlyTotals
            .replace('${monthlyTotals}', monthlyTotals.join('\n'))
            .replace('${yearTotalHours}', yearTotalHours);
        }

        events.push(`BEGIN:VEVENT\nUID:${year}${String(parsedMonthIndex).padStart(2, '0')}${String(day).padStart(2, '0')}\nSUMMARY:${eventSummary}\nDTSTAMP:${dtstamp}\nDTSTART;VALUE=DATE:${date}\nDTEND;VALUE=DATE:${date}\nSTATUS:CONFIRMED\nDURATION:P1DT\nDESCRIPTION:${eventDescription}\nEND:VEVENT\n`);
      }
    });
  });

  icsContent += events.join('\n') + '\nEND:VCALENDAR';

  const outputFilePath = path.join(calendarsDir, `work_hours_${lang}.ics`);
  fs.writeFileSync(outputFilePath, icsContent, 'utf8');
  console.log(`\u2705 ICS calendar file created for ${lang}: ${outputFilePath}`);
});
