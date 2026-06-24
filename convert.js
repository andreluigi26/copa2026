const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Ler o arquivo Excel
const workbook = xlsx.readFile('tabela-copa-do-mundo-fifa-2026/tabela-copa-do-mundo-fifa-2026.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_csv(sheet);

// Salvar como CSV
fs.writeFileSync('tabela-copa-do-mundo-fifa-2026/xlx - Gr-A.csv', data);
console.log('✅ Arquivo convertido com sucesso!');
