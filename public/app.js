document.addEventListener('DOMContentLoaded', () => {
  const matchesContainer = document.getElementById('matches-container');
  const standingsContainer = document.getElementById('standings-container');
  const knockoutContainer = document.getElementById('knockout-container');
  const generateKnockoutBtn = document.getElementById('generate-knockout-btn');
  const groupSelect = document.getElementById('group-select');
  const stageSelect = document.getElementById('stage-select');

  async function fetchMatches(group) {
    try {
      matchesContainer.innerHTML = '<p class="loading">Carregando jogos...</p>';
      standingsContainer.innerHTML = '<p class="loading">Carregando classificação...</p>';

      const [matchesRes, standingsRes] = await Promise.all([
        fetch(`/api/matches?group=${group}`),
        fetch(`/api/standings?group=${group}`)
      ]);

      if (!matchesRes.ok || !standingsRes.ok) {
        const message = `Erro de API: matches=${matchesRes.status} standings=${standingsRes.status}`;
        throw new Error(message);
      }

      const [matches, standings] = await Promise.all([matchesRes.json(), standingsRes.json()]);

      if (!Array.isArray(matches)) {
        throw new Error('Resposta de /api/matches não é lista');
      }

      if (matches.length === 0) {
        matchesContainer.innerHTML = '<p>Nenhum jogo encontrado para este grupo.</p>';
      } else {
        renderMatches(matches);
      }

      if (!Array.isArray(standings)) {
        throw new Error('Resposta de /api/standings não é lista');
      }

      if (standings.length === 0) {
        standingsContainer.innerHTML = '<p>Classificação não disponível.</p>';
      } else {
        renderStandings(standings);
      }
    } catch (error) {
      console.error('Erro ao buscar jogos:', error);
      matchesContainer.innerHTML = '<p class="error">Erro ao carregar os jogos. Verifique o console.</p>';
      standingsContainer.innerHTML = '<p class="error">Erro ao carregar a classificação.</p>';
    }
  }

  function renderMatches(matches) {
    matchesContainer.innerHTML = '';

    matches.forEach(match => {
      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';

      const homeScoreVal = match.homeScore !== null ? match.homeScore : '';
      const awayScoreVal = match.awayScore !== null ? match.awayScore : '';

      matchCard.innerHTML = `
        <div class="match-info">
          <span class="match-date">${match.date}</span>
          <span class="match-local">📍 ${match.local}</span>
        </div>
        <div class="match-teams">
          <div class="team home">
            <span class="team-name">${match.homeTeam.name}</span>
          </div>
          <div class="score-inputs">
            <input type="number" min="0" class="score-input" data-match-id="${match._id}" data-team="home" value="${homeScoreVal}" placeholder="-">
            <span class="vs">✕</span>
            <input type="number" min="0" class="score-input" data-match-id="${match._id}" data-team="away" value="${awayScoreVal}" placeholder="-">
          </div>
          <div class="team away">
            <span class="team-name">${match.awayTeam.name}</span>
          </div>
        </div>
        <button class="btn-save" data-match-id="${match._id}">Salvar Placar</button>
      `;

      matchesContainer.appendChild(matchCard);
    });

    document.querySelectorAll('.btn-save').forEach(button => {
      button.addEventListener('click', handleSaveScore);
    });
  }

  // Renderiza jogos do mata-mata (group R16)
  async function fetchKnockoutMatches() {
    try {
      if (!knockoutContainer) return;
      knockoutContainer.innerHTML = '<p class="loading">Carregando chaveamento...</p>';
      const stage = stageSelect ? stageSelect.value : 'R32';
      const res = await fetch(`/api/matches?group=${stage}`);
      if (!res.ok) {
        knockoutContainer.innerHTML = '<p class="error">Nenhum chaveamento encontrado.</p>';
        return;
      }
      const matches = await res.json();
      renderKnockout(matches, stage);
    } catch (err) {
      console.error('Erro ao buscar mata-mata:', err);
      knockoutContainer.innerHTML = '<p class="error">Erro ao carregar mata-mata.</p>';
    }
  }

  function renderKnockout(matches, stage) {
    if (!knockoutContainer) return;
    if (!matches || matches.length === 0) {
      knockoutContainer.innerHTML = '<p>Nenhum jogo do mata-mata disponível.</p>';
      return;
    }
    const stageLabel = stage || 'R32';
    knockoutContainer.innerHTML = '';
    const bracket = document.createElement('div');
    bracket.className = 'bracket';
    const round = document.createElement('div');
    round.className = 'round';
    const h = document.createElement('h3');
    h.textContent = stageLabel;
    round.appendChild(h);
    bracket.appendChild(round);

    matches.forEach((match, idx) => {
      const node = document.createElement('div');
      node.className = 'match-node';
      node.id = `node-r0-i${idx}`;
      node.dataset.matchId = match._id || '';
      const home = match.homeTeam?.name || 'TBD';
      const away = match.awayTeam?.name || 'TBD';
      const hasTie = match.homeScore !== null && match.awayScore !== null && match.homeScore === match.awayScore;
      const showPenaltyRow = hasTie || match.penaltiesHome !== null || match.penaltiesAway !== null;
      node.innerHTML = `<div class="names">${home} <span>vs</span> ${away}</div>
        <div class="score-row">
          <label class="score-label">Placar</label>
          <div class="score-inputs">
            <input type="number" min="0" class="score-input" data-match-id="${match._id}" data-team="home" value="${match.homeScore ?? ''}" placeholder="0">
            <span class="score-separator">-</span>
            <input type="number" min="0" class="score-input" data-match-id="${match._id}" data-team="away" value="${match.awayScore ?? ''}" placeholder="0">
          </div>
        </div>
        <div class="penalty-row" style="display:${showPenaltyRow ? 'grid' : 'none'}">
          <span class="score-label">Pênaltis</span>
          <div class="penalty-inputs">
            <input type="number" min="0" class="penalty-input" data-match-id="${match._id}" data-team="home" value="${match.penaltiesHome ?? ''}" placeholder="0">
            <span class="score-separator">-</span>
            <input type="number" min="0" class="penalty-input" data-match-id="${match._id}" data-team="away" value="${match.penaltiesAway ?? ''}" placeholder="0">
          </div>
        </div>
        <button class="btn-save" data-match-id="${match._id}" style="margin-top:8px">Salvar Placar</button>`;
      round.appendChild(node);
    });

    knockoutContainer.appendChild(bracket);

    // rebind save buttons inside bracket (if any matches have ids)
    bracket.querySelectorAll('.btn-save').forEach(b => b.addEventListener('click', handleSaveScore));
  }

  async function generateKnockout() {
    if (!confirm('Gerar R32 a partir das classificações atuais? Isso criará jogos no banco.')) return;
    try {
      generateKnockoutBtn.textContent = 'Gerando...';
      generateKnockoutBtn.disabled = true;
      const res = await fetch('/api/generate-knockout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
      alert('R32 gerado com sucesso.');
      fetchKnockoutMatches();
    } catch (err) {
      console.error('Erro ao gerar R32:', err);
      alert('Erro ao gerar R32. Veja console.');
    } finally {
      generateKnockoutBtn.textContent = 'Gerar R32';
      generateKnockoutBtn.disabled = false;
    }
  }

  function renderStandings(standings) {
    standingsContainer.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'standings-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>P</th>
          <th>V</th>
          <th>E</th>
          <th>D</th>
          <th>GP</th>
          <th>GC</th>
          <th>SG</th>
          <th>PTS</th>
        </tr>
      </thead>
      <tbody>
        ${standings.map((team, index) => `
          <tr data-team-id="${team._id || team.id || ''}" data-team-name="${team.name.replace(/"/g, '&quot;')}" data-points="${team.points}" data-gd="${team.goalDiff}" data-gf="${team.goalsFor}">
            <td>${index + 1}</td>
            <td>
              <div class="team-cell">
                <span class="team-badge">${team.flag ? `<img src="${team.flag}" alt="${team.name} bandeira">` : ''}</span>
                <span class="team-name-small">${team.name}</span>
              </div>
            </td>
            <td class="played">${team.played}</td>
            <td class="win">${team.win}</td>
            <td class="draw">${team.draw}</td>
            <td class="loss">${team.loss}</td>
            <td class="gf">${team.goalsFor}</td>
            <td class="ga">${team.goalsAgainst}</td>
            <td class="gd">${team.goalDiff}</td>
            <td class="points">${team.points}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    standingsContainer.appendChild(table);
    // aplicar classes visuais baseadas na posição (último eliminado, top2 qualificados)
    applyRowClasses(table);
    // recalcular 8 melhores terceiros entre todos os grupos e marcar na UI
    computeBestThirds();
  }

  function applyRowClasses(table) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    rows.forEach(r => r.classList.remove('eliminado','qualificado'));
    if (!rows.length) return;
    // top 2 qualificados
    if (rows[0]) rows[0].classList.add('qualificado');
    if (rows[1]) rows[1].classList.add('qualificado');
    // último eliminado
    rows[rows.length - 1].classList.add('eliminado');
  }

  async function computeBestThirds() {
    try {
      // limpar marcações anteriores
      document.querySelectorAll('.standings-table tbody tr.best-third').forEach(r => r.classList.remove('best-third'));
      const resp = await fetch('/api/best-thirds');
      if (!resp.ok) return;
      const { best8 } = await resp.json();
      best8.forEach(t => {
        let row = null;
        if (t.teamId) row = document.querySelector(`.standings-table tbody tr[data-team-id="${t.teamId}"]`);
        if (!row && t.name) row = Array.from(document.querySelectorAll('.standings-table tbody tr')).find(r => r.dataset.teamName === t.name);
        if (row) row.classList.add('best-third');
      });
    } catch (err) {
      console.error('Erro ao calcular melhores terceiros:', err);
    }
  }

  async function handleSaveScore(event) {
    const matchId = event.target.getAttribute('data-match-id');
    const card = event.target.closest('.match-card') || event.target.closest('.match-node');
    if (!card) return;
    const homeInput = card.querySelector(`input[data-team="home"]`);
    const awayInput = card.querySelector(`input[data-team="away"]`);
    const penHomeInput = card.querySelector(`.penalty-input[data-team="home"]`);
    const penAwayInput = card.querySelector(`.penalty-input[data-team="away"]`);

    const homeScore = homeInput && homeInput.value !== '' ? parseInt(homeInput.value) : null;
    const awayScore = awayInput && awayInput.value !== '' ? parseInt(awayInput.value) : null;
    const penaltiesHome = penHomeInput && penHomeInput.value !== '' ? parseInt(penHomeInput.value) : null;
    const penaltiesAway = penAwayInput && penAwayInput.value !== '' ? parseInt(penAwayInput.value) : null;

    try {
      event.target.textContent = 'Salvando...';
      event.target.disabled = true;

      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScore, awayScore, penaltiesHome, penaltiesAway })
      });

      if (response.ok) {
        event.target.textContent = '✅ Salvo!';
        card.classList.add('saved-success');
        const selectedGroup = groupSelect.value;
        setTimeout(() => {
          event.target.textContent = 'Salvar Placar';
          event.target.disabled = false;
          card.classList.remove('saved-success');
          fetchMatches(selectedGroup);
        }, 500);
      } else {
        alert('Erro ao salvar o placar.');
        event.target.textContent = 'Salvar Placar';
        event.target.disabled = false;
      }
    } catch (error) {
      console.error('Erro ao atualizar placar:', error);
      alert('Erro na requisição.');
      event.target.textContent = 'Salvar Placar';
      event.target.disabled = false;
    }
  }

  groupSelect.addEventListener('change', () => {
    fetchMatches(groupSelect.value);
  });

  if (stageSelect) {
    stageSelect.addEventListener('change', fetchKnockoutMatches);
  }

  if (generateKnockoutBtn) generateKnockoutBtn.addEventListener('click', generateKnockout);

  // carregar chaveamento ao iniciar
  fetchKnockoutMatches();

  fetchMatches('A');
});