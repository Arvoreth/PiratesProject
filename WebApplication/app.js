const API_BASE = 'http://localhost:5000/api';

let network = null;
let nodesDataSet = null;
let edgesDataSet = null;
let allNodesData = [];
let allEdgesData = [];
let currentQuery = 'full';
let allCharacters = [];

const nodeColors = {
    Character: { background: '#7c5700', border: '#efd793' },
    Ship: { background: '#3c6e71', border: '#88d4d8' },
    Location: { background: '#6b4c9a', border: '#c9a8e9' },
    Movie: { background: '#8b0000', border: '#ff6b6b' },
    Cast: { background: '#2e5939', border: '#6bc47d' }
};

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initGraph();
    loadFullGraph();
    setTimeout(loadWisdom, 2000);
});

function setupEventListeners() {
    document.querySelectorAll('.query-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.query-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentQuery = btn.dataset.query;
            executeQuery(currentQuery);
        });
    });

    document.getElementById('movieFilter').addEventListener('change', (e) => {
        const movieId = e.target.value;
        switch (currentQuery) {
            case 'full':
            case 'characters':
                filterByMovie(movieId);
                break;
            case 'ships':
                loadShipRoutes(movieId);
                break;
            case 'rivalries':
                loadRivalries(movieId);
                break;
            case 'factions':
                loadFactions(movieId);
                break;
        }
    });

    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') runSearch();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function initGraph() {
    const container = document.getElementById('graph');
    nodesDataSet = new vis.DataSet([]);
    edgesDataSet = new vis.DataSet([]);

    const options = {
        nodes: {
            shape: 'dot',
            size: 20,
            font: { color: '#efd793', size: 12, face: 'Roboto' },
            borderWidth: 2
        },
        edges: {
            color: { color: '#7c5700', highlight: '#ffd700' },
            arrows: { to: { enabled: true, scaleFactor: 0.5 } },
            font: { color: '#b8a070', size: 10, strokeWidth: 0, align: 'middle' },
            smooth: { type: 'continuous', roundness: 0.5 }
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 150,
                springConstant: 0.08
            },
            stabilization: { enabled: true, iterations: 200 }
        },
        interaction: { hover: true, tooltipDelay: 200, hideEdgesOnDrag: true }
    };

    network = new vis.Network(container, { nodes: nodesDataSet, edges: edgesDataSet }, options);

    network.on('click', (params) => {
        if (params.nodes.length > 0) {
            showNodeDetails(params.nodes[0]);
        }
    });

    network.on('hoverNode', () => {
        document.getElementById('graph').style.cursor = 'pointer';
    });

    network.on('blurNode', () => {
        document.getElementById('graph').style.cursor = 'default';
    });
}

async function executeQuery(queryType) {
    document.getElementById('table-view').classList.add('hidden');
    const movieId = document.getElementById('movieFilter').value;

    switch (queryType) {
        case 'full':
            movieId ? filterByMovie(movieId) : await loadFullGraph();
            break;
        case 'characters':
            movieId ? filterByMovie(movieId) : await loadCharacters();
            break;
        case 'ships':
            await loadShipRoutes(movieId || null);
            break;
        case 'rivalries':
            await loadRivalries(movieId || null);
            break;
        case 'factions':
            await loadFactions(movieId || null);
            break;
    }
}

async function loadFullGraph() {
    try {
        const response = await fetch(`${API_BASE}/graph/full`);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
            return;
        }

        allNodesData = data.nodes;
        allEdgesData = data.edges;

        const nodes = data.nodes.map(n => ({
            id: n.id,
            label: n.label,
            group: n.type,
            color: nodeColors[n.type] || nodeColors.Character,
            title: `${n.type}: ${n.label}`,
            nodeData: n.props
        }));

        const edges = data.edges.map((e, i) => ({
            id: `e${i}`,
            from: e.from,
            to: e.to,
            label: e.label,
            title: e.type
        }));

        nodesDataSet.clear();
        edgesDataSet.clear();
        nodesDataSet.add(nodes);
        edgesDataSet.add(edges);
        network.fit();
    } catch (error) {
        console.error('Failed to load graph:', error);
    }
}

