# Work Hours Calendar Generator

This project processes work hours data from HTML files and generates calendar files in ICS format. It supports multiple languages and allows customization of work hours and skipped days.

## Features

- Parses work hours from HTML reference tables.
- Validates work hours against a maximum allowed value.
- Generates ICS calendar files for different languages.
- Supports skipping weekends or custom days.
- Supports input HTML files with a specific structure

## Prerequisites

- Node.js installed on your system.
- Dependencies installed via `npm install`.

## Installation

1. Clone the repository.
2. Navigate to the project directory.
3. Run `npm install` to install dependencies.

## Usage

### Parsing Work Hours

Run the following command to parse work hours from HTML files in the `input` folder:

```bash
node parseWorkHours.js -inputFolder input
```

Optional arguments:
- `-maxWorkHours <number>`: Set the maximum allowed work hours per day (default is 8).

### Generating Calendars

After parsing, generate calendar files using:

```bash
node generateCalendars.js -inputFolder ./output/work_hours/
```

Optional arguments:
- `-skipDays <days>`: Comma-separated list of days to skip (e.g., `0,6` for Sunday and Saturday).

### Combined Build Command

To parse work hours and generate calendars in one step, use:

```bash
npm run build
```

## Output

- Parsed work hours are saved as JSON files in the `output/work_hours` directory.
- Generated ICS calendar files are saved in the `output/calendars` directory.

## File Structure

```
.
├── input/                 # Input HTML files
├── output/
│   ├── work_hours/        # Parsed work hours JSON files
│   └── calendars/         # Generated ICS calendar files
├── parseWorkHours.js      # Script to parse work hours
├── generateCalendars.js   # Script to generate calendars
├── package.json           # Project metadata and dependencies
└── readme.md              # Project documentation
```

## License

This project is licensed under the MIT License. See the `package.json` for details.

## Author

Michael Rosendahl  
[GitHub Profile](https://github.com/MrRosendahl)
