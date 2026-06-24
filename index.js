require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Match = require('./models/Match');
const Team = require('./models/Team');

const groupStageGroups = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const getGroupStageGroups = async () => {
  const distinctGroups = await Match.distinct('group');
  return distinctGroups
    .map(g => String(g).toUpperCase())
    .filter(g => groupStageGroups.includes(g))
    .sort((a, b) => groupStageGroups.indexOf(a) - groupStageGroups.indexOf(b));
};

const sortStandings = (entries) => entries.sort((a,b) => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📡 Conectado ao MongoDB Atlas com sucesso!'))
  .catch((err) => console.error('❌ Erro ao conectar ao MongoDB Atlas:', err));

app.get('/api/matches', async (req, res) => {
  try {
    const { group } = req.query;
    if (!group) {
      return res.status(400).json({ error: 'O parâmetro "group" é obrigatório.' });
    }

    const matches = await Match.find({ group: group.toUpperCase() })
      .populate('homeTeam')
      .populate('awayTeam')
      .sort({ date: 1 });

    return res.json(matches);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar partidas.' });
  }
});

app.get('/api/standings', async (req, res) => {
  try {
    const { group } = req.query;
    if (!group) {
      return res.status(400).json({ error: 'O parâmetro "group" é obrigatório.' });
    }

    const matches = await Match.find({ group: group.toUpperCase() })
      .populate('homeTeam')
      .populate('awayTeam');

    const standings = {};

    matches.forEach((match) => {
      const homeTeam = match.homeTeam;
      const awayTeam = match.awayTeam;
      if (!homeTeam || !awayTeam) return;

      const homeName = homeTeam.name;
      const awayName = awayTeam.name;
      const homeScore = match.homeScore;
      const awayScore = match.awayScore;

      const addTeam = (team) => {
        if (!standings[team.name]) {
          standings[team.name] = {
            teamId: team._id,
            name: team.name,
            flag: team.flag || null,
            group: team.group,
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDiff: 0,
            points: 0
          };
        }
      };

      addTeam(homeTeam);
      addTeam(awayTeam);

      if (homeScore === null || awayScore === null || homeScore === undefined || awayScore === undefined) {
        return;
      }

      const homeStats = standings[homeName];
      const awayStats = standings[awayName];

      homeStats.played += 1;
      awayStats.played += 1;
      homeStats.goalsFor += homeScore;
      homeStats.goalsAgainst += awayScore;
      awayStats.goalsFor += awayScore;
      awayStats.goalsAgainst += homeScore;
      homeStats.goalDiff = homeStats.goalsFor - homeStats.goalsAgainst;
      awayStats.goalDiff = awayStats.goalsFor - awayStats.goalsAgainst;

      if (homeScore > awayScore) {
        homeStats.win += 1;
        awayStats.loss += 1;
        homeStats.points += 3;
      } else if (homeScore < awayScore) {
        awayStats.win += 1;
        homeStats.loss += 1;
        awayStats.points += 3;
      } else {
        homeStats.draw += 1;
        awayStats.draw += 1;
        homeStats.points += 1;
        awayStats.points += 1;
      }
    });

    const sortedStandings = Object.values(standings).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });

    return res.json(sortedStandings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao calcular a classificação.' });
  }
});