async function loadCharacters() {
    try {
        const [charResponse, relResponse] = await Promise.all([
            fetch(`${API_BASE}/characters`),
            fetch(`${API_BASE}/characters/relationships`)
        ]);
        const characters = await charResponse.json();
        const relationships = await relResponse.json();

        const nodes = characters.map(c => ({
            id: c.id,
            label: c.name,
            group: 'Character',
            color: nodeColors.Character,
            title: `${c.role} - ${c.faction}`,
            nodeData: c
        }));

        const edges = relationships.map((r, i) => ({
            id: `char_rel_${i}`,
            from: r.source_id,
            to: r.target_id,
            label: r.relationship_type,
            title: `Movie: ${r.movie_id}`
        }));

        nodesDataSet.clear();
        edgesDataSet.clear();
        nodesDataSet.add(nodes);
        edgesDataSet.add(edges);

        showTable('Characters', characters, ['name', 'role', 'faction', 'status']);
        network.fit();
    } catch (error) {
        console.error('Failed to load characters:', error);
    }
}

async function loadShipRoutes(movieId = null) {
    try {
        const url = movieId ? `${API_BASE}/ships/routes?movie_id=${movieId}` : `${API_BASE}/ships/routes`;
        const response = await fetch(url);
        const routes = await response.json();

        const nodesMap = new Map();
        const edges = [];

        routes.forEach((r, i) => {
            if (!nodesMap.has(r.ship_id)) {
                nodesMap.set(r.ship_id, {
                    id: r.ship_id,
                    label: r.ship_name,
                    group: 'Ship',
                    color: nodeColors.Ship,
                    title: r.ship_type
                });
            }
            if (!nodesMap.has(r.location_id)) {
                nodesMap.set(r.location_id, {
                    id: r.location_id,
                    label: r.location_name,
                    group: 'Location',
                    color: nodeColors.Location,
                    title: r.location_desc
                });
            }
            edges.push({
                id: `route${i}`,
                from: r.ship_id,
                to: r.location_id,
                label: r.route_type,
                title: `Movie: ${r.movie_id}`
            });
        });

        nodesDataSet.clear();
        edgesDataSet.clear();
        nodesDataSet.add(Array.from(nodesMap.values()));
        edgesDataSet.add(edges);

        showTable('Ship Routes', routes, ['ship_name', 'location_name', 'route_type', 'movie_id']);
        network.fit();
    } catch (error) {
        console.error('Failed to load ship routes:', error);
    }
}

async function loadRivalries(movieId = null) {
    try {
        const url = movieId ? `${API_BASE}/rivalries?movie_id=${movieId}` : `${API_BASE}/rivalries`;
        const response = await fetch(url);
        const rivalries = await response.json();

        const nodesMap = new Map();
        const edges = [];

        rivalries.forEach((r, i) => {
            const id1 = r.char1_id || r.character1.replace(/\s+/g, '_');
            const id2 = r.char2_id || r.character2.replace(/\s+/g, '_');

            if (!nodesMap.has(id1)) {
                nodesMap.set(id1, {
                    id: id1,
                    label: r.character1,
                    group: 'Character',
                    color: nodeColors.Character,
                    title: r.faction1
                });
            }
            if (!nodesMap.has(id2)) {
                nodesMap.set(id2, {
                    id: id2,
                    label: r.character2,
                    group: 'Character',
                    color: nodeColors.Character,
                    title: r.faction2
                });
            }

            const edgeColor = r.conflict_type === 'ENEMY' ? '#ff4444' :
                              r.conflict_type === 'BETRAYED' ? '#ff8800' : '#ffaa00';

            edges.push({
                id: `rivalry${i}`,
                from: id1,
                to: id2,
                label: r.conflict_type,
                title: r.movie,
                color: { color: edgeColor }
            });
        });

        nodesDataSet.clear();
        edgesDataSet.clear();
        nodesDataSet.add(Array.from(nodesMap.values()));
        edgesDataSet.add(edges);

        showTable('Rivalries & Conflicts', rivalries, ['character1', 'character2', 'conflict_type', 'movie']);
        network.fit();
    } catch (error) {
        console.error('Failed to load rivalries:', error);
    }
}

