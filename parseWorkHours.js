// Required dependencies
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Parse command line arguments into a simple object
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  if (key && value) {
    options[key.replace(/^-+/, '')] = value; // Remove leading dashes from keys
  }
}

// Validate required inputs
if (!options.inputFolder) {
  console.error('Usage: node parseWorkHours.js -inputFolder <inputFolderPath> [-maxWorkHours <maxWorkHours>]');
  process.exit(1);
}

// Validate input folder
const inputFolder = options.inputFolder;
if (!fs.existsSync(inputFolder) || !fs.lstatSync(inputFolder).isDirectory()) {
  console.error(`Error: Input folder not found or is not a directory: ${inputFolder}`);
  process.exit(1);
}

// Set maximum allowed work hours (default 8 if not specified)
const maxWorkHours = options.maxWorkHours ? parseInt(options.maxWorkHours, 10) : 8;
if (isNaN(maxWorkHours)) {
  console.error('Error: maxWorkHours must be a valid integer.');
  process.exit(1);
}

// Ensure the output/work_hours directory exists
const outputDir = path.join(__dirname, 'output');
const workHoursDir = path.join(outputDir, 'work_hours');
if (!fs.existsSync(workHoursDir)) {
  fs.mkdirSync(workHoursDir, { recursive: true });
}

// Process each HTML file in the input folder
const inputFiles = fs.readdirSync(inputFolder).filter(file => path.extname(file).toLowerCase() === '.html');
if (inputFiles.length === 0) {
  console.error(`Error: No HTML files found in the input folder: ${inputFolder}`);
  process.exit(1);
}

inputFiles.forEach(file => {
  const filePath = path.join(inputFolder, file);
  console.log(`Processing file: ${filePath}`);

  // Load and clean the HTML content
  let htmlContent = fs.readFileSync(filePath, 'utf8');
  htmlContent = htmlContent.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
  const $ = cheerio.load(htmlContent);

  // Parse the year from the HTML
  let year = null;
  const yearElement = $('b:contains("Referenstidtabell för år")').text();
  const yearMatch = yearElement.match(/(\d{4})/);
  if (yearMatch && yearMatch[1]) {
    year = parseInt(yearMatch[1], 10);
    console.log(`ℹ️  Parsed year from HTML: ${year}`);
  } else {
    console.error(`❌ Error: Could not parse the year from the file: ${file}`);
    return;
  }

  // Check if the year is a leap year
  const isLeapYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));

  // Initialize the JSON structure
  const data = {
    year: year,
    months: {}
  };

  // Month information including max days
  const monthInfos = [
    { name: 'januari', maxDays: 31 },
    { name: 'februari', maxDays: isLeapYear ? 29 : 28 },
    { name: 'mars', maxDays: 31 },
    { name: 'april', maxDays: 30 },
    { name: 'maj', maxDays: 31 },
    { name: 'juni', maxDays: 30 },
    { name: 'juli', maxDays: 31 },
    { name: 'augusti', maxDays: 31 },
    { name: 'september', maxDays: 30 },
    { name: 'oktober', maxDays: 31 },
    { name: 'november', maxDays: 30 },
    { name: 'december', maxDays: 31 }
  ];

  const monthWarnings = [];
  const workHourWarnings = [];

  // Parse each month from the HTML
  $('b').each((index, element) => {
    const monthName = $(element).text().trim().toLowerCase();
    const monthInfo = monthInfos.find(m => m.name === monthName);

    if (monthInfo) {
      const table = $(element).closest('td').find('table').first();
      if (!table || table.length === 0) return;

      data.months[monthName] = {};

      // Parse each day's working hours within the month
      table.find('tr').each((i, row) => {
        const cols = $(row).find('td');
        if (cols.length >= 4) {
          const dayText = $(cols[0]).text().trim();
          const workHoursText = $(cols[2]).text().trim();

          const day = parseInt(dayText, 10);
          const workHours = workHoursText ? parseFloat(workHoursText.replace(',', '.')) : 0;

          if (!isNaN(day)) {
            data.months[monthName][day] = workHours;

            // Check if workHours exceeds maximum allowed
            if (workHours > maxWorkHours) {
              workHourWarnings.push(`⚠️  ${monthName} day ${day} exceeds max allowed work hours (${workHours} > ${maxWorkHours})`);
            }
          }
        }
      });

      // After parsing, validate the number of days in the month
      const actualDays = Object.keys(data.months[monthName]).length;
      if (actualDays !== monthInfo.maxDays) {
        monthWarnings.push(`⚠️  ${monthName} has ${actualDays} days, expected ${monthInfo.maxDays}`);
      }
    }
  });

  // Save the resulting JSON to a file in the work_hours directory
  const outputFilename = path.join(workHoursDir, `work_hours_${year}.json`);
  fs.writeFileSync(outputFilename, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ JSON file created: ${outputFilename}`);

  // Display warnings if any
  if (monthWarnings.length > 0 || workHourWarnings.length > 0) {
    console.log('\nValidation Warnings:');
    monthWarnings.forEach(warning => console.log(warning));
    workHourWarnings.forEach(warning => console.log(warning));
  }

  // Parse the "Total årsarbetstid" from the HTML
  const totalWorkHoursElement = $('font:contains("Total årsarbetstid")').text().trim();
  const totalWorkHoursMatch = totalWorkHoursElement.match(/(\d+(\.\d+)?)/);
  const totalWorkHours = totalWorkHoursMatch ? parseFloat(totalWorkHoursMatch[1]) : null;

  if (totalWorkHours === null) {
    console.error(`❌ Error: Could not find "Total årsarbetstid" in the file: ${file}`);
  } else {
    // Calculate the sum of all parsed work hours
    let parsedWorkHoursSum = 0;
    Object.values(data.months).forEach(days => {
      Object.values(days).forEach(hours => {
        parsedWorkHoursSum += hours;
      });
    });

    // Validate the parsed work hours against the total work hours
    if (Math.abs(parsedWorkHoursSum - totalWorkHours) > 0.01) { // Allowing a small floating-point tolerance
      console.error(`❌ Validation failed: Parsed work hours (${parsedWorkHoursSum}) do not match "Total årsarbetstid" (${totalWorkHours}) in file: ${file}`);
    } else {
      console.log(`✅ Validation passed: Parsed work hours (${parsedWorkHoursSum}) match "Total årsarbetstid" (${totalWorkHours}) in file: ${file}`);
    }
  }
});