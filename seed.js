require('dotenv').config();
const fs = require('fs');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Team = require('./models/Team');
const Match = require('./models/Match');

async function runSeed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Conectado ao MongoDB Atlas com sucesso!');

    // Limpa todos os dados existentes e importa todos os grupos
    await Match.deleteMany({});
    await Team.deleteMany({});

    const workbook = xlsx.readFile('tabela-copa-do-mundo-fifa-2026/tabela-copa-do-mundo-fifa-2026.xlsx');
    const groupSheets = workbook.SheetNames.filter((name) => /^Gr-[A-Z]$/i.test(name));

    const teamInfo = {};
    const matchesToInsert = [];

    for (const sheetName of groupSheets) {
      const group = sheetName.split('-')[1].toUpperCase();
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      for (const row of rows) {
        const rodadaData = row[0];
        const homeName = row[1];
        const homeScore = row[3];
        const separator = row[4];
        const awayScore = row[5];
        const awayName = row[7];
        const local = row[8];

        if (!rodadaData || !homeName || separator !== '✕' || !awayName) {
          continue;
        }

        const homeNameText = homeName.toString().trim();
        const awayNameText = awayName.toString().trim();

        teamInfo[homeNameText] = { name: homeNameText, group };
        teamInfo[awayNameText] = { name: awayNameText, group };

        matchesToInsert.push({
          group,
          date: rodadaData.toString().trim(),
          homeName: homeNameText,
          awayName: awayNameText,
          homeScore: homeScore !== '' && !isNaN(homeScore) ? Number(homeScore) : null,
          awayScore: awayScore !== '' && !isNaN(awayScore) ? Number(awayScore) : null,
          local: local ? local.toString().trim() : 'Não definido'
        });
      }
    }

    const teamMap = {};
    for (const [teamName, info] of Object.entries(teamInfo)) {
      const team = await Team.create(info);
      teamMap[teamName] = team._id;
    }
    console.log(`✅ ${Object.keys(teamMap).length} seleções salvas no Atlas!`);

    for (const jogo of matchesToInsert) {
      await Match.create({
        group: jogo.group,
        date: jogo.date,
        homeTeam: teamMap[jogo.homeName],
        awayTeam: teamMap[jogo.awayName],
        homeScore: jogo.homeScore,
        awayScore: jogo.awayScore,
        local: jogo.local
      });
    }

    console.log(`✅ ${matchesToInsert.length} jogos processados e salvos!`);
    process.exit(0);

  } catch (error) {
    console.error('Erro de conexão inicial:', error);
    process.exit(1);
  }
}

runSeed();