async function loadFactions(movieId = null) {
    try {
        const url = movieId ? `${API_BASE}/factions?movie_id=${movieId}` : `${API_BASE}/factions`;
        const response = await fetch(url);
        const factions = await response.json();

        const nodes = [];
        const edges = [];

        factions.forEach((f, i) => {
            const factionId = `faction_${i}`;
            nodes.push({
                id: factionId,
                label: f.faction,
                group: 'faction',
                color: { background: '#8b4513', border: '#ffd700' },
                size: 15 + f.member_count * 3,
                title: `${f.member_count} members`
            });

            f.members.forEach((member, j) => {
                const memberId = f.member_ids ? f.member_ids[j] : `member_${i}_${j}`;
                nodes.push({
                    id: memberId,
                    label: member,
                    group: 'Character',
                    color: nodeColors.Character,
                    size: 12
                });
                edges.push({
                    id: `fe_${i}_${j}`,
                    from: memberId,
                    to: factionId,
                    color: { color: '#7c5700' }
                });
            });
        });

        nodesDataSet.clear();
        edgesDataSet.clear();
        nodesDataSet.add(nodes);
        edgesDataSet.add(edges);

        const tableData = factions.map(f => ({
            faction: f.faction,
            member_count: f.member_count,
            members: f.members.slice(0, 5).join(', ') + (f.members.length > 5 ? '...' : '')
        }));
        showTable('Factions', tableData, ['faction', 'member_count', 'members']);

        network.fit();
    } catch (error) {
        console.error('Failed to load factions:', error);
    }
}

function filterByMovie(movieId) {
    if (!movieId) {
        loadFullGraph();
        return;
    }

    fetch(`${API_BASE}/relationships/${movieId}`)
        .then(res => res.json())
        .then(relationships => {
            const nodesMap = new Map();
            const edges = [];

            relationships.forEach((r, i) => {
                if (!nodesMap.has(r.source_id)) {
                    nodesMap.set(r.source_id, {
                        id: r.source_id,
                        label: r.source,
                        group: 'Character',
                        color: nodeColors.Character,
                        title: r.source_faction
                    });
                }
                if (!nodesMap.has(r.target_id)) {
                    nodesMap.set(r.target_id, {
                        id: r.target_id,
                        label: r.target,
                        group: 'Character',
                        color: nodeColors.Character,
                        title: r.target_faction
                    });
                }
                edges.push({
                    id: `rel${i}`,
                    from: r.source_id,
                    to: r.target_id,
                    label: r.relationship_type
                });
            });

            nodesDataSet.clear();
            edgesDataSet.clear();
            nodesDataSet.add(Array.from(nodesMap.values()));
            edgesDataSet.add(edges);
            network.fit();
        })
        .catch(err => console.error('Filter error:', err));
}

