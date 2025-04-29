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

// Helper function to check if a day should be skipped
function shouldSkipDay(year, month, day) {
  const date = new Date(year, month - 1, day); // JavaScript months are 0-based
  return skipDays.includes(date.getDay());
}

const numLatestFiles = 2; // Number of latest files to process

// Get the 3 latest year files from the input folder
const inputFiles = fs.readdirSync(inputFolder)
  .filter(file => path.extname(file).toLowerCase() === '.json')
  .sort((a, b) => {
    const yearA = parseInt(a.match(/\d{4}/)?.[0] || 0, 10);
    const yearB = parseInt(b.match(/\d{4}/)?.[0] || 0, 10);
    return yearB - yearA; // Sort by year descending
  })
  .slice(0, numLatestFiles); // Take the x latest files

if (inputFiles.length === 0) {
  console.error(`Error: No JSON files found in the input folder: ${inputFolder}`);
  process.exit(1);
}

console.log(`ℹ️  Found the ${numLatestFiles} latest year files: ${inputFiles.join(', ')}`);

// Language configurations
const languages = [
  { 
    lang: 'en', 
    textSummary: 'Work Hours: ${hours}', 
    textDescription: 'Work hours for ${day} ${monthName}: ${hours} hours',
    textMonthTotal: 'Total work hours for ${monthName}: ${hours}',
    textYear: 'Year',
    textYearlyTotals: 'Yearly totals:\n${monthlyTotals}\nTotal: ${yearTotalHours} hours',
    monthNames : [
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ]
  },
  { 
    lang: 'sv',     
    textSummary: 'Arbetstid: ${hours}', 
    textDescription: 'Arbetstid ${day} ${monthName}: ${hours} timmar',
    textMonthTotal: 'Totalt arbetade timmar för ${monthName}: ${hours}',
    textYear: 'År',
    textYearlyTotals: 'Årsvis sammanställning:\n${monthlyTotals}\nTotal: ${yearTotalHours} timmar',
    monthNames : [
      'januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'
    ]
  },
];

// Helper function to format dates for ICS
function formatDate(year, month, day) {
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${year}${paddedMonth}${paddedDay}`;
}

function getDTSTAMP() {
  currentDate = new Date(); // Get the current date
  const pad = (n) => String(n).padStart(2, '0');
  const year = currentDate.getUTCFullYear();
  const month = pad(currentDate.getUTCMonth() + 1);
  const day = pad(currentDate.getUTCDate());
  const hour = pad(currentDate.getUTCHours());
  const minute = pad(currentDate.getUTCMinutes());
  const second = pad(currentDate.getUTCSeconds());
  
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

const dtstamp = getDTSTAMP(); // Get the current date and time in UTC format

// Ensure the calendars subfolder exists
const calendarsDir = path.join(__dirname, 'output', 'calendars');
if (!fs.existsSync(calendarsDir)) {
  fs.mkdirSync(calendarsDir, { recursive: true });
}

function padNumber(number, length = 2) {
  return String(number).padStart(length, '0');
}

function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}

// Generate an ICS file for each language
languages.forEach(({ lang, textYear, textSummary, textDescription, textMonthTotal, textYearlyTotals, monthNames }) => {
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  const events = [];

  // Process each year file
  // inputFiles.reverse().forEach(file => {
  [...inputFiles].reverse().forEach(file => {
    const filePath = path.join(inputFolder, file);
    console.log(`Processing file: ${filePath}`);

    const workHoursData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Generate events for each day in the year
    Object.entries(workHoursData.months).forEach(([monthIndex, days]) => {
      const parsedMonthIndex = parseInt(monthIndex, 10); // Convert monthIndex to an integer            
      const year = workHoursData.year;
      const maxDays = Object.keys(days).length;
      let monthTotalHours = 0;  

      // Convert `monthIndex` to an integer and get the month name
      const monthName = monthNames[parsedMonthIndex - 1]; // Adjust for 0-based index      

      for (let day = 1; day <= maxDays; day++) {
        if (shouldSkipDay(year, parsedMonthIndex, day)) {
          continue; // Skip weekends or specified days
        }

        const hours = days[day] || 0; // Default to 0 if no work hours are specified
        monthTotalHours += hours; // Accumulate total hours for the month
        const date = formatDate(year, parsedMonthIndex, day);
        const eventSummary = `🕒 ${textSummary.replace('${hours}', hours)}`; // Add watch icon to the summary
        let eventDescription = textDescription
          .replace('${day}', day)
          .replace('${monthName}', monthName)
          .replace('${hours}', hours);

        // If it's the last day of the month, add the total hours for the month
        if (day === maxDays) {
          const totalDescription = textMonthTotal.replace('${monthName}', monthName).replace('${hours}', monthTotalHours);
          eventDescription += `\n\n${totalDescription}`; // Add total hours to the description          
        }

        // If it's the last day of the year, calculate and add yearly totals
        if (parsedMonthIndex === 12 && day === maxDays) {
          let yearTotalHours = 0;
          const monthlyTotals = Object.entries(workHoursData.months).map(([mName, mDays]) => {
            const total = Object.values(mDays).reduce((sum, h) => sum + (h || 0), 0);
            yearTotalHours += total;
            // return `${monthNames[mName - 1]}: ${total}`;
            return `${capitalizeFirstLetter(monthNames[parseInt(mName, 10) - 1])}: ${total}`;
          });

          eventDescription += '\n\n' + textYearlyTotals.replace('${monthlyTotals}', monthlyTotals.join('\n')).replace('${yearTotalHours}', yearTotalHours);
        }

        const paddedMonthIndex = padNumber(parsedMonthIndex); // Use the helper function
        const paddedDay = padNumber(day); // Use the helper function for days

        

        events.push(`BEGIN:VEVENT
UID:${year}${paddedMonthIndex}${paddedDay}
SUMMARY:${eventSummary}
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${date}
DTEND;VALUE=DATE:${date}
STATUS:CONFIRMED
DURATION:P1DT
DESCRIPTION:${eventDescription}
END:VEVENT
`);
      }
    });
  });

  // Add events to the ICS content in the correct order
  icsContent += events.join('\n');

  // Finalize the ICS content
  icsContent += `\nEND:VCALENDAR`;

  // Save the ICS file
  const outputFilePath = path.join(calendarsDir, `work_hours_${lang}.ics`);
  fs.writeFileSync(outputFilePath, icsContent, 'utf8');
  console.log(`✅ ICS calendar file created for ${lang}: ${outputFilePath}`);
});