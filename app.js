let allAlerts = [];
let allTopIssues = [];

Promise.all([
    fetch('data/alertas.json').then(response => response.json()),
    fetch('data/problemas_principales_por_ciudad.json').then(response => response.json())
]).then(([alertsData, topIssuesData]) => {
    allAlerts = alertsData;
    allTopIssues = topIssuesData;
    populateFilters(allAlerts);
    addEventListeners();
    filterData(); 
}).catch(error => {
    console.error("Error al cargar los datos iniciales:", error);
});

function populateFilters(data) {
    const cities = [...new Set(data.map(d => d.Ciudad))].sort();
    const categories = [...new Set(data.map(d => d.Categoría))].sort();

    const citySel = document.getElementById('cityFilter');
    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySel.appendChild(opt);
    });

    const catSel = document.getElementById('categoryFilter');
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSel.appendChild(opt);
    });
}

function addEventListeners() {
    // Listeners para los filtros principales
    document.getElementById('cityFilter').addEventListener('change', filterData);
    document.getElementById('categoryFilter').addEventListener('change', filterData);
    document.getElementById('top10Filter').addEventListener('change', filterData);
    
    const riskFilter = document.getElementById('riskFilter');
    const riskValueSpan = document.getElementById('riskValue');
    riskFilter.addEventListener('input', () => {
        riskValueSpan.textContent = riskFilter.value;
        filterData();
    });

    // Listener para el nuevo filtro de urgencia
    document.getElementById('urgencyFilter').addEventListener('change', filterData);
}

function filterData() {
    // --- Leer valores de todos los filtros ---
    const city = document.getElementById('cityFilter').value;
    const category = document.getElementById('categoryFilter').value;
    const minRisk = parseFloat(document.getElementById('riskFilter').value);
    const isTop10 = document.getElementById('top10Filter').checked;
    const urgencyLevel = document.getElementById('urgencyFilter').value;

    // --- 1. Filtrar las alertas principales ---
    let filteredAlerts = allAlerts.filter(alert => {
        const alertRisk = alert.Prob_Crisis_30d * 100;
        return (!city || alert.Ciudad === city) &&
            (!category || alert.Categoría === category) &&
            (alertRisk >= minRisk);
    });

    filteredAlerts.sort((a, b) => b.Prob_Crisis_30d - a.Prob_Crisis_30d);

    if (isTop10) {
        filteredAlerts = filteredAlerts.slice(0, 10);
    }

    renderAlerts(filteredAlerts);
    const chartData = filteredAlerts.slice(0, 20);
    renderChart(chartData);

    // --- 2. Filtrar los problemas más graves por ciudad ---
    let filteredTopIssues = allTopIssues.filter(issue => {
        const urgencyMatch = !urgencyLevel || issue['Nivel de Urgencia'].toString() === urgencyLevel;
        return (!city || issue.Ciudad === city) &&
            (!category || issue.Categoría === category) &&
            urgencyMatch;
    });

    renderTopIssues(filteredTopIssues);
}

function renderAlerts(alerts) {
    const container = document.getElementById('alerts-container');
    if (alerts.length === 0) {
        container.innerHTML = `<p style="text-align: center; grid-column: 1 / -1; font-size: 1.2rem; color: #5a6c7d;">No se encontraron alertas con los filtros seleccionados.</p>`;
        return;
    }
    container.innerHTML = alerts.map(a => `
        <div class="alert-card">
            <div class="alert-header">
                <span class="city">${a.Ciudad}</span>
                <span class="category">${a.Categoría}</span>
                <span class="prob">${(a.Prob_Crisis_30d * 100).toFixed(1)}% riesgo</span>
            </div>
            <div><strong>Comentario:</strong> "${a.Comentario}"</div>
            <div class="recommendation"><strong>Acción recomendada:</strong> ${a.Recomendación}</div>
        </div>
    `).join('');
}

function renderChart(alerts) {
    const isTop10 = document.getElementById('top10Filter').checked;
    
    const data = [{
        x: alerts.map(a => `${a.Ciudad} - ${a.Categoría}`),
        y: alerts.map(a => a.Prob_Crisis_30d * 100),
        type: 'bar',
        marker: {
            color: alerts.map((a, i) => {
                const colors = ['#e74c3c', '#e67e22', '#f39c12', '#f1c40f', '#3498db', '#9b59b6', '#2ecc71'];
                return colors[i % colors.length];
            })
        }
    }];

    const layout = {
        title: {
            text: isTop10 ? 'Top 10: Riesgo de Crisis (Según Filtros)' : 'Alertas con Mayor Riesgo (Máx. 20)',
            font: { size: 18, color: '#2c3e50', family: 'Inter' }
        },
        xaxis: {
            title: 'Ciudad - Categoría',
            tickangle: -45,
            tickfont: { size: 11 }
        },
        yaxis: {
            title: 'Probabilidad (%)',
            range: [0, 100]
        },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: 'rgba(255,255,255,0)',
        margin: { b: 150, t: 60 }
    };

    Plotly.newPlot('chart', data, layout, { responsive: true });
}

function renderTopIssues(issues) {
    const container = document.getElementById('top-issues');
    if (!container) return;
    
    if (issues.length === 0) {
        container.innerHTML = `<p style="text-align: center; grid-column: 1 / -1; font-size: 1.2rem; color: #5a6c7d;">No se encontraron problemas principales con los filtros seleccionados.</p>`;
        return;
    }

    container.innerHTML = issues.map(city => `
        <div class="city-issue">
            <h3>${city.Ciudad}</h3>
            <p><strong>Categoría:</strong> ${city.Categoría}</p>
            <p><strong>Urgencia:</strong> ${city['Nivel de Urgencia']}/4</p>
            <p><strong>Comentario:</strong> "${city.Comentario}"</p>
            <p class="recommendation"><strong>Acción:</strong> ${city.Recomendación}</p>
        </div>
    `).join('');
}