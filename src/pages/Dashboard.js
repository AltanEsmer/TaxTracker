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
  Tabs
} from 'antd';
import { 
  DollarOutlined, 
  FileOutlined, 
  PercentageOutlined 
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

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const filters = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };
      
      const data = await window.api.getDashboardData(filters);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Veri yüklenirken bir hata oluştu.');
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
  const prepareVatByMonthChart = () => {
    if (!dashboardData || !dashboardData.vatByMonth || dashboardData.vatByMonth.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Group by month and invoice type
    const monthGroups = dashboardData.vatByMonth.reduce((acc, item) => {
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
    dashboardData.vatByMonth.forEach(item => {
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

  const prepareCurrencyDistributionChart = () => {
    if (!dashboardData || !dashboardData.currencyDistribution || dashboardData.currencyDistribution.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Group by invoice type
    const typeGroups = dashboardData.currencyDistribution.reduce((acc, item) => {
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
    const labels = [...new Set(dashboardData.currencyDistribution.map(item => item.currency))];

    return {
      labels,
      datasets
    };
  };

  const prepareMonthlyTotalsChart = () => {
    if (!dashboardData || !dashboardData.monthlyTotals || dashboardData.monthlyTotals.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Group by invoice type
    const typeGroups = dashboardData.monthlyTotals.reduce((acc, item) => {
      const type = item.invoice_type || 'Alış';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});

    // Get all unique months
    const allMonths = [...new Set(dashboardData.monthlyTotals.map(item => item.month))].sort();

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
  const calculateTotalVat = (type = null) => {
    if (!dashboardData || !dashboardData.vatByMonth) return 0;
    
    let filteredData = dashboardData.vatByMonth;
    if (type) {
      filteredData = filteredData.filter(item => (item.invoice_type || 'Alış') === type);
    }
    
    return filteredData.reduce((sum, item) => sum + Number(item.vat_amount), 0).toFixed(2);
  };

  const calculateTotalInvoices = (type = null) => {
    if (!dashboardData || !dashboardData.currencyDistribution) return 0;
    
    let filteredData = dashboardData.currencyDistribution;
    if (type) {
      filteredData = filteredData.filter(item => (item.invoice_type || 'Alış') === type);
    }
    
    return filteredData.reduce((sum, item) => sum + Number(item.count), 0);
  };

  const calculateTotalAmount = (type = null) => {
    if (!dashboardData || !dashboardData.currencyDistribution) return 0;
    
    let filteredData = dashboardData.currencyDistribution;
    if (type) {
      filteredData = filteredData.filter(item => (item.invoice_type || 'Alış') === type);
    }
    
    // Note: This is simplified and doesn't convert currencies
    return filteredData
      .reduce((sum, item) => sum + Number(item.total_amount), 0)
      .toFixed(2);
  };

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

      <Tabs defaultActiveKey="all">
        <TabPane tab="Tümü" key="all">
          <Row gutter={16}>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Toplam KDV"
                  value={calculateTotalVat()}
                  prefix={<PercentageOutlined />}
                  suffix="TL"
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Fatura Sayısı"
                  value={calculateTotalInvoices()}
                  prefix={<FileOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Toplam Tutar"
                  value={calculateTotalAmount()}
                  prefix={<DollarOutlined />}
                  suffix="TL"
                  precision={2}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Aylık KDV" className="chart-container">
                <div style={{ height: '400px' }}>
                  <Bar data={prepareVatByMonthChart()} options={{
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
                  <Pie data={prepareCurrencyDistributionChart()} options={{
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
                  <Line data={prepareMonthlyTotalsChart()} options={{
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
        </TabPane>
        
        <TabPane tab="Alış" key="buying">
          <Row gutter={16}>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Alış KDV"
                  value={calculateTotalVat('Alış')}
                  prefix={<PercentageOutlined />}
                  suffix="TL"
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Alış Fatura Sayısı"
                  value={calculateTotalInvoices('Alış')}
                  prefix={<FileOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Alış Toplam Tutar"
                  value={calculateTotalAmount('Alış')}
                  prefix={<DollarOutlined />}
                  suffix="TL"
                  precision={2}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="Satış" key="selling">
          <Row gutter={16}>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Satış KDV"
                  value={calculateTotalVat('Satış')}
                  prefix={<PercentageOutlined />}
                  suffix="TL"
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Satış Fatura Sayısı"
                  value={calculateTotalInvoices('Satış')}
                  prefix={<FileOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Satış Toplam Tutar"
                  value={calculateTotalAmount('Satış')}
                  prefix={<DollarOutlined />}
                  suffix="TL"
                  precision={2}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Dashboard; 