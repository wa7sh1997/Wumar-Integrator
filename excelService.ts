import * as XLSX from 'xlsx';
import { SheetData } from './types';

export const generateExcelFile = (filename: string, sheets: SheetData[]): boolean => {
  try {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      // Create worksheet from array of arrays
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
      
      // Basic styling (width) - rudimentary since xlsx free version has limited styling
      // Calculating max width for each column
      const colWidths = sheet.data.reduce((acc: any[], row) => {
        row.forEach((cell, i) => {
          const len = cell ? String(cell).length : 0;
          acc[i] = Math.max(acc[i] || 0, len);
        });
        return acc;
      }, []);

      worksheet['!cols'] = colWidths.map((w: number) => ({ wch: w + 2 }));

      // Excel sheet names strictly limited to 31 chars
      // Also forbidden characters: \ / ? * [ ] :
      let safeName = sheet.name.replace(/[\\/?*[\]:]/g, '').substring(0, 31);
      
      // Ensure unique sheet names if truncation caused duplicates
      let counter = 1;
      const originalName = safeName;
      while (workbook.SheetNames.includes(safeName)) {
        const suffix = ` (${counter})`;
        if (originalName.length + suffix.length > 31) {
             safeName = originalName.substring(0, 31 - suffix.length) + suffix;
        } else {
             safeName = originalName + suffix;
        }
        counter++;
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
    });

    const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, fullFilename);
    return true;
  } catch (error) {
    console.error("Failed to generate Excel file", error);
    return false;
  }
};