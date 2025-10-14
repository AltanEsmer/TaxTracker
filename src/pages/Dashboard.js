import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  DatePicker, 
  Typography, 
  Spin, 
  Alert,
  Select,
  Tabs,
  Tag
} from 'antd';
import { 
  DollarOutlined, 
  FileOutlined, 
  PercentageOutlined,
  RiseOutlined,
  FallOutlined,
  SwapOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const { RangePicker } = DatePicker;
const { Title: TitleText } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [activeType, setActiveType] = useState('Tümü'); // 'Tümü', 'Alış', 'Satış'

  useEffect(() => {
    if (!window.api) {
      setError('Uygulama başlatılamadı: window.api bulunamadı. Lütfen uygulamayı masaüstü kısayolundan başlatın veya destek alın.');
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [dateRange, activeType]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const filters = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };
      
      console.log('Fetching dashboard data with filters:', filters);
      const data = await window.api.getDashboardData(filters);
      
      console.log('Dashboard data received:', data);
      
      // Validate data structure
      if (!data) {
        throw new Error('No data received from API');
      }
      
      // Ensure all required arrays exist
      const validatedData = {
        vatByMonth: data.vatByMonth || [],
        currencyDistribution: data.currencyDistribution || [],
        monthlyTotals: data.monthlyTotals || [],
        rawInvoices: data.rawInvoices || [] // Added rawInvoices for new calculation logic
      };
      
      console.log('Validated dashboard data:', validatedData);
      setDashboardData(validatedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Veri yüklenirken bir hata oluştu: ' + err.message);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  // Prepare chart data
  const prepareVatByMonthChart = (type) => {
    if (!dashboardData || !dashboardData.vatByMonth || dashboardData.vatByMonth.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    let data = dashboardData.vatByMonth;
    if (type !== 'Tümü') {
      data = data.filter(item => (item.invoice_type || 'Alış') === type);
    }
    
    console.log('VAT chart data for type:', type, 'records:', data.length);
    
    // If no data after filtering, return empty chart
    if (data.length === 0) {
      return {
        labels: ['Veri Yok'],
        datasets: [{
          label: 'KDV',
          data: [0],
          backgroundColor: 'rgba(200, 200, 200, 0.6)'
        }]
      };
    }
    
    // Group by month and invoice type
    const monthGroups = data.reduce((acc, item) => {
      if (!acc[item.month]) {
        acc[item.month] = [];
      }
      acc[item.month].push(item);
      return acc;
    }, {});

    const labels = Object.keys(monthGroups).sort();
    
    // Create datasets for each currency and invoice type
    const datasets = [];
    
    // Get unique combinations of currency and invoice type
    const currencyTypeSet = new Set();
    data.forEach(item => {
      currencyTypeSet.add(`${item.currency}-${item.invoice_type || 'Alış'}`);
    });
    
    const currencyTypes = Array.from(currencyTypeSet);
    
    currencyTypes.forEach((currencyType, index) => {
      const [currency, type] = currencyType.split('-');
      
      // Choose color based on invoice type and currency
      let backgroundColor;
      if (type === 'Alış') {
        backgroundColor = currency === 'TRY' ? 'rgba(54, 162, 235, 0.6)' : 
                          currency === 'USD' ? 'rgba(75, 192, 192, 0.6)' : 
                          'rgba(153, 102, 255, 0.6)';
      } else {
        backgroundColor = currency === 'TRY' ? 'rgba(255, 99, 132, 0.6)' : 
                          currency === 'USD' ? 'rgba(255, 206, 86, 0.6)' : 
                          'rgba(255, 159, 64, 0.6)';
      }
      
      datasets.push({
        label: `KDV (${currency} - ${type})`,
        data: labels.map(month => {
          const items = monthGroups[month].filter(item => 
            item.currency === currency && (item.invoice_type || 'Alış') === type
          );
          return items.length > 0 ? items[0].vat_amount : 0;
        }),
        backgroundColor
      });
    });

    return {
      labels,
      datasets
    };
  };

  const prepareCurrencyDistributionChart = (type) => {
    if (!dashboardData || !dashboardData.currencyDistribution || dashboardData.currencyDistribution.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    let data = dashboardData.currencyDistribution;
    if (type !== 'Tümü') {
      data = data.filter(item => (item.invoice_type || 'Alış') === type);
    }
    
    // If no data after filtering, return empty chart
    if (data.length === 0) {
      return {
        labels: ['Veri Yok'],
        datasets: [{
          label: 'Dağılım',
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.6)'],
          borderColor: ['rgba(200, 200, 200, 1)']
        }]
      };
    }
    
    // Group by invoice type
    const typeGroups = data.reduce((acc, item) => {
      const type = item.invoice_type || 'Alış';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});

    const datasets = [];
    
    // Process each invoice type
    Object.entries(typeGroups).forEach(([type, items]) => {
      const backgroundColor = type === 'Alış' ? 
        ['rgba(54, 162, 235, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)'] :
        ['rgba(255, 99, 132, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(255, 159, 64, 0.6)'];
      
      const borderColor = type === 'Alış' ?
        ['rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)'] :
        ['rgba(255, 99, 132, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 159, 64, 1)'];
      
      datasets.push({
        label: type,
        data: items.map(item => item.count),
        backgroundColor,
        borderColor,
        borderWidth: 1,
      });
    });

    // Get all unique currencies
    const labels = [...new Set(data.map(item => item.currency))];

    return {
      labels,
      datasets
    };
  };

  const prepareMonthlyTotalsChart = (type) => {
    if (!dashboardData || !dashboardData.monthlyTotals || dashboardData.monthlyTotals.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    let data = dashboardData.monthlyTotals;
    if (type !== 'Tümü') {
      data = data.filter(item => (item.invoice_type || 'Alış') === type);
    }
    
    // If no data after filtering, return empty chart
    if (data.length === 0) {
      return {
        labels: ['Veri Yok'],
        datasets: [{
          label: 'Toplam',
          data: [0],
          borderColor: 'rgba(200, 200, 200, 1)',
          backgroundColor: 'rgba(200, 200, 200, 0.2)',
          tension: 0.4,
        }]
      };
    }
    
    // Group by invoice type
    const typeGroups = data.reduce((acc, item) => {
      const type = item.invoice_type || 'Alış';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});

    // Get all unique months
    const allMonths = [...new Set(data.map(item => item.month))].sort();

    const datasets = [];
    
    // Create dataset for each invoice type
    Object.entries(typeGroups).forEach(([type, items]) => {
      const color = type === 'Alış' ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
      const backgroundColor = type === 'Alış' ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)';
      
      // Create a map of month to amount for this type
      const monthToAmount = items.reduce((acc, item) => {
        acc[item.month] = item.total_amount;
        return acc;
      }, {});
      
      datasets.push({
        label: `${type} Toplam`,
        data: allMonths.map(month => monthToAmount[month] || 0),
        borderColor: color,
        backgroundColor: backgroundColor,
        tension: 0.4,
      });
    });

    return {
      labels: allMonths,
      datasets
    };
  };

  // Calculate summary statistics
  // These functions now match the Faturalar page logic: they sum over the filtered data for the selected date range and type.
  const calculateTotalVat = (type = null) => {
    if (!dashboardData || !dashboardData.rawInvoices) return '0.00';
    let filteredData = dashboardData.rawInvoices;
    if (type) {
      filteredData = filteredData.filter(item => (item.invoice_type || 'Alış') === type);
    }
    // Log for verification
    console.log('Dashboard KDV calculation, type:', type, 'records:', filteredData.length);
    const total = filteredData.reduce((sum, item) => {
      const vatAmount = Number(item.try_equivalent?.vat_amount || item.vat_amount) || 0;
      return sum + vatAmount;
    }, 0);
    return (typeof total === 'number' ? total.toFixed(2) : '0.00');
  };

  const calculateTotalInvoices = (type = null) => {
    if (!dashboardData || !dashboardData.rawInvoices) return 0;
    let filteredData = dashboardData.rawInvoices;
    if (type) {
      filteredData = filteredData.filter(item => (item.invoice_type || 'Alış') === type);
    }
    // Log for verification
    console.log('Dashboard Fatura Sayısı calculation, type:', type, 'records:', filteredData.length);
    return filteredData.reduce((sum, item) => {
      const count = Number(item.try_equivalent?.count || item.count) || 0;
      return sum + count;
    }, 0);
  };

  const calculateTotalAmount = (type = null) => {
    if (!dashboardData || !dashboardData.rawInvoices) return '0.00';
    let filteredData = dashboardData.rawInvoices;
    if (type) {
      filteredData = filteredData.filter(item => (item.invoice_type || 'Alış') === type);
    }
    // Log for verification
    console.log('Dashboard Toplam Tutar calculation, type:', type, 'records:', filteredData.length);
    const total = filteredData.reduce((sum, item) => {
      const amount = Number(item.try_equivalent?.total || item.total) || 0;
      return sum + amount;
    }, 0);
    return (typeof total === 'number' ? total.toFixed(2) : '0.00');
  };

  // Calculate profit/loss (Sales - Purchases)
  const calculateProfitLoss = () => {
    if (!dashboardData || !dashboardData.rawInvoices) return 0;
    
    const salesTotal = dashboardData.rawInvoices
      .filter(inv => inv.invoice_type === 'Satış')
      .reduce((sum, inv) => {
        if (inv.try_equivalent && inv.try_equivalent.total) {
          return sum + Number(inv.try_equivalent.total);
        } else if (inv.currency === 'TRY') {
          return sum + Number(inv.total || 0);
        }
        return sum;
      }, 0);
    
    const purchasesTotal = dashboardData.rawInvoices
      .filter(inv => inv.invoice_type === 'Alış')
      .reduce((sum, inv) => {
        if (inv.try_equivalent && inv.try_equivalent.total) {
          return sum + Number(inv.try_equivalent.total);
        } else if (inv.currency === 'TRY') {
          return sum + Number(inv.total || 0);
        }
        return sum;
      }, 0);
    
    return salesTotal - purchasesTotal;
  };

  // Get top companies by total amount
  const getTopCompanies = (limit = 5) => {
    if (!dashboardData || !dashboardData.rawInvoices) return [];
    
    const companyTotals = {};
    
    dashboardData.rawInvoices.forEach(inv => {
      if (!companyTotals[inv.company]) {
        companyTotals[inv.company] = 0;
      }
      
      if (inv.try_equivalent && inv.try_equivalent.total) {
        companyTotals[inv.company] += Number(inv.try_equivalent.total);
      } else if (inv.currency === 'TRY') {
        companyTotals[inv.company] += Number(inv.total || 0);
      }
    });
    
    return Object.entries(companyTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  };

  // Get currency breakdown
  const getCurrencyBreakdown = () => {
    if (!dashboardData || !dashboardData.rawInvoices) return [];
    
    const currencyStats = {};
    
    dashboardData.rawInvoices.forEach(inv => {
      if (!currencyStats[inv.currency]) {
        currencyStats[inv.currency] = { count: 0, total: 0 };
      }
      
      currencyStats[inv.currency].count += 1;
      
      if (inv.try_equivalent && inv.try_equivalent.total) {
        currencyStats[inv.currency].total += Number(inv.try_equivalent.total);
      } else if (inv.currency === 'TRY') {
        currencyStats[inv.currency].total += Number(inv.total || 0);
      }
    });
    
    return Object.entries(currencyStats)
      .map(([currency, stats]) => ({ currency, ...stats }))
      .sort((a, b) => b.total - a.total);
  };

  // Helper to render summary and charts for a given type
  function renderSummaryAndCharts(type) {
    const totals = calculateTotalsForDashboard(type);
    const profitLoss = calculateProfitLoss();
    const topCompanies = getTopCompanies(5);
    const currencyBreakdown = getCurrencyBreakdown();
    
    return (
      <>
        <Row gutter={16}>
          <Col span={6}>
            <Card className="dashboard-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <Statistic
                title={<span style={{ color: 'white' }}>{type === 'Tümü' ? 'Toplam KDV' : `${type} KDV`}</span>}
                value={totals.vatAmount}
                suffix="TL"
                precision={2}
                valueStyle={{ color: 'white' }}
                prefix={<PercentageOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="dashboard-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <Statistic
                title={<span style={{ color: 'white' }}>{type === 'Tümü' ? 'Fatura Sayısı' : `${type} Fatura Sayısı`}</span>}
                value={totals.count}
                prefix={<FileOutlined />}
                valueStyle={{ color: 'white' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="dashboard-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <Statistic
                title={<span style={{ color: 'white' }}>{type === 'Tümü' ? 'Toplam Tutar' : `${type} Toplam Tutar`}</span>}
                value={totals.total}
                prefix={<DollarOutlined />}
                suffix="TL"
                precision={2}
                valueStyle={{ color: 'white' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="dashboard-card" style={{ 
              background: profitLoss >= 0 ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 
              color: 'white' 
            }}>
              <Statistic
                title={<span style={{ color: 'white' }}>Kar/Zarar (Satış - Alış)</span>}
                value={Math.abs(profitLoss)}
                prefix={profitLoss >= 0 ? <RiseOutlined /> : <FallOutlined />}
                suffix="TL"
                precision={2}
                valueStyle={{ color: 'white' }}
              />
            </Card>
          </Col>
        </Row>
        
        {type === 'Tümü' && (
          <>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card title={<><TrophyOutlined /> En Yüksek 5 Şirket (Tutara Göre)</>}>
                  {topCompanies.length > 0 ? (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {topCompanies.map((company, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '8px 0', 
                          borderBottom: index < topCompanies.length - 1 ? '1px solid #f0f0f0' : 'none' 
                        }}>
                          <span><strong>{index + 1}.</strong> {company.name}</span>
                          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{company.total.toFixed(2)} TL</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Veri yok</div>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title={<><SwapOutlined /> Para Birimi Dağılımı (Fatura Sayısı)</>}>
                  {currencyBreakdown.length > 0 ? (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {currencyBreakdown.map((item, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '8px 0', 
                          borderBottom: index < currencyBreakdown.length - 1 ? '1px solid #f0f0f0' : 'none' 
                        }}>
                          <span><strong>{item.currency}</strong></span>
                          <div>
                            <Tag color={item.currency === 'TRY' ? 'blue' : item.currency === 'USD' ? 'green' : 'orange'}>
                              {item.count} adet
                            </Tag>
                            <span style={{ marginLeft: '8px', color: '#666' }}>{item.total.toFixed(2)} TL</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Veri yok</div>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
        
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Aylık KDV" className="chart-container">
              <div style={{ height: '400px' }}>
                <Bar data={prepareVatByMonthChart(type)} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value.toLocaleString('tr-TR') + ' TL';
                        }
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        boxWidth: 12,
                        padding: 15
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${context.raw.toLocaleString('tr-TR')} TL`;
                        }
                      }
                    }
                  }
                }} />
              </div>
            </Card>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="Para Birimi Dağılımı" className="chart-container">
              <div style={{ height: '350px' }}>
                <Pie data={prepareCurrencyDistributionChart(type)} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        padding: 20
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${context.raw} adet`;
                        }
                      }
                    }
                  }
                }} />
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Aylık Toplam" className="chart-container">
              <div style={{ height: '350px' }}>
                <Line data={prepareMonthlyTotalsChart(type)} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value.toLocaleString('tr-TR') + ' TL';
                        }
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${context.raw.toLocaleString('tr-TR')} TL`;
                        }
                      }
                    }
                  }
                }} />
              </div>
            </Card>
          </Col>
        </Row>
      </>
    );
  }

  // Calculation logic matching Faturalar page
  function calculateTotalsForDashboard(type) {
    if (!dashboardData || !dashboardData.rawInvoices) return { subtotal: 0, vatAmount: 0, total: 0, count: 0 };
    let filtered = dashboardData.rawInvoices;
    if (type && type !== 'Tümü') {
      filtered = filtered.filter(inv => (inv.invoice_type || 'Alış') === type);
    }
    let subtotalSum = 0, vatAmountSum = 0, totalSum = 0, count = 0;
    filtered.forEach(inv => {
      if (inv.try_equivalent && inv.try_equivalent.total) {
        subtotalSum += Number(inv.try_equivalent.subtotal) || 0;
        vatAmountSum += Number(inv.try_equivalent.vat_amount) || 0;
        totalSum += Number(inv.try_equivalent.total) || 0;
      } else if (inv.currency === 'TRY') {
        const subtotal = Number(inv.subtotal) || 0;
        const vatRate = Number(inv.vat_rate) || 0;
        const vatAmount = subtotal * (vatRate / 100);
        subtotalSum += subtotal;
        vatAmountSum += vatAmount;
        totalSum += Number(inv.total || 0);
      }
      count++;
    });
    return {
      subtotal: subtotalSum,
      vatAmount: vatAmountSum,
      total: totalSum,
      count
    };
  }

  if (loading) {
    return <Spin size="large" tip="Yükleniyor..." />;
  }

  if (error) {
    return <Alert message="Hata" description={error} type="error" showIcon />;
  }

  return (
    <div>
      <Row gutter={[16, 16]} align="middle" className="page-header">
        <Col span={18}>
          <TitleText level={2}>Dashboard</TitleText>
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="DD/MM/YYYY"
            className="date-range-picker"
          />
        </Col>
      </Row>

      <Tabs 
        defaultActiveKey="all" 
        activeKey={activeType === 'Tümü' ? 'all' : activeType === 'Alış' ? 'buying' : 'selling'}
        onChange={key => {
          console.log('Tab changed to:', key);
          if (key === 'all') setActiveType('Tümü');
          else if (key === 'buying') setActiveType('Alış');
          else if (key === 'selling') setActiveType('Satış');
        }}
      >
        <TabPane tab="Tümü" key="all">
          {renderSummaryAndCharts('Tümü')}
        </TabPane>
        
        <TabPane tab="Alış" key="buying">
          {renderSummaryAndCharts('Alış')}
        </TabPane>
        
        <TabPane tab="Satış" key="selling">
          {renderSummaryAndCharts('Satış')}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Dashboard; 