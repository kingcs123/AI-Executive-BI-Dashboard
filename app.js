// MIS Executive BI Dashboard - Application Logic

// Register Chart.js DataLabels plugin
Chart.register(ChartDataLabels);

// Set default datalabels behavior to false to avoid cluttering charts that don't need them
Chart.defaults.set('plugins.datalabels', {
  display: false
});

// Application State
let allData = [];
let filteredData = [];
let activeTab = 'overview';
let activeCharts = {};


// Chronological months array for ordering
const MONTHS_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Attach Event Listeners
  initTabNavigation();
  initFilterControls();
  initSidebarToggle();

  // Load and Parse CSV Data
  loadDashboardData();
});

// CSV Parser (Handles quotes, commas, escapes)
function parseCSV(csvText) {
  const lines = [];
  let row = [""];
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

// Load Data from CSV file
function loadDashboardData() {
  fetch('AI Executive BI Dashboard-Data.csv')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(csvText => {
      const parsedLines = parseCSV(csvText);
      if (parsedLines.length < 2) {
        throw new Error('CSV is empty or malformed');
      }

      const headers = parsedLines[0].map(h => h.trim());

      // Map to structured JSON objects
      allData = parsedLines.slice(1).map((row, index) => {
        if (row.length < headers.length) return null;

        return {
          customerID: row[0],
          customerName: row[1],
          city: row[2],
          state: row[3],
          country: row[4],
          segment: row[5],
          joinDate: row[6],
          orderID: row[7],
          productID: row[9],
          orderDate: row[10],
          quantity: parseInt(row[11]) || 0,
          sales: parseFloat(row[12]) || 0,
          discount: parseFloat(row[13]) || 0,
          profit: parseFloat(row[14]) || 0,
          region: row[15],
          category: row[17],
          subCategory: row[18],
          productName: row[19],
          brand: row[20],
          cost: parseFloat(row[21]) || 0,
          sellingPrice: parseFloat(row[22]) || 0,
          employeeID: row[23],
          manager: row[24],
          department: row[25],
          month: row[27],
          salesTarget: parseFloat(row[28]) || 0,
          profitTarget: parseFloat(row[29]) || 0,
          returnID: row[30] || null,
          reason: row[32] || null,
          returnDate: row[33] || null
        };
      }).filter(Boolean);

      // Update UI with loading complete
      const dataBadge = document.getElementById('dataLoadedBadge');
      dataBadge.style.backgroundColor = 'var(--success-light)';
      dataBadge.style.color = 'var(--success-text)';
      dataBadge.innerHTML = `<i data-lucide="check-circle" style="width: 14px; height: 14px; margin-right: 0.25rem; vertical-align: middle;"></i> ${allData.length} Orders Loaded`;
      lucide.createIcons({ attrs: { class: 'lucide' } });

      // Set default date picker ranges based on dataset
      initDatePickerRanges();

      // Run Initial Filter and Update UI
      applyFilters();
    })
    .catch(error => {
      console.error('Error loading dataset:', error);
      const dataBadge = document.getElementById('dataLoadedBadge');
      dataBadge.style.backgroundColor = 'var(--danger-light)';
      dataBadge.style.color = 'var(--danger-text)';
      dataBadge.innerHTML = `<i data-lucide="alert-triangle" style="width: 14px; height: 14px; margin-right: 0.25rem; vertical-align: middle;"></i> Error Loading Data`;
      lucide.createIcons({ attrs: { class: 'lucide' } });
    });
}

// Set Min/Max dates on picker based on data
function initDatePickerRanges() {
  if (allData.length === 0) return;

  const dates = allData.map(d => new Date(d.orderDate)).filter(d => !isNaN(d));
  if (dates.length === 0) return;

  const minDate = new Date(Math.min.apply(null, dates));
  const maxDate = new Date(Math.max.apply(null, dates));

  const formatDate = (d) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const startInput = document.getElementById('filterStartDate');
  const endInput = document.getElementById('filterEndDate');

  startInput.min = formatDate(minDate);
  startInput.max = formatDate(maxDate);
  endInput.min = formatDate(minDate);
  endInput.max = formatDate(maxDate);

  // Set defaults
  startInput.value = formatDate(minDate);
  endInput.value = formatDate(maxDate);
}

// Navigation Tabs
function initTabNavigation() {
  const tabs = document.querySelectorAll('.nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      activeTab = tab.getAttribute('data-tab');

      // Update page headers
      const titleEl = document.getElementById('pageTitle');
      const subtitleEl = document.getElementById('pageSubtitle');

      if (activeTab === 'overview') {
        titleEl.textContent = 'Dashboard Overview';
        subtitleEl.textContent = 'Key Performance Indicators and High-level Summary';
      } else if (activeTab === 'financials') {
        titleEl.textContent = 'Financial & Sales Analysis';
        subtitleEl.textContent = 'Detailed sales target progress and profit margins';
      } else if (activeTab === 'products') {
        titleEl.textContent = 'Product Performance';
        subtitleEl.textContent = 'Sales, pricing, and volume trends by product category';
      } else if (activeTab === 'operations') {
        titleEl.textContent = 'Operations & Team Rankings';
        subtitleEl.textContent = 'Manager performance leaderboard and customer returns analysis';
      } else if (activeTab === 'customers') {
        titleEl.textContent = 'Customer Analytics & Loyalty';
        subtitleEl.textContent = 'Customer segment breakdown and account sales leaderboard';
      }

      // Show/hide tab panels
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${activeTab}`).classList.add('active');

      // Update tab-specific KPIs, insights, and re-render charts in the active tab
      updateKPIs();
      updateInsights();
      updateCharts();
    });
  });
}

// Sidebar toggle on mobile (safely bypassed in horizontal layout)
function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
  });

  // Close sidebar clicking outside
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
      sidebar.classList.remove('open');
    }
  });
}

// Filter Actions
function initFilterControls() {
  const filters = ['filterRegion', 'filterManager', 'filterSegment', 'filterCategory', 'filterStartDate', 'filterEndDate'];

  filters.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      applyFilters();
    });
  });

  // Reset Filters Button
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    document.getElementById('filterRegion').value = 'ALL';
    document.getElementById('filterManager').value = 'ALL';
    document.getElementById('filterSegment').value = 'ALL';
    document.getElementById('filterCategory').value = 'ALL';
    initDatePickerRanges();
    applyFilters();
  });

  // CSV Export Button
  document.getElementById('btnExportCSV').addEventListener('click', exportFilteredDataToCSV);
}

// Filter logic
function applyFilters() {
  const region = document.getElementById('filterRegion').value;
  const manager = document.getElementById('filterManager').value;
  const segment = document.getElementById('filterSegment').value;
  const category = document.getElementById('filterCategory').value;
  const startDateStr = document.getElementById('filterStartDate').value;
  const endDateStr = document.getElementById('filterEndDate').value;

  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;
  if (endDate) endDate.setHours(23, 59, 59, 999); // include entire end day

  filteredData = allData.filter(d => {
    if (region !== 'ALL' && d.region !== region) return false;
    if (manager !== 'ALL' && d.manager !== manager) return false;
    if (segment !== 'ALL' && d.segment !== segment) return false;
    if (category !== 'ALL' && d.category !== category) return false;

    if (startDate || endDate) {
      const orderDate = new Date(d.orderDate);
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > endDate) return false;
    }

    return true;
  });

  // Update UI Elements
  updateKPIs();
  updateCharts();
  updateInsights();
}



// Formatting Helper functions
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

// Abbreviate currency for charts data labels (e.g. $141,230 -> $141k)
function formatAbbreviated(value) {
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(1) + 'k';
  return value.toFixed(0);
}

function formatAbbreviatedCurrency(value) {
  const sign = value < 0 ? '-' : '';
  return sign + '$' + formatAbbreviated(Math.abs(value));
}

// KPI Dashboard Card Updater (Dynamic and tab-specific)
function updateKPIs() {
  const kpiGrid = document.getElementById('kpiGridContainer');
  if (!kpiGrid) return;

  if (filteredData.length === 0) {
    kpiGrid.innerHTML = `
      <div class="kpi-card"><div class="kpi-value">$0</div><div class="kpi-title">No Data Available</div></div>
      <div class="kpi-card"><div class="kpi-value">$0</div><div class="kpi-title">No Data Available</div></div>
      <div class="kpi-card"><div class="kpi-value">0%</div><div class="kpi-title">No Data Available</div></div>
      <div class="kpi-card"><div class="kpi-value">0.00%</div><div class="kpi-title">No Data Available</div></div>
    `;
    return;
  }

  // Base Aggregations
  const totalSales = filteredData.reduce((sum, d) => sum + d.sales, 0);
  const totalProfit = filteredData.reduce((sum, d) => sum + d.profit, 0);
  const totalSalesTarget = filteredData.reduce((sum, d) => sum + d.salesTarget, 0);
  const orderCount = filteredData.length;
  const totalQuantity = filteredData.reduce((sum, d) => sum + d.quantity, 0);
  const totalDiscount = filteredData.reduce((sum, d) => sum + d.discount, 0);
  const avgDiscount = orderCount > 0 ? (totalDiscount / orderCount) : 0;
  const cogs = filteredData.reduce((sum, d) => sum + (d.cost * d.quantity), 0);
  const returnOrders = filteredData.filter(d => d.returnID !== null);
  const returnCount = returnOrders.length;
  const returnRate = (returnCount / orderCount) * 100;
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const achievement = totalSalesTarget > 0 ? (totalSales / totalSalesTarget) * 100 : 0;

  // Segment, category, brand, manager calculations
  const categorySales = {};
  const managerSales = {};
  const customerSales = {};
  const citySales = {};
  const segmentSales = {};

  filteredData.forEach(d => {
    categorySales[d.category] = (categorySales[d.category] || 0) + d.sales;
    managerSales[d.manager] = (managerSales[d.manager] || 0) + d.sales;
    customerSales[d.customerName] = (customerSales[d.customerName] || 0) + d.sales;
    citySales[d.city] = (citySales[d.city] || 0) + d.sales;
    segmentSales[d.segment] = (segmentSales[d.segment] || 0) + d.sales;
  });

  const getTop = (obj) => {
    let topName = 'None';
    let topVal = 0;
    Object.entries(obj).forEach(([name, val]) => {
      if (val > topVal) { topVal = val; topName = name; }
    });
    return { name: topName, value: topVal };
  };

  const topCategory = getTop(categorySales);
  const topManager = getTop(managerSales);
  const topCustomer = getTop(customerSales);
  const topCity = getTop(citySales);
  const topSegment = getTop(segmentSales);
  const uniqueCustomers = new Set(filteredData.map(d => d.customerID)).size;

  const returnReasons = {};
  returnOrders.forEach(d => {
    const reason = d.reason || 'Not Specified';
    returnReasons[reason] = (returnReasons[reason] || 0) + 1;
  });
  const topReturnReason = getTop(returnReasons);

  // Render cards based on active tab
  let cardsHtml = '';

  if (activeTab === 'overview') {
    cardsHtml = `
      <!-- Revenue Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Total Revenue</span>
          <div class="kpi-icon-wrapper"><i data-lucide="dollar-sign"></i></div>
        </div>
        <div class="kpi-value">${formatCurrency(totalSales)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge ${achievement >= 100 ? 'positive' : 'negative'}">
            <i data-lucide="${achievement >= 100 ? 'trending-up' : 'trending-down'}" style="width: 12px; height: 12px;"></i>
            <span>${formatPercent(achievement)}</span>
          </span>
          <span style="color: var(--text-secondary);">vs target</span>
        </div>
      </div>
      
      <!-- Net Profit Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Net Profit</span>
          <div class="kpi-icon-wrapper success"><i data-lucide="briefcase"></i></div>
        </div>
        <div class="kpi-value">${formatCurrency(totalProfit)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge ${profitMargin >= 15 ? 'positive' : profitMargin >= 8 ? 'warning-badge' : 'negative'}" ${profitMargin >= 8 && profitMargin < 15 ? 'style="background-color: var(--warning-light); color: var(--warning-text);"' : ''}>
            <span>${formatPercent(profitMargin)}</span>
          </span>
          <span style="color: var(--text-secondary);">margin</span>
        </div>
      </div>
      
      <!-- Target Achievement Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Target Achievement</span>
          <div class="kpi-icon-wrapper warning"><i data-lucide="target"></i></div>
        </div>
        <div class="kpi-value">${formatPercent(achievement)}</div>
        <div class="kpi-subtext" style="flex-direction: column; align-items: flex-start; gap: 0.25rem; width: 100%;">
          <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.75rem; color: var(--text-secondary);">
            <span>Progress</span>
            <span>${formatCurrency(totalSales)} / ${formatCurrency(totalSalesTarget)}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar ${achievement >= 90 ? 'success' : achievement >= 50 ? 'warning' : ''}" style="width: ${Math.min(Math.max(achievement, 0), 100)}%"></div>
          </div>
        </div>
      </div>
      
      <!-- Return Rate Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Order Return Rate</span>
          <div class="kpi-icon-wrapper danger"><i data-lucide="refresh-ccw"></i></div>
        </div>
        <div class="kpi-value">${formatPercent(returnRate)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge negative">
            <span>${returnCount} returns</span>
          </span>
          <span style="color: var(--text-secondary);">of ${orderCount} total orders</span>
        </div>
      </div>
    `;
  } else if (activeTab === 'financials') {
    cardsHtml = `
      <!-- Revenue Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Total Revenue</span>
          <div class="kpi-icon-wrapper"><i data-lucide="dollar-sign"></i></div>
        </div>
        <div class="kpi-value">${formatCurrency(totalSales)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge ${achievement >= 100 ? 'positive' : 'negative'}">
            <i data-lucide="${achievement >= 100 ? 'trending-up' : 'trending-down'}" style="width: 12px; height: 12px;"></i>
            <span>${formatPercent(achievement)}</span>
          </span>
          <span style="color: var(--text-secondary);">sales goal rate</span>
        </div>
      </div>
      
      <!-- Target Goal Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Total Sales Target</span>
          <div class="kpi-icon-wrapper info"><i data-lucide="compass"></i></div>
        </div>
        <div class="kpi-value">${formatCurrency(totalSalesTarget)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge" style="background-color: var(--info-light); color: var(--info-text);">
            <span>Target Goal</span>
          </span>
          <span style="color: var(--text-secondary);">set quota</span>
        </div>
      </div>
      
      <!-- Target Variance Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Target Variance</span>
          <div class="kpi-icon-wrapper warning"><i data-lucide="sliders"></i></div>
        </div>
        <div class="kpi-value" style="color: ${totalSales >= totalSalesTarget ? 'var(--success-text)' : 'var(--danger-text)'}">
          ${totalSales >= totalSalesTarget ? '+' : ''}${formatCurrency(totalSales - totalSalesTarget)}
        </div>
        <div class="kpi-subtext">
          <span class="trend-badge ${totalSales >= totalSalesTarget ? 'positive' : 'negative'}">
            <span>${totalSales >= totalSalesTarget ? 'Surplus' : 'Deficit'}</span>
          </span>
          <span style="color: var(--text-secondary);">variance margin</span>
        </div>
      </div>
      
      <!-- AOV Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Average Order Value</span>
          <div class="kpi-icon-wrapper success"><i data-lucide="calculator"></i></div>
        </div>
        <div class="kpi-value">${formatCurrency(orderCount > 0 ? totalSales / orderCount : 0)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge positive">
            <span>AOV Metric</span>
          </span>
          <span style="color: var(--text-secondary);">from ${orderCount} invoices</span>
        </div>
      </div>
    `;
  } else if (activeTab === 'products') {
    cardsHtml = `
      <!-- Quantity Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Total Units Sold</span>
          <div class="kpi-icon-wrapper"><i data-lucide="layers"></i></div>
        </div>
        <div class="kpi-value">${totalQuantity.toLocaleString()}</div>
        <div class="kpi-subtext">
          <span class="trend-badge positive">
            <span>Units</span>
          </span>
          <span style="color: var(--text-secondary);">total products volume</span>
        </div>
      </div>
      
      <!-- Avg Discount Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Avg Discount Rate</span>
          <div class="kpi-icon-wrapper warning"><i data-lucide="percent"></i></div>
        </div>
        <div class="kpi-value">${formatPercent(avgDiscount * 100)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge" style="background-color: var(--warning-light); color: var(--warning-text);">
            <span>Discounting</span>
          </span>
          <span style="color: var(--text-secondary);">average order reduction</span>
        </div>
      </div>
      
      <!-- COGS Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Cost of Goods (COGS)</span>
          <div class="kpi-icon-wrapper danger"><i data-lucide="receipt"></i></div>
        </div>
        <div class="kpi-value">${formatCurrency(cogs)}</div>
        <div class="kpi-subtext">
          <span class="trend-badge negative">
            <span>Inventory Cost</span>
          </span>
          <span style="color: var(--text-secondary);">manufacturing cost base</span>
        </div>
      </div>
      
      <!-- Top Category Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Top Category</span>
          <div class="kpi-icon-wrapper success"><i data-lucide="tag"></i></div>
        </div>
        <div class="kpi-value" style="font-size: 1.5rem; padding: 0.2rem 0;">${topCategory.name}</div>
        <div class="kpi-subtext">
          <span class="trend-badge positive">
            <span>${formatCurrency(topCategory.value)}</span>
          </span>
          <span style="color: var(--text-secondary);">sales contribution</span>
        </div>
      </div>
    `;
  } else if (activeTab === 'operations') {
    cardsHtml = `
      <!-- Top Manager Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Top Manager</span>
          <div class="kpi-icon-wrapper success"><i data-lucide="award"></i></div>
        </div>
        <div class="kpi-value" style="font-size: 1.5rem; padding: 0.2rem 0;">${topManager.name}</div>
        <div class="kpi-subtext">
          <span class="trend-badge positive">
            <span>${formatCurrency(topManager.value)}</span>
          </span>
          <span style="color: var(--text-secondary);">total sales generation</span>
        </div>
      </div>
      
      <!-- Orders Managed Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Orders Processed</span>
          <div class="kpi-icon-wrapper info"><i data-lucide="hash"></i></div>
        </div>
        <div class="kpi-value">${orderCount}</div>
        <div class="kpi-subtext">
          <span class="trend-badge" style="background-color: var(--info-light); color: var(--info-text);">
            <span>Transactions</span>
          </span>
          <span style="color: var(--text-secondary);">total manager invoices</span>
        </div>
      </div>
      
      <!-- Returns Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Returned Orders</span>
          <div class="kpi-icon-wrapper danger"><i data-lucide="archive-restore"></i></div>
        </div>
        <div class="kpi-value">${returnCount}</div>
        <div class="kpi-subtext">
          <span class="trend-badge negative">
            <span>${formatPercent(returnRate)} rate</span>
          </span>
          <span style="color: var(--text-secondary);">customer returns logged</span>
        </div>
      </div>
      
      <!-- Return Reason Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Top Return Reason</span>
          <div class="kpi-icon-wrapper warning"><i data-lucide="help-circle"></i></div>
        </div>
        <div class="kpi-value" style="font-size: 1.3rem; padding: 0.35rem 0;" title="${topReturnReason.name}">${topReturnReason.name}</div>
        <div class="kpi-subtext">
          <span class="trend-badge" style="background-color: var(--warning-light); color: var(--warning-text);">
            <span>${topReturnReason.value} cases</span>
          </span>
          <span style="color: var(--text-secondary);">most frequent reason</span>
        </div>
      </div>
    `;
  } else if (activeTab === 'customers') {
    cardsHtml = `
      <!-- Customers Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Customer Accounts</span>
          <div class="kpi-icon-wrapper"><i data-lucide="users"></i></div>
        </div>
        <div class="kpi-value">${uniqueCustomers}</div>
        <div class="kpi-subtext">
          <span class="trend-badge positive">
            <span>Customer count</span>
          </span>
          <span style="color: var(--text-secondary);">unique client profiles</span>
        </div>
      </div>
      
      <!-- Top Customer Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Top Customer</span>
          <div class="kpi-icon-wrapper success"><i data-lucide="user-check"></i></div>
        </div>
        <div class="kpi-value" style="font-size: 1.4rem; padding: 0.25rem 0;" title="${topCustomer.name}">${topCustomer.name}</div>
        <div class="kpi-subtext">
          <span class="trend-badge positive">
            <span>${formatCurrency(topCustomer.value)} Spend</span>
          </span>
          <span style="color: var(--text-secondary);">highest customer account</span>
        </div>
      </div>
      
      <!-- Top City Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Top Customer City</span>
          <div class="kpi-icon-wrapper info"><i data-lucide="map-pin"></i></div>
        </div>
        <div class="kpi-value" style="font-size: 1.4rem; padding: 0.25rem 0;">${topCity.name}</div>
        <div class="kpi-subtext">
          <span class="trend-badge" style="background-color: var(--info-light); color: var(--info-text);">
            <span>${formatCurrency(topCity.value)}</span>
          </span>
          <span style="color: var(--text-secondary);">major sales city</span>
        </div>
      </div>
      
      <!-- Top Segment Card -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Top Segment</span>
          <div class="kpi-icon-wrapper warning"><i data-lucide="trending-up"></i></div>
        </div>
        <div class="kpi-value" style="font-size: 1.4rem; padding: 0.25rem 0;">${topSegment.name}</div>
        <div class="kpi-subtext">
          <span class="trend-badge" style="background-color: var(--warning-light); color: var(--warning-text);">
            <span>${formatCurrency(topSegment.value)}</span>
          </span>
          <span style="color: var(--text-secondary);">leading segment</span>
        </div>
      </div>
    `;
  }

  // Set inner HTML of grid container
  kpiGrid.innerHTML = cardsHtml;

  // Refresh icons inside new widgets
  lucide.createIcons({ attrs: { class: 'lucide' } });
}

// Chart Renderers (Destroy previous charts and build new ones based on active tab)
function updateCharts() {
  if (activeTab === 'overview') {
    renderMonthlyPerformanceChart();
    renderCategoryShareChart();
  } else if (activeTab === 'financials') {
    renderProfitMarginTrendChart();
    renderCostVsSellingPriceChart();
    renderDiscountImpactChart();
  } else if (activeTab === 'products') {
    renderSubCategoryChart();
    renderBrandPerformanceChart();
  } else if (activeTab === 'operations') {
    renderManagerPerformanceChart();
    renderReturnReasonsChart();
    renderRegionalAnalysisChart();
  } else if (activeTab === 'customers') {
    renderSegmentShareChart();
    renderTopCustomersChart();
  }
}

// Chart 1: Monthly Performance (Revenue, Profit, Target)
function renderMonthlyPerformanceChart() {
  const ctx = document.getElementById('chartMonthlyPerformance');
  if (!ctx) return;

  if (activeCharts.monthly) {
    activeCharts.monthly.destroy();
  }

  // Aggregate Monthly data
  const monthlyData = {};
  MONTHS_ORDER.forEach(m => {
    monthlyData[m] = { sales: 0, profit: 0, target: 0 };
  });

  filteredData.forEach(d => {
    if (monthlyData[d.month]) {
      monthlyData[d.month].sales += d.sales;
      monthlyData[d.month].profit += d.profit;
      monthlyData[d.month].target += d.salesTarget;
    }
  });

  const labels = MONTHS_ORDER;
  const salesData = labels.map(l => monthlyData[l].sales);
  const profitData = labels.map(l => monthlyData[l].profit);
  const targetData = labels.map(l => monthlyData[l].target);

  activeCharts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sales Revenue',
          data: salesData,
          backgroundColor: 'rgba(79, 70, 229, 0.75)',
          borderColor: 'rgba(79, 70, 229, 1)',
          borderWidth: 1,
          borderRadius: 4,
          order: 2,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#4f46e5',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        },
        {
          label: 'Sales Target',
          data: targetData,
          type: 'line',
          borderColor: 'rgba(245, 158, 11, 0.95)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          backgroundColor: 'transparent',
          order: 1,
          datalabels: { display: false }
        },
        {
          label: 'Net Profit',
          data: profitData,
          type: 'line',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2.5,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointRadius: 4,
          pointHoverRadius: 6,
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          fill: true,
          order: 0,
          datalabels: {
            display: true,
            anchor: 'center',
            align: 'top',
            color: '#047857',
            backgroundColor: '#ecfdf5',
            borderRadius: 3,
            borderWidth: 1,
            borderColor: '#a7f3d0',
            padding: 2,
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 10 },
            callback: function (value) { return formatCurrency(value); }
          }
        }
      }
    }
  });
}

// Chart 2: Category Share (Doughnut)
function renderCategoryShareChart() {
  const ctx = document.getElementById('chartCategoryShare');
  if (!ctx) return;

  if (activeCharts.category) {
    activeCharts.category.destroy();
  }

  const categorySales = {};
  filteredData.forEach(d => {
    categorySales[d.category] = (categorySales[d.category] || 0) + d.sales;
  });

  const labels = Object.keys(categorySales);
  const data = Object.values(categorySales);

  // Harmonious theme colors
  const backgroundColors = [
    'rgba(79, 70, 229, 0.8)',   // Electronics -> Indigo
    'rgba(245, 158, 11, 0.8)',  // Furniture -> Amber
    'rgba(16, 185, 129, 0.8)'   // Office Supplies -> Emerald
  ];

  activeCharts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          display: true,
          color: '#ffffff',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
          formatter: (value, ctx) => {
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
            return `${formatAbbreviatedCurrency(value)}\n(${percentage})`;
          },
          textAlign: 'center'
        }
      },
      cutout: '60%'
    }
  });
}

// Chart 3: Monthly Profit Margin Trend (Line)
function renderProfitMarginTrendChart() {
  const ctx = document.getElementById('chartProfitMarginTrend');
  if (!ctx) return;

  if (activeCharts.profitMargin) {
    activeCharts.profitMargin.destroy();
  }

  const monthlyData = {};
  MONTHS_ORDER.forEach(m => {
    monthlyData[m] = { sales: 0, profit: 0 };
  });

  filteredData.forEach(d => {
    if (monthlyData[d.month]) {
      monthlyData[d.month].sales += d.sales;
      monthlyData[d.month].profit += d.profit;
    }
  });

  const labels = MONTHS_ORDER;
  const marginData = labels.map(l => {
    const s = monthlyData[l].sales;
    const p = monthlyData[l].profit;
    return s > 0 ? (p / s) * 100 : 0;
  });

  activeCharts.profitMargin = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Profit Margin %',
        data: marginData,
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointRadius: 4,
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        fill: true,
        tension: 0.2,
        datalabels: {
          display: true,
          anchor: 'center',
          align: 'top',
          color: '#4338ca',
          backgroundColor: '#e0e7ff',
          borderRadius: 3,
          borderWidth: 1,
          borderColor: '#c7d2fe',
          padding: 2,
          font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
          formatter: (val) => val.toFixed(1) + '%'
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Margin: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 10 },
            callback: function (value) { return `${value}%`; }
          }
        }
      }
    }
  });
}

// Chart 4: Cost vs Selling Price (Bar)
function renderCostVsSellingPriceChart() {
  const ctx = document.getElementById('chartCostVsSellingPrice');
  if (!ctx) return;

  if (activeCharts.costVsPrice) {
    activeCharts.costVsPrice.destroy();
  }

  const categories = {};
  filteredData.forEach(d => {
    if (!categories[d.category]) {
      categories[d.category] = { cost: 0, sales: 0 };
    }
    categories[d.category].cost += d.cost * d.quantity;
    categories[d.category].sales += d.sales;
  });

  const labels = Object.keys(categories);
  const costData = labels.map(l => categories[l].cost);
  const salesData = labels.map(l => categories[l].sales);

  activeCharts.costVsPrice = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Cost of Goods (COGS)',
          data: costData,
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderRadius: 4,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#b91c1c',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        },
        {
          label: 'Total Net Revenue',
          data: salesData,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderRadius: 4,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#047857',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { callback: function (value) { return formatCurrency(value); } }
        }
      }
    }
  });
}

// Chart 5: Subcategory Performance Chart
function renderSubCategoryChart() {
  const ctx = document.getElementById('chartSubCategoryPerformance');
  if (!ctx) return;

  if (activeCharts.subcategory) {
    activeCharts.subcategory.destroy();
  }

  const subCats = {};
  filteredData.forEach(d => {
    if (!subCats[d.subCategory]) {
      subCats[d.subCategory] = { sales: 0, profit: 0 };
    }
    subCats[d.subCategory].sales += d.sales;
    subCats[d.subCategory].profit += d.profit;
  });

  const sortedSubCats = Object.entries(subCats)
    .sort((a, b) => b[1].sales - a[1].sales);

  const labels = sortedSubCats.map(entry => entry[0]);
  const salesData = sortedSubCats.map(entry => entry[1].sales);
  const profitData = sortedSubCats.map(entry => entry[1].profit);

  activeCharts.subcategory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenue Sales',
          data: salesData,
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
          borderRadius: 4,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#4f46e5',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        },
        {
          label: 'Net Profit',
          data: profitData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 4,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#047857',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { callback: function (value) { return formatCurrency(value); } }
        }
      }
    }
  });
}

// Chart 6: Manager Performance
function renderManagerPerformanceChart() {
  const ctx = document.getElementById('chartManagerPerformance');
  if (!ctx) return;

  if (activeCharts.manager) {
    activeCharts.manager.destroy();
  }

  const managers = {};
  filteredData.forEach(d => {
    if (!managers[d.manager]) {
      managers[d.manager] = { sales: 0, target: 0 };
    }
    managers[d.manager].sales += d.sales;
    managers[d.manager].target += d.salesTarget;
  });

  const labels = Object.keys(managers);
  const salesData = labels.map(l => managers[l].sales);
  const targetData = labels.map(l => managers[l].target);

  activeCharts.manager = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sales Revenue',
          data: salesData,
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderRadius: 4,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'right',
            color: '#4338ca',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        },
        {
          label: 'Target Set',
          data: targetData,
          backgroundColor: 'rgba(203, 213, 225, 0.8)',
          borderRadius: 4,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'right',
            color: '#475569',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.x)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { callback: function (value) { return formatCurrency(value); } }
        },
        y: { grid: { display: false } }
      }
    }
  });
}

// Chart 7: Return Reasons
function renderReturnReasonsChart() {
  const ctx = document.getElementById('chartReturnReasons');
  if (!ctx) return;

  if (activeCharts.returns) {
    activeCharts.returns.destroy();
  }

  const returnOrders = filteredData.filter(d => d.returnID !== null);
  const reasons = {};
  returnOrders.forEach(r => {
    const reason = r.reason || 'Not Specified';
    reasons[reason] = (reasons[reason] || 0) + 1;
  });

  const labels = Object.keys(reasons);
  const data = Object.values(reasons);

  activeCharts.returns = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Defective -> Red
          'rgba(245, 158, 11, 0.8)',  // Wrong Item -> Amber
          'rgba(59, 130, 246, 0.8)',  // Late Delivery -> Blue
          'rgba(107, 114, 128, 0.8)'  // Not as Described -> Grey
        ],
        borderWidth: 1,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
          }
        },
        datalabels: {
          display: true,
          color: '#ffffff',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
          formatter: (value, ctx) => {
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
            return `${value}\n(${percentage})`;
          },
          textAlign: 'center'
        }
      },
      cutout: '60%'
    }
  });
}

// Chart 8: Discount Impact (Grouped Bar with Dual-Axes) - Financials Tab [NEW]
function renderDiscountImpactChart() {
  const ctx = document.getElementById('chartDiscountImpact');
  if (!ctx) return;

  if (activeCharts.discountImpact) {
    activeCharts.discountImpact.destroy();
  }

  const subCats = {};
  filteredData.forEach(d => {
    if (!subCats[d.subCategory]) {
      subCats[d.subCategory] = { sales: 0, profit: 0, totalDiscount: 0, count: 0 };
    }
    subCats[d.subCategory].sales += d.sales;
    subCats[d.subCategory].profit += d.profit;
    subCats[d.subCategory].totalDiscount += d.discount;
    subCats[d.subCategory].count++;
  });

  const labels = Object.keys(subCats).sort((a, b) => subCats[b].sales - subCats[a].sales);
  const avgDiscountData = labels.map(l => (subCats[l].totalDiscount / subCats[l].count) * 100);
  const marginData = labels.map(l => subCats[l].sales > 0 ? (subCats[l].profit / subCats[l].sales) * 100 : 0);

  activeCharts.discountImpact = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Average Discount Rate (%)',
          data: avgDiscountData,
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'yDiscount',
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#b45309',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => val.toFixed(1) + '%'
          }
        },
        {
          label: 'Net Profit Margin (%)',
          data: marginData,
          backgroundColor: 'rgba(79, 70, 229, 0.75)',
          borderColor: 'rgba(79, 70, 229, 1)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'yMargin',
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#4338ca',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => val.toFixed(1) + '%'
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        }
      },
      scales: {
        x: { grid: { display: false } },
        yDiscount: {
          type: 'linear',
          position: 'left',
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: (val) => val.toFixed(0) + '%',
            font: { family: 'Plus Jakarta Sans', size: 9 }
          },
          title: { display: true, text: 'Avg Discount Rate (%)', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
        },
        yMargin: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          ticks: {
            callback: (val) => val.toFixed(0) + '%',
            font: { family: 'Plus Jakarta Sans', size: 9 }
          },
          title: { display: true, text: 'Net Profit Margin (%)', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
        }
      }
    }
  });
}

// Chart 9: Brand Performance (Grouped Bar & Line Dual-Axes) - Products Tab [NEW]
function renderBrandPerformanceChart() {
  const ctx = document.getElementById('chartBrandPerformance');
  if (!ctx) return;

  if (activeCharts.brand) {
    activeCharts.brand.destroy();
  }

  const brands = {};
  filteredData.forEach(d => {
    if (!brands[d.brand]) {
      brands[d.brand] = { sales: 0, profit: 0 };
    }
    brands[d.brand].sales += d.sales;
    brands[d.brand].profit += d.profit;
  });

  const labels = Object.keys(brands).sort((a, b) => brands[b].sales - brands[a].sales);
  const salesData = labels.map(l => brands[l].sales);
  const marginData = labels.map(l => brands[l].sales > 0 ? (brands[l].profit / brands[l].sales) * 100 : 0);

  activeCharts.brand = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenue Sales',
          data: salesData,
          backgroundColor: 'rgba(79, 70, 229, 0.75)',
          borderRadius: 4,
          yAxisID: 'ySales',
          order: 2,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#4f46e5',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        },
        {
          label: 'Profit Margin (%)',
          data: marginData,
          type: 'line',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2.5,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointRadius: 4,
          fill: false,
          yAxisID: 'yMargin',
          order: 1,
          datalabels: {
            display: true,
            anchor: 'center',
            align: 'top',
            color: '#047857',
            backgroundColor: '#ecfdf5',
            borderRadius: 3,
            borderWidth: 1,
            borderColor: '#a7f3d0',
            padding: 2,
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => val.toFixed(1) + '%'
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        }
      },
      scales: {
        x: { grid: { display: false } },
        ySales: {
          type: 'linear',
          position: 'left',
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: (val) => formatAbbreviatedCurrency(val),
            font: { family: 'Plus Jakarta Sans', size: 9 }
          },
          title: { display: true, text: 'Revenue Sales', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
        },
        yMargin: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          ticks: {
            callback: (val) => val.toFixed(0) + '%',
            font: { family: 'Plus Jakarta Sans', size: 9 }
          },
          title: { display: true, text: 'Profit Margin (%)', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
        }
      }
    }
  });
}

// Chart 10: Regional Sales vs Order Returns - Operations Tab [NEW]
function renderRegionalAnalysisChart() {
  const ctx = document.getElementById('chartRegionalAnalysis');
  if (!ctx) return;

  if (activeCharts.regional) {
    activeCharts.regional.destroy();
  }

  const regions = {
    'Central': { sales: 0, returns: 0, count: 0 },
    'East': { sales: 0, returns: 0, count: 0 },
    'South': { sales: 0, returns: 0, count: 0 },
    'West': { sales: 0, returns: 0, count: 0 }
  };

  filteredData.forEach(d => {
    if (regions[d.region]) {
      regions[d.region].sales += d.sales;
      regions[d.region].count++;
      if (d.returnID) {
        regions[d.region].returns++;
      }
    }
  });

  const labels = ['Central', 'East', 'South', 'West'];
  const salesData = labels.map(l => regions[l].sales);
  const returnsData = labels.map(l => regions[l].returns);
  const returnRateData = labels.map(l => regions[l].count > 0 ? (regions[l].returns / regions[l].count) * 100 : 0);

  activeCharts.regional = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Revenue Sales',
          data: salesData,
          backgroundColor: 'rgba(79, 70, 229, 0.75)',
          borderRadius: 4,
          yAxisID: 'ySales',
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#4f46e5',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (val) => formatAbbreviatedCurrency(val)
          }
        },
        {
          label: 'Total Returns Count',
          data: returnsData,
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderRadius: 4,
          yAxisID: 'yReturns',
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#b91c1c',
            font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
            formatter: (value, context) => {
              const regionName = labels[context.dataIndex];
              const rate = returnRateData[context.dataIndex];
              return `${value} (${rate.toFixed(1)}%)`;
            }
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        }
      },
      scales: {
        x: { grid: { display: false } },
        ySales: {
          type: 'linear',
          position: 'left',
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: (val) => formatAbbreviatedCurrency(val),
            font: { family: 'Plus Jakarta Sans', size: 9 }
          },
          title: { display: true, text: 'Sales Revenue', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
        },
        yReturns: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 9 }
          },
          title: { display: true, text: 'Returns Count', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
        }
      }
    }
  });
}

// Chart 11: Customer Segment Share (Doughnut) - Customers Tab [NEW]
function renderSegmentShareChart() {
  const ctx = document.getElementById('chartSegmentShare');
  if (!ctx) return;

  if (activeCharts.segment) {
    activeCharts.segment.destroy();
  }

  const segments = {};
  filteredData.forEach(d => {
    segments[d.segment] = (segments[d.segment] || 0) + d.sales;
  });

  const labels = Object.keys(segments);
  const data = Object.values(segments);

  activeCharts.segment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(79, 70, 229, 0.8)',   // Consumer -> Indigo
          'rgba(147, 51, 234, 0.8)',  // Corporate -> Purple
          'rgba(245, 158, 11, 0.8)'   // Home Office -> Amber
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          display: true,
          color: '#ffffff',
          font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' },
          formatter: (value, ctx) => {
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
            return `${formatAbbreviatedCurrency(value)}\n(${percentage})`;
          },
          textAlign: 'center'
        }
      },
      cutout: '60%'
    }
  });
}

// Chart 12: Top 10 Customers Leaderboard (Horizontal Bar) - Customers Tab [NEW]
function renderTopCustomersChart() {
  const ctx = document.getElementById('chartTopCustomers');
  if (!ctx) return;

  if (activeCharts.topCustomers) {
    activeCharts.topCustomers.destroy();
  }

  const customers = {};
  filteredData.forEach(d => {
    customers[d.customerName] = (customers[d.customerName] || 0) + d.sales;
  });

  // Sort descending and slice top 10
  const sortedCustomers = Object.entries(customers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = sortedCustomers.map(entry => entry[0]);
  const data = sortedCustomers.map(entry => entry[1]);

  activeCharts.topCustomers = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Revenue Spend',
        data: data,
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
        borderRadius: 4,
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'right',
          color: '#4338ca',
          font: { family: 'Plus Jakarta Sans', size: 9, weight: 'bold' },
          formatter: (val) => formatAbbreviatedCurrency(val)
        }
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Spent: ${formatCurrency(context.parsed.x)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { callback: function (value) { return formatCurrency(value); } }
        },
        y: { grid: { display: false } }
      }
    }
  });
}

// Dynamic AI Insights Generator
// Dynamic AI Insights Generator (Contextual tab-specific alerts)
function updateInsights() {
  const container = document.getElementById(`insightsList${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`);
  if (!container) return;

  if (filteredData.length === 0) {
    container.innerHTML = `
      <div class="insight-item info" style="grid-column: span 3;">
        <div class="insight-indicator"><i data-lucide="info"></i></div>
        <div class="insight-text">
          <h4>No data to analyze</h4>
          <p>Please adjust your global filters or search query to load transaction insights.</p>
        </div>
      </div>
    `;
    lucide.createIcons({ attrs: { class: 'lucide' } });
    return;
  }

  const insights = [];

  // Calculate base aggregate variables
  const totalSales = filteredData.reduce((sum, d) => sum + d.sales, 0);
  const totalProfit = filteredData.reduce((sum, d) => sum + d.profit, 0);
  const totalSalesTarget = filteredData.reduce((sum, d) => sum + d.salesTarget, 0);
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const orderCount = filteredData.length;
  const totalQuantity = filteredData.reduce((sum, d) => sum + d.quantity, 0);
  const totalDiscount = filteredData.reduce((sum, d) => sum + d.discount, 0);
  const avgDiscount = orderCount > 0 ? (totalDiscount / orderCount) : 0;
  const cogs = filteredData.reduce((sum, d) => sum + (d.cost * d.quantity), 0);
  const returnOrders = filteredData.filter(d => d.returnID !== null);
  const returnCount = returnOrders.length;
  const returnRate = (returnCount / orderCount) * 100;
  const achievement = totalSalesTarget > 0 ? (totalSales / totalSalesTarget) * 100 : 0;

  const getTop = (obj) => {
    let topName = 'None';
    let topVal = 0;
    Object.entries(obj).forEach(([name, val]) => {
      if (val > topVal) { topVal = val; topName = name; }
    });
    return { name: topName, value: topVal };
  };

  if (activeTab === 'overview') {
    // Profit Margin Health
    if (profitMargin < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Margin Profitability Alert',
        text: `The aggregate profit margin is currently low at <strong>${profitMargin.toFixed(1)}%</strong>. High discount rates or elevated inventory unit costs are squeezing profitability margins.`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Healthy Profit Margin Achieved',
        text: `Overall profit margin is robust at <strong>${profitMargin.toFixed(1)}%</strong> (Net Profit: ${formatCurrency(totalProfit)}). This suggests stable markups and controlled discounting.`
      });
    }

    // Sales Target achievement
    if (achievement >= 100) {
      insights.push({
        type: 'success',
        title: 'Sales Targets Met!',
        text: `Aggregate sales of <strong>${formatCurrency(totalSales)}</strong> have exceeded the sales target quota of <strong>${formatCurrency(totalSalesTarget)}</strong> by <strong>${formatPercent(achievement - 100)}</strong>.`
      });
    } else if (achievement >= 80) {
      insights.push({
        type: 'info',
        title: `Approaching Targets: ${achievement.toFixed(1)}%`,
        text: `Active filters reflect sales at <strong>${achievement.toFixed(1)}%</strong> of target. We need <strong>${formatCurrency(totalSalesTarget - totalSales)}</strong> in additional sales to achieve 100% quota.`
      });
    } else {
      insights.push({
        type: 'warning',
        title: `Sales Targets Gap: ${achievement.toFixed(1)}%`,
        text: `Currently performing behind targets with a sales gap of <strong>${formatCurrency(totalSalesTarget - totalSales)}</strong>. Strategic volume push or regional marketing is recommended.`
      });
    }

    // Operational returns check
    if (returnRate > 10) {
      insights.push({
        type: 'warning',
        title: `Elevated Operations Return Rate: ${returnRate.toFixed(1)}%`,
        text: `Order return rate is running high at <strong>${returnRate.toFixed(1)}%</strong> (${returnCount} returned orders). This drags down net profitability and increases reverse logistic costs.`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Outstanding Return Rate Control',
        text: `Return rate is well controlled at <strong>${returnRate.toFixed(1)}%</strong>, indicating high customer satisfaction and minimal delivery errors.`
      });
    }

  } else if (activeTab === 'financials') {
    // Target Variance Breakdown
    const variance = totalSales - totalSalesTarget;
    if (variance >= 0) {
      insights.push({
        type: 'success',
        title: `Positive Sales Variance: +${formatCurrency(variance)}`,
        text: `Aggregated sales exceed goals, yielding a surplus of <strong>${formatCurrency(variance)}</strong>. High performance channels are successfully compensating for minor drag sectors.`
      });
    } else {
      insights.push({
        type: 'warning',
        title: `Negative Sales Variance: ${formatCurrency(variance)}`,
        text: `The active filter sets reveal a sales gap of <strong>${formatCurrency(Math.abs(variance))}</strong> below target. Immediate alignment with local managers is required.`
      });
    }

    // Profit Margin and Cost Ratio
    const cogsPct = totalSales > 0 ? (cogs / totalSales) * 100 : 0;
    if (cogsPct > 70) {
      insights.push({
        type: 'warning',
        title: `Elevated Cost of Goods (COGS): ${cogsPct.toFixed(1)}%`,
        text: `Cost of goods represents <strong>${cogsPct.toFixed(1)}%</strong> of total sales revenue. Sourcing price inflation or low selling price marks are compressing margins.`
      });
    } else {
      insights.push({
        type: 'success',
        title: `Healthy Cost Ratio: ${cogsPct.toFixed(1)}%`,
        text: `Inventory unit costs represent only <strong>${cogsPct.toFixed(1)}%</strong> of revenue. Sourcing margins are well-optimized, contributing to stable profit conversion.`
      });
    }

    // Heavily Discounted Subcategories
    const subCategories = {};
    filteredData.forEach(d => {
      if (!subCategories[d.subCategory]) subCategories[d.subCategory] = { sales: 0, discount: 0, profit: 0, count: 0 };
      subCategories[d.subCategory].sales += d.sales;
      subCategories[d.subCategory].discount += d.discount;
      subCategories[d.subCategory].profit += d.profit;
      subCategories[d.subCategory].count++;
    });

    let topDiscountedSub = 'None';
    let maxAvgDisc = 0;
    Object.entries(subCategories).forEach(([name, data]) => {
      const avgD = data.count > 0 ? (data.discount / data.count) * 100 : 0;
      if (avgD > maxAvgDisc) {
        maxAvgDisc = avgD;
        topDiscountedSub = name;
      }
    });

    if (maxAvgDisc > 20) {
      insights.push({
        type: 'warning',
        title: `High Discount Rates: ${topDiscountedSub} (${maxAvgDisc.toFixed(1)}%)`,
        text: `The <strong>${topDiscountedSub}</strong> sub-category averages a high discount rate of <strong>${maxAvgDisc.toFixed(1)}%</strong>. Check if these heavy discounts are driving profitable volume or causing profit loss.`
      });
    } else {
      insights.push({
        type: 'info',
        title: 'Discount Policy Controlled',
        text: `Average discount rates across all product lines are controlled below <strong>20%</strong>, preserving markup integrity.`
      });
    }

  } else if (activeTab === 'products') {
    // Highest vs Lowest Performing categories
    const categoryProfits = {};
    filteredData.forEach(d => categoryProfits[d.category] = (categoryProfits[d.category] || 0) + d.profit);
    let topCat = 'None', topCatVal = -Infinity;
    let botCat = 'None', botCatVal = Infinity;
    Object.entries(categoryProfits).forEach(([name, val]) => {
      if (val > topCatVal) { topCatVal = val; topCat = name; }
      if (val < botCatVal) { botCatVal = val; botCat = name; }
    });

    insights.push({
      type: 'info',
      title: `Category Profits Leader: ${topCat}`,
      text: `The <strong>${topCat}</strong> category is the primary engine of net profit, contributing <strong>${formatCurrency(topCatVal)}</strong>. Conversely, <strong>${botCat}</strong> represents the lowest margin contributor at <strong>${formatCurrency(botCatVal)}</strong>.`
    });

    // Sub-category profit leaks
    const subProfits = {};
    filteredData.forEach(d => subProfits[d.subCategory] = (subProfits[d.subCategory] || 0) + d.profit);
    const leaking = Object.entries(subProfits).filter(([_, profit]) => profit < 0);
    if (leaking.length > 0) {
      const names = leaking.map(([name, profit]) => `<strong>${name}</strong> (${formatCurrency(profit)})`).join(', ');
      insights.push({
        type: 'warning',
        title: 'Product Line Profit Leaks',
        text: `Net losses detected in: ${names}. Check pricing structures, inventory write-offs, or clearance discounts.`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'All Product Lines Profitable',
        text: 'All product sub-categories are currently operating with positive net profits. No product drag is present.'
      });
    }

    // Brand leader margins
    const brandSales = {};
    const brandProfit = {};
    filteredData.forEach(d => {
      brandSales[d.brand] = (brandSales[d.brand] || 0) + d.sales;
      brandProfit[d.brand] = (brandProfit[d.brand] || 0) + d.profit;
    });
    let topBrand = 'None', topBrandSales = 0, topBrandMargin = 0;
    Object.entries(brandSales).forEach(([name, sales]) => {
      if (sales > topBrandSales) {
        topBrandSales = sales;
        topBrand = name;
        topBrandMargin = sales > 0 ? (brandProfit[name] / sales) * 100 : 0;
      }
    });

    insights.push({
      type: 'info',
      title: `Dominant Brand Partner: ${topBrand}`,
      text: `<strong>${topBrand}</strong> leads the brand segment with <strong>${formatCurrency(topBrandSales)}</strong> in revenue, converting into a net profit margin of <strong>${topBrandMargin.toFixed(1)}%</strong>.`
    });

  } else if (activeTab === 'operations') {
    // Manager target compliance leaderboard
    const managerAch = {};
    filteredData.forEach(d => {
      if (!managerAch[d.manager]) managerAch[d.manager] = { sales: 0, target: 0 };
      managerAch[d.manager].sales += d.sales;
      managerAch[d.manager].target += d.salesTarget;
    });

    const compliant = [];
    const lagging = [];
    Object.entries(managerAch).forEach(([name, data]) => {
      const ach = data.target > 0 ? (data.sales / data.target) * 100 : 0;
      if (ach >= 100) {
        compliant.push(`<strong>${name}</strong> (${ach.toFixed(0)}%)`);
      } else {
        lagging.push(`<strong>${name}</strong> (${ach.toFixed(0)}%)`);
      }
    });

    if (compliant.length > 0) {
      insights.push({
        type: 'success',
        title: 'Quota Compliant Managers',
        text: `The following managers have met or exceeded their sales target: ${compliant.join(', ')}.`
      });
    }
    if (lagging.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Managers Behind Targets Quota',
        text: `The following managers are currently performing lagging behind target quota: ${lagging.join(', ')}. Review regional pipelines.`
      });
    }

    // Returns reason analysis
    if (returnCount > 0) {
      const reasons = {};
      returnOrders.forEach(r => reasons[r.reason || 'Not Specified'] = (reasons[r.reason || 'Not Specified'] || 0) + 1);
      const topReason = getTop(reasons);

      insights.push({
        type: 'warning',
        title: `Primary Return Reason: ${topReason.name}`,
        text: `Of the ${returnCount} returns, the leading reason code is <strong>"${topReason.name}"</strong> with <strong>${topReason.value} cases</strong>. Quality control or transport delivery checks are recommended.`
      });
    }

    // High return region
    const regionalReturns = {};
    const regionalTotal = {};
    filteredData.forEach(d => {
      regionalTotal[d.region] = (regionalTotal[d.region] || 0) + 1;
      if (d.returnID !== null) regionalReturns[d.region] = (regionalReturns[d.region] || 0) + 1;
    });

    let topReturnReg = 'None';
    let maxReturnRegPct = 0;
    Object.entries(regionalReturns).forEach(([name, count]) => {
      const pct = (count / regionalTotal[name]) * 100;
      if (pct > maxReturnRegPct) {
        maxReturnRegPct = pct;
        topReturnReg = name;
      }
    });

    if (maxReturnRegPct > 0) {
      insights.push({
        type: 'info',
        title: `High-Risk Region: ${topReturnReg}`,
        text: `The <strong>${topReturnReg}</strong> region is exhibiting the highest return rate ratio, with <strong>${maxReturnRegPct.toFixed(1)}%</strong> of its orders returned.`
      });
    }

  } else if (activeTab === 'customers') {
    // Customer segment revenue distribution
    const segmentSales = {};
    filteredData.forEach(d => segmentSales[d.segment] = (segmentSales[d.segment] || 0) + d.sales);
    const topSeg = getTop(segmentSales);
    const topSegPct = totalSales > 0 ? (topSeg.value / totalSales) * 100 : 0;

    insights.push({
      type: 'info',
      title: `Dominant Segment: ${topSeg.name}`,
      text: `The <strong>${topSeg.name}</strong> customer segment commands the majority share, contributing <strong>${formatCurrency(topSeg.value)}</strong> or <strong>${topSegPct.toFixed(1)}%</strong> of total revenues.`
    });

    // Top Customer Spending account
    const custSales = {};
    filteredData.forEach(d => custSales[d.customerName] = (custSales[d.customerName] || 0) + d.sales);
    const topCust = getTop(custSales);

    insights.push({
      type: 'success',
      title: `Top Customer Account: ${topCust.name}`,
      text: `Account <strong>${topCust.name}</strong> generated the highest order contribution, spending an aggregated <strong>${formatCurrency(topCust.value)}</strong> in active transactions.`
    });

    // Geographic customer clusters
    const citySales = {};
    filteredData.forEach(d => citySales[d.city] = (citySales[d.city] || 0) + d.sales);
    const topC = getTop(citySales);

    insights.push({
      type: 'info',
      title: `Highest Performing City: ${topC.name}`,
      text: `Customer purchasing is densest in the city of <strong>${topC.name}</strong>, yielding a total sales volume of <strong>${formatCurrency(topC.value)}</strong>.`
    });
  }

  // Render insights list HTML
  container.innerHTML = insights.map(ins => {
    const icon = ins.type === 'success' ? 'check-circle' : ins.type === 'warning' ? 'alert-triangle' : 'info';
    return `
      <div class="insight-item ${ins.type}">
        <div class="insight-indicator"><i data-lucide="${icon}"></i></div>
        <div class="insight-text">
          <h4>${ins.title}</h4>
          <p>${ins.text}</p>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons({ attrs: { class: 'lucide' } });
}



// Export active filtered data to CSV file
function exportFilteredDataToCSV() {
  if (filteredData.length === 0) {
    alert("No data available to export.");
    return;
  }

  const csvHeaders = [
    'OrderID', 'OrderDate', 'CustomerID', 'CustomerName', 'Segment', 'City', 'State', 'Region',
    'ProductID', 'ProductName', 'Category', 'SubCategory', 'Brand', 'Quantity', 'Sales', 'Cost', 'Profit',
    'Manager', 'SalesTarget', 'ProfitTarget', 'ReturnID', 'Reason', 'ReturnDate'
  ];

  const csvRows = [
    csvHeaders.join(','),
    ...filteredData.map(d => {
      return [
        d.orderID,
        d.orderDate,
        d.customerID,
        `"${d.customerName.replace(/"/g, '""')}"`,
        d.segment,
        `"${d.city.replace(/"/g, '""')}"`,
        d.state,
        d.region,
        d.productID,
        `"${d.productName.replace(/"/g, '""')}"`,
        d.category,
        d.subCategory,
        d.brand,
        d.quantity,
        d.sales,
        d.cost,
        d.profit,
        `"${d.manager.replace(/"/g, '""')}"`,
        d.salesTarget,
        d.profitTarget,
        d.returnID || '',
        d.reason ? `"${d.reason.replace(/"/g, '""')}"` : '',
        d.returnDate || ''
      ].join(',');
    })
  ];

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");

  const region = document.getElementById('filterRegion').value;
  const manager = document.getElementById('filterManager').value;
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `BI_Dashboard_Export_R_${region}_M_${manager.replace(/\s+/g, '_')}_${dateStr}.csv`;

  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
