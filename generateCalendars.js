// USAGE: node .\generateCalendars.js -inputFolder ./output/work_hours/ [-skipDays "0,6"]
const fs = require('fs');
const path = require('path');
const languages = require('./languages');
const { formatDate, getDTSTAMP, capitalizeFirstLetter, shouldSkipDay, foldICalLine } = require('./helpers');

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

const dtstamp = getDTSTAMP();
const lineEnding = '\r\n'; // Use CRLF for iCalendar format
const descLineEnding = '\\n';

const calendarsDir = path.join(__dirname, 'output', 'calendars');
if (!fs.existsSync(calendarsDir)) {
  fs.mkdirSync(calendarsDir, { recursive: true });
}

languages.forEach(({ lang, textYear, textSummary, textDescription, textMonthTotal, textYearlyTotals, monthNames }) => {
  let icsContent = `BEGIN:VCALENDAR${lineEnding}VERSION:2.0${lineEnding}CALSCALE:GREGORIAN${lineEnding}METHOD:PUBLISH${lineEnding}`;
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
        if (shouldSkipDay(year, parsedMonthIndex, day, skipDays)) {
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
          eventDescription += textMonthTotal.replace('${monthName}', monthName).replace('${hours}', monthTotalHours);
        }

        if (parsedMonthIndex === 12 && day === lastDayOfMonth) {
          const monthlyTotals = Object.entries(monthlyTotalsMap).map(([mIndex, total]) => {
            return `${capitalizeFirstLetter(monthNames[parseInt(mIndex, 10) - 1])}: ${total}`;
          });

          eventDescription += textYearlyTotals
            .replace('${monthlyTotals}', monthlyTotals.join(lineEnding))
            .replace('${yearTotalHours}', yearTotalHours);
          
          console.log('--- BEGIN ---------------');
          console.log(eventDescription);
        }
        
        eventDescription = foldICalLine(eventDescription);

        if (parsedMonthIndex === 12 && day === lastDayOfMonth) {          
          console.log(eventDescription);
          console.log('--- END ---------------');
        }

        events.push(
          `BEGIN:VEVENT${lineEnding}` +
          `UID:${year}${String(parsedMonthIndex).padStart(2, '0')}${String(day).padStart(2, '0')}${lineEnding}` +
          `SUMMARY:${eventSummary}${lineEnding}` +
          `DTSTAMP:${dtstamp}${lineEnding}` +
          `DTSTART;VALUE=DATE:${date}${lineEnding}` +
          `DTEND;VALUE=DATE:${date}${lineEnding}` +
          `STATUS:CONFIRMED${lineEnding}` +
          `TRANSP:TRANSPARENT${lineEnding}` + // Add this line to mark the event as "available"
          `DURATION:P1DT${lineEnding}` +
          `DESCRIPTION:${eventDescription}${lineEnding}` +
          `END:VEVENT${lineEnding}`
        );
      }
    });
  });

  icsContent += events.join(lineEnding) + `${lineEnding}END:VCALENDAR`;

  const outputFilePath = path.join(calendarsDir, `work_hours_${lang}.ics`);
  fs.writeFileSync(outputFilePath, icsContent, 'utf8');
  console.log(`\u2705 ICS calendar file created for ${lang}: ${outputFilePath}`);
});
