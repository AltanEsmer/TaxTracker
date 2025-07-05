import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  DatePicker, 
  Typography, 
  Spin, 
  Alert 
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

    // Group by month
    const monthGroups = dashboardData.vatByMonth.reduce((acc, item) => {
      if (!acc[item.month]) {
        acc[item.month] = [];
      }
      acc[item.month].push(item);
      return acc;
    }, {});

    const labels = Object.keys(monthGroups).sort();
    
    // Create datasets for each currency
    const currencies = [...new Set(dashboardData.vatByMonth.map(item => item.currency))];
    const datasets = currencies.map((currency, index) => {
      const backgroundColor = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
      ][index % 3];
      
      return {
        label: `KDV (${currency})`,
        data: labels.map(month => {
          const items = monthGroups[month].filter(item => item.currency === currency);
          return items.length > 0 ? items[0].vat_amount : 0;
        }),
        backgroundColor
      };
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

    return {
      labels: dashboardData.currencyDistribution.map(item => item.currency),
      datasets: [
        {
          data: dashboardData.currencyDistribution.map(item => item.count),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareMonthlyTotalsChart = () => {
    if (!dashboardData || !dashboardData.monthlyTotals || dashboardData.monthlyTotals.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const sortedData = [...dashboardData.monthlyTotals].sort((a, b) => a.month.localeCompare(b.month));

    return {
      labels: sortedData.map(item => item.month),
      datasets: [
        {
          label: 'Aylık Toplam',
          data: sortedData.map(item => item.total_amount),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
        },
      ],
    };
  };

  // Calculate summary statistics
  const calculateTotalVat = () => {
    if (!dashboardData || !dashboardData.vatByMonth) return 0;
    return dashboardData.vatByMonth.reduce((sum, item) => sum + Number(item.vat_amount), 0).toFixed(2);
  };

  const calculateTotalInvoices = () => {
    if (!dashboardData || !dashboardData.currencyDistribution) return 0;
    return dashboardData.currencyDistribution.reduce((sum, item) => sum + Number(item.count), 0);
  };

  const calculateTotalAmount = () => {
    if (!dashboardData || !dashboardData.currencyDistribution) return 0;
    // Note: This is simplified and doesn't convert currencies
    return dashboardData.currencyDistribution
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
        <Col span={16}>
          <TitleText level={2}>Dashboard</TitleText>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="DD/MM/YYYY"
            className="date-range-picker"
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card className="dashboard-card">
            <Statistic
              title="Toplam KDV"
              value={calculateTotalVat()}
              prefix={<PercentageOutlined />}
              suffix="TL"
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
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="Aylara Göre KDV" className="chart-container">
            <Bar 
              data={prepareVatByMonthChart()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false,
                  },
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Para Birimi Dağılımı" className="chart-container">
            <Pie 
              data={prepareCurrencyDistributionChart()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Aylık Ciro" className="chart-container">
            <Line 
              data={prepareMonthlyTotalsChart()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 