async function runSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    const resultsDiv = document.getElementById('search-results');
    const resultsList = document.getElementById('results-list');

    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();

        resultsList.innerHTML = '';

        if (results.error || !Array.isArray(results)) {
            resultsList.innerHTML = '<li>Search unavailable</li>';
        } else if (results.length === 0) {
            resultsList.innerHTML = '<li>No results found</li>';
        } else {
            results.forEach(r => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="result-name">${r.name}</span>
                    <span class="result-type">${r.type}</span>
                `;
                li.onclick = () => focusNode(r.id);
                resultsList.appendChild(li);
            });
        }

        resultsDiv.classList.remove('hidden');

        const matchingNodes = nodesDataSet.get().filter(n =>
            n.label.toLowerCase().includes(query.toLowerCase())
        );
        if (matchingNodes.length > 0) {
            network.selectNodes(matchingNodes.map(n => n.id));
            network.focus(matchingNodes[0].id, { scale: 1.5, animation: true });
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function focusNode(nodeId) {
    const node = nodesDataSet.get(nodeId);
    if (node) {
        network.selectNodes([nodeId]);
        network.focus(nodeId, { scale: 1.5, animation: { duration: 500 } });
        showNodeDetails(nodeId);
    }
}

function showNodeDetails(nodeId) {
    const node = nodesDataSet.get(nodeId);
    if (!node) return;

    const detailsDiv = document.getElementById('node-details');
    const props = node.nodeData || {};

    let html = `<span class="node-type ${node.group}">${node.group}</span>`;
    html += `<h4 style="color: #ffd700; margin: 10px 0;">${node.label}</h4>`;

    const skipKeys = ['id', 'name', 'label', 'ship_name', 'location_name', 'title'];

    Object.entries(props).forEach(([key, value]) => {
        if (value && !skipKeys.includes(key)) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            html += `
                <div class="detail-row">
                    <div class="detail-label">${label}</div>
                    <div class="detail-value">${value}</div>
                </div>
            `;
        }
    });

    const connections = edgesDataSet.get().filter(e => e.from === nodeId || e.to === nodeId);
    if (connections.length > 0) {
        html += `
            <div class="detail-row">
                <div class="detail-label">Connections</div>
                <div class="detail-value">${connections.length} relationships</div>
            </div>
        `;
    }

    detailsDiv.innerHTML = html;
}

function showTable(title, data, columns) {
    if (!data || data.length === 0) return;

    const tableView = document.getElementById('table-view');
    const tableTitle = document.getElementById('table-title');
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');

    tableTitle.textContent = title;

    tableHead.innerHTML = '<tr>' + columns.map(col =>
        `<th>${col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</th>`
    ).join('') + '</tr>';

    tableBody.innerHTML = data.map(row =>
        '<tr>' + columns.map(col => `<td>${row[col] || '-'}</td>`).join('') + '</tr>'
    ).join('');

    tableView.classList.remove('hidden');
}


// Fun features

async function loadCharactersList() {
    try {
        const response = await fetch(`${API_BASE}/characters`);
        allCharacters = await response.json();
    } catch (error) {
        console.error('Failed to load characters list:', error);
    }
}

function openModal(modalId) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

async function openSixDegrees() {
    if (allCharacters.length === 0) await loadCharactersList();

    const select1 = document.getElementById('char1-select');
    const select2 = document.getElementById('char2-select');

    const options = allCharacters.map(c =>
        `<option value="${c.id}">${c.name}</option>`
    ).join('');

    select1.innerHTML = '<option value="">Select first character...</option>' + options;
    select2.innerHTML = '<option value="">Select second character...</option>' + options;

    const jack = allCharacters.find(c => c.name.includes('Jack Sparrow'));
    if (jack) select1.value = jack.id;

    document.getElementById('path-result').innerHTML = '';
    openModal('six-degrees-modal');
}

async function findPath() {
    const char1 = document.getElementById('char1-select').value;
    const char2 = document.getElementById('char2-select').value;
    const resultDiv = document.getElementById('path-result');

    if (!char1 || !char2) {
        resultDiv.innerHTML = '<p style="color: #ff6b6b;">Please select both characters!</p>';
        return;
    }

    if (char1 === char2) {
        resultDiv.innerHTML = '<p style="color: #ff6b6b;">Select two different characters, ye scallywag!</p>';
        return;
    }

    resultDiv.innerHTML = '<p class="loading">Searching the seven seas</p>';

    try {
        const response = await fetch(`${API_BASE}/path/${char1}/${char2}`);
        const data = await response.json();

        if (data.found) {
            let html = `<div class="degrees-count">${data.degrees} Degree${data.degrees !== 1 ? 's' : ''} of Separation!</div>`;
            html += '<div class="path-chain">';

            data.characters.forEach((char, i) => {
                html += `<span class="path-node">${char.name}</span>`;
                if (i < data.connections.length) {
                    html += `<span class="path-edge">${data.connections[i].type}</span>`;
                }
            });

            html += '</div>';
            resultDiv.innerHTML = html;
        } else {
            resultDiv.innerHTML = '<p style="color: #b8a070;">No connection found! These pirates never crossed paths...</p>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<p style="color: #ff6b6b;">Error searching for path!</p>';
        console.error('Path finding error:', error);
    }
}

async function showLeaderboard() {
    openModal('leaderboard-modal');
    const content = document.getElementById('leaderboard-content');
    content.innerHTML = '<p class="loading">Tallying the scores</p>';

    try {
        const response = await fetch(`${API_BASE}/leaderboard`);
        const data = await response.json();

        let html = '';

        html += `<div class="leaderboard-card">
            <h3>Most Connected</h3>
            <ol>${data.most_connected.map(c =>
                `<li><span>${c.name}</span><span class="stat-value">${c.connections}</span></li>`
            ).join('')}</ol>
        </div>`;

        html += `<div class="leaderboard-card">
            <h3>Most Enemies</h3>
            <ol>${data.most_enemies.map(c =>
                `<li><span>${c.name}</span><span class="stat-value">${c.enemy_count}</span></li>`
            ).join('')}</ol>
        </div>`;

        html += `<div class="leaderboard-card">
            <h3>Most Movie Appearances</h3>
            <ol>${data.most_appearances.map(c =>
                `<li><span>${c.name}</span><span class="stat-value">${c.movies} movies</span></li>`
            ).join('')}</ol>
        </div>`;

        html += `<div class="leaderboard-card">
            <h3>Most Traveled Ships</h3>
            <ol>${data.most_traveled_ships.map(s =>
                `<li><span>${s.name}</span><span class="stat-value">${s.locations} ports</span></li>`
            ).join('')}</ol>
        </div>`;

        content.innerHTML = html;
    } catch (error) {
        content.innerHTML = '<p style="color: #ff6b6b;">Failed to load leaderboard!</p>';
        console.error('Leaderboard error:', error);
    }
}

async function getFortune() {
    openModal('fortune-modal');
    const textDiv = document.getElementById('fortune-text');
    const detailsDiv = document.getElementById('fortune-details');

    textDiv.innerHTML = '<p class="loading">Gazing into the crystal ball</p>';
    detailsDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/fortune`);
        const data = await response.json();

        textDiv.innerHTML = `"${data.fortune}"`;

        detailsDiv.innerHTML = `
            <div class="fortune-detail">
                <div class="label">Lucky Number</div>
                <div class="value">${data.lucky_number}</div>
            </div>
            <div class="fortune-detail">
                <div class="label">Lucky Item</div>
                <div class="value">${data.lucky_item}</div>
            </div>
        `;
    } catch (error) {
        textDiv.innerHTML = '<p style="color: #ff6b6b;">The spirits are silent...</p>';
        console.error('Fortune error:', error);
    }
}