// Retorna os 3ºs colocados de cada grupo ordenados e os 8 melhores
app.get('/api/best-thirds', async (req, res) => {
  try {
    const groups = await getGroupStageGroups();
    const matches = await Match.find({ group: { $in: groups } })
      .populate('homeTeam')
      .populate('awayTeam');

    const byGroup = {};
    groups.forEach(g => byGroup[g] = []);
    matches.forEach(m => {
      if (!m || !m.group) return;
      byGroup[m.group] = byGroup[m.group] || [];
      byGroup[m.group].push(m);
    });

    const computeStandingsFromMatches = (matchesForGroup) => {
      const s = {};
      matchesForGroup.forEach(match => {
        const home = match.homeTeam;
        const away = match.awayTeam;
        if (!home || !away) return;
        const add = (team) => {
          if (!s[team.name]) s[team.name] = { teamId: team._id, name: team.name, group: team.group, played:0, win:0, draw:0, loss:0, goalsFor:0, goalsAgainst:0, goalDiff:0, points:0 };
        };
        add(home); add(away);
        if (match.homeScore === null || match.awayScore === null || match.homeScore === undefined || match.awayScore === undefined) return;
        const homeStats = s[home.name];
        const awayStats = s[away.name];
        homeStats.played += 1; awayStats.played += 1;
        homeStats.goalsFor += match.homeScore; homeStats.goalsAgainst += match.awayScore;
        awayStats.goalsFor += match.awayScore; awayStats.goalsAgainst += match.homeScore;
        homeStats.goalDiff = homeStats.goalsFor - homeStats.goalsAgainst;
        awayStats.goalDiff = awayStats.goalsFor - awayStats.goalsAgainst;
        if (match.homeScore > match.awayScore) { homeStats.win +=1; homeStats.points +=3; awayStats.loss +=1; }
        else if (match.homeScore < match.awayScore) { awayStats.win +=1; awayStats.points +=3; homeStats.loss +=1; }
        else { homeStats.draw +=1; awayStats.draw +=1; homeStats.points +=1; awayStats.points +=1; }
      });
      return Object.values(s).sort((a,b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      });
    };

    const thirds = [];
    for (const g of groups) {
      const st = computeStandingsFromMatches(byGroup[g] || []);
      if (st && st.length >= 3) {
        const third = st[2];
        thirds.push({ group: g, teamId: third.teamId, name: third.name, points: third.points, gd: third.goalDiff, gf: third.goalsFor });
      }
    }

    thirds.sort((a,b) => (b.points - a.points) || (b.gd - a.gd) || (b.gf - a.gf) || a.name.localeCompare(b.name, 'pt-BR'));
    const best8 = thirds.slice(0,8);
    return res.json({ allThirds: thirds, best8 });
  } catch (err) {
    console.error('Erro em /api/best-thirds', err);
    return res.status(500).json({ error: 'Erro ao calcular melhores terceiros.' });
  }
});

