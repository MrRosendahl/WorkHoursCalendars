const languages = [
    { 
      lang: 'en', 
      textSummary: 'Work Hours: ${hours}', 
      textDescription: 'Work hours for ${day} ${monthName}: ${hours} hours',
      textMonthTotal: '\\nTotal work hours for ${monthName}: ${hours}',
      textYear: 'Year',
      textYearlyTotals: 'Yearly Summary:\\n${monthlyTotals}\\nTotal: ${yearTotalHours} hours',
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },
    { 
      lang: 'sv', 
      textSummary: 'Arbetstid: ${hours}', 
      textDescription: 'Arbetstid ${day} ${monthName}: ${hours} timmar',
      textMonthTotal: '\\nTotalt arbetstid för ${monthName}: ${hours}',
      textYear: 'År',
      textYearlyTotals: '\\nÅrssammanställning:\\n${monthlyTotals}\\nTotal: ${yearTotalHours} timmar',
      monthNames: ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
    },
  ];
  
  module.exports = languages;