async function generatePirateName() {
    openModal('pirate-name-modal');
    const resultDiv = document.getElementById('pirate-name-result');
    resultDiv.innerHTML = '<p class="loading">Summoning yer destiny</p>';

    try {
        const response = await fetch(`${API_BASE}/pirate-name`);
        const data = await response.json();

        resultDiv.innerHTML = `
            <div class="pirate-name">${data.pirate_name}</div>
            <div class="pirate-stats">
                <div class="stat">
                    <div class="stat-label">Vessel</div>
                    <div class="stat-value">${data.vessel}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Crew Size</div>
                    <div class="stat-value">${data.crew_size} sailors</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Bounty</div>
                    <div class="stat-value">${data.bounty}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Reputation</div>
                    <div class="stat-value">${data.reputation}</div>
                </div>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = '<p style="color: #ff6b6b;">The fates are unclear...</p>';
        console.error('Pirate name error:', error);
    }
}

async function drinkRum() {
    openModal('rum-modal');
    const messageDiv = document.getElementById('rum-message');
    const counterDiv = document.getElementById('rum-counter');

    const bottle = document.querySelector('.rum-bottle');
    bottle.style.animation = 'none';
    setTimeout(() => bottle.style.animation = 'wobble 1s ease-in-out', 10);

    try {
        const response = await fetch(`${API_BASE}/rum`, { method: 'POST' });
        const data = await response.json();

        messageDiv.textContent = data.message;
        counterDiv.textContent = `The rum has been gone ${data.times_gone} time${data.times_gone !== 1 ? 's' : ''} this session`;
    } catch (error) {
        messageDiv.textContent = "Why is the rum always gone?";
        console.error('Rum error:', error);
    }
}

async function loadWisdom() {
    try {
        const response = await fetch(`${API_BASE}/wisdom`);
        const data = await response.json();

        const quoteEl = document.getElementById('wisdom-quote');
        quoteEl.textContent = `"${data.quote}" - ${data.speaker}`;
        setTimeout(() => quoteEl.classList.add('visible'), 500);
    } catch (error) {
        console.error('Wisdom loading error:', error);
    }
}