app.put('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore, penaltiesHome, penaltiesAway } = req.body;

    const parsedHomeScore = homeScore !== undefined && homeScore !== null ? Number(homeScore) : null;
    const parsedAwayScore = awayScore !== undefined && awayScore !== null ? Number(awayScore) : null;
    const parsedPenHome = penaltiesHome !== undefined && penaltiesHome !== null ? Number(penaltiesHome) : null;
    const parsedPenAway = penaltiesAway !== undefined && penaltiesAway !== null ? Number(penaltiesAway) : null;

    const updatedMatch = await Match.findByIdAndUpdate(
      id,
      { homeScore: parsedHomeScore, awayScore: parsedAwayScore, penaltiesHome: parsedPenHome, penaltiesAway: parsedPenAway, decidedByPenalties: (parsedPenHome !== null && parsedPenAway !== null) },
      { new: true }
    ).populate('homeTeam awayTeam');

    if (!updatedMatch) {
      return res.status(404).json({ error: 'Partida não encontrada.' });
    }

    // Se a partida pertence ao mata-mata e aponta para um nextMatch, avance o vencedor
    try {
      if (updatedMatch.nextMatch) {
        let winnerId = null;
        // normal win
        if (updatedMatch.homeScore !== null && updatedMatch.awayScore !== null) {
          if (updatedMatch.homeScore > updatedMatch.awayScore) winnerId = updatedMatch.homeTeam._id;
          else if (updatedMatch.awayScore > updatedMatch.homeScore) winnerId = updatedMatch.awayTeam._id;
          else {
            // tie - check penalties
            if (updatedMatch.decidedByPenalties && updatedMatch.penaltiesHome !== null && updatedMatch.penaltiesAway !== null) {
              if (updatedMatch.penaltiesHome > updatedMatch.penaltiesAway) winnerId = updatedMatch.homeTeam._id;
              else if (updatedMatch.penaltiesAway > updatedMatch.penaltiesHome) winnerId = updatedMatch.awayTeam._id;
            }
          }
        }
        if (winnerId) {
          const slot = updatedMatch.nextSlot === 'away' ? 'awayTeam' : 'homeTeam';
          await Match.findByIdAndUpdate(updatedMatch.nextMatch, { [slot]: winnerId });
        }
      }
    } catch (advErr) {
      console.error('Erro ao avançar vencedor:', advErr);
    }

    return res.json({ message: 'Placar atualizado com sucesso!', match: updatedMatch });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar o placar.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;

// Gera chaveamento de mata-mata (R16) a partir das classificações atuais
app.post('/api/generate-knockout', async (req, res) => {
  try {
    const groups = await getGroupStageGroups();
    const matches = await Match.find({ group: { $in: groups } })
      .populate('homeTeam')
      .populate('awayTeam');

    const byGroup = {};
    groups.forEach(g => byGroup[g] = []);
    matches.forEach(m => {
      if (!m || !m.group) return;
      byGroup[m.group] = byGroup[m.group] || [];
      byGroup[m.group].push(m);
    });

    const computeStandingsFromMatches = (matchesForGroup) => {
      const s = {};
      matchesForGroup.forEach(match => {
        const home = match.homeTeam;
        const away = match.awayTeam;
        if (!home || !away) return;
        const add = (team) => {
          if (!s[team.name]) s[team.name] = { teamId: team._id, name: team.name, group: team.group, played:0, win:0, draw:0, loss:0, goalsFor:0, goalsAgainst:0, goalDiff:0, points:0 };
        };
        add(home); add(away);
        if (match.homeScore === null || match.awayScore === null || match.homeScore === undefined || match.awayScore === undefined) return;
        const homeStats = s[home.name];
        const awayStats = s[away.name];
        homeStats.played += 1; awayStats.played += 1;
        homeStats.goalsFor += match.homeScore; homeStats.goalsAgainst += match.awayScore;
        awayStats.goalsFor += match.awayScore; awayStats.goalsAgainst += match.homeScore;
        homeStats.goalDiff = homeStats.goalsFor - homeStats.goalsAgainst;
        awayStats.goalDiff = awayStats.goalsFor - awayStats.goalsAgainst;
        if (match.homeScore > match.awayScore) { homeStats.win +=1; homeStats.points +=3; awayStats.loss +=1; }
        else if (match.homeScore < match.awayScore) { awayStats.win +=1; awayStats.points +=3; homeStats.loss +=1; }
        else { homeStats.draw +=1; awayStats.draw +=1; homeStats.points +=1; awayStats.points +=1; }
      });
      return Object.values(s).sort((a,b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      });
    };

    const winnersByGroup = {};
    const runnersByGroup = {};
    const thirds = [];
    const groupStandings = {};

    for (const g of groups) {
      const st = computeStandingsFromMatches(byGroup[g] || []);
      groupStandings[g] = st;
      if (st && st.length > 0) {
        if (st[0]) winnersByGroup[g] = st[0];
        if (st[1]) runnersByGroup[g] = st[1];
        if (st[2]) thirds.push({ group: g, teamId: st[2].teamId, name: st[2].name, points: st[2].points, gd: st[2].goalDiff, gf: st[2].goalsFor });
      }
    }

    thirds.sort((a,b) => (b.points - a.points) || (b.gd - a.gd) || (b.gf - a.gf) || a.name.localeCompare(b.name, 'pt-BR'));
    const best8 = thirds.slice(0, 8);

    if (best8.length < 8) {
      return res.status(400).json({ error: `Não há 8 terceiros classificados suficientes para gerar R32: encontrados ${best8.length}` });
    }

    const r32Map = [
      { home: { type: '1st', group: 'E' }, away: { type: 'bestThird', rank: 1 } },
      { home: { type: '1st', group: 'I' }, away: { type: 'bestThird', rank: 2 } },
      { home: { type: '2nd', group: 'A' }, away: { type: '2nd', group: 'B' } },
      { home: { type: '1st', group: 'F' }, away: { type: '2nd', group: 'C' } },
      { home: { type: '2nd', group: 'K' }, away: { type: '2nd', group: 'L' } },
      { home: { type: '1st', group: 'H' }, away: { type: '2nd', group: 'J' } },
      { home: { type: '1st', group: 'D' }, away: { type: 'bestThird', rank: 3 } },
      { home: { type: '1st', group: 'G' }, away: { type: 'bestThird', rank: 4 } },
      { home: { type: '2nd', group: 'F' }, away: { type: '2nd', group: 'E' } },
      { home: { type: '2nd', group: 'I' }, away: { type: '1st', group: 'C' } },
      { home: { type: '1st', group: 'A' }, away: { type: 'bestThird', rank: 5 } },
      { home: { type: '1st', group: 'L' }, away: { type: 'bestThird', rank: 6 } },
      { home: { type: '1st', group: 'J' }, away: { type: '2nd', group: 'H' } },
      { home: { type: '2nd', group: 'D' }, away: { type: '2nd', group: 'G' } },
      { home: { type: '1st', group: 'B' }, away: { type: 'bestThird', rank: 7 } },
      { home: { type: '1st', group: 'K' }, away: { type: 'bestThird', rank: 8 } }
    ];

    const getTeamEntry = (spec) => {
      if (!spec) return null;
      if (spec.type === '1st') return winnersByGroup[spec.group] || null;
      if (spec.type === '2nd') return runnersByGroup[spec.group] || null;
      if (spec.type === 'bestThird') return best8[spec.rank - 1] || null;
      return null;
    };

    // Remove any existing knockout phase matches before criar uma nova chave
    await Match.deleteMany({ group: { $in: ['R32', 'R16', 'QF', 'SF', 'Final'] } });

    const finalObj = { group: 'Final', date: null, homeTeam: null, awayTeam: null, homeScore: null, awayScore: null, local: '' };
    const finalCreated = await Match.create(finalObj);

    const sfObjs = [];
    for (let i = 0; i < 2; i++) {
      sfObjs.push({ group: 'SF', date: null, homeTeam: null, awayTeam: null, homeScore: null, awayScore: null, local: '', nextMatch: finalCreated._id, nextSlot: i === 0 ? 'home' : 'away' });
    }
    const sfCreated = await Match.insertMany(sfObjs);

    const qfObjs = [];
    for (let i = 0; i < 4; i++) {
      const targetSf = sfCreated[Math.floor(i/2)];
      const slot = (i % 2 === 0) ? 'home' : 'away';
      qfObjs.push({ group: 'QF', date: null, homeTeam: null, awayTeam: null, homeScore: null, awayScore: null, local: '', nextMatch: targetSf._id, nextSlot: slot });
    }
    const qfCreated = await Match.insertMany(qfObjs);

    const r16Objs = [];
    for (let i = 0; i < 8; i++) {
      const targetQf = qfCreated[Math.floor(i/2)];
      const slot = (i % 2 === 0) ? 'home' : 'away';
      r16Objs.push({ group: 'R16', date: null, homeTeam: null, awayTeam: null, homeScore: null, awayScore: null, local: '', nextMatch: targetQf._id, nextSlot: slot });
    }
    const r16Created = await Match.insertMany(r16Objs);

    const r32Objs = r32Map.map((mapping, i) => {
      const homeEntry = getTeamEntry(mapping.home);
      const awayEntry = getTeamEntry(mapping.away);
      const targetR16 = r16Created[Math.floor(i / 2)];
      const slot = (i % 2 === 0) ? 'home' : 'away';
      return {
        group: 'R32',
        date: null,
        homeTeam: homeEntry ? homeEntry.teamId : null,
        awayTeam: awayEntry ? awayEntry.teamId : null,
        homeScore: null,
        awayScore: null,
        local: '',
        nextMatch: targetR16._id,
        nextSlot: slot
      };
    });

    const r32Created = await Match.insertMany(r32Objs);
    return res.json({ message: 'Chaveamento gerado (R32/R16/QF/SF/Final)', created: { final: finalCreated, sf: sfCreated, qf: qfCreated, r16: r16Created, r32: r32Created } });
  } catch (err) {
    console.error('Erro ao gerar chaveamento:', err);
    return res.status(500).json({ error: 'Erro ao gerar chaveamento.' });
  }
});