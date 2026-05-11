// InvoiceList — Faturalar page (Quiet Premium redesign, Slice 2)
import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Button, DatePicker, Input, Spin, message, Popconfirm } from 'antd';
import { PlusOutlined, DownloadOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import InvoiceTable, { InvoiceTableEmpty } from '../components/InvoiceTable';
import { TopBarContext } from '../App';

const InvoiceList = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const navigate = useNavigate();
  const { setRight } = useContext(TopBarContext);

  const fetchInvoices = useCallback(async () => {
    if (!window.api) {
      message.error('Uygulama başlatılamadı: window.api bulunamadı. Lütfen uygulamayı masaüstü kısayolundan başlatın veya destek alın.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await window.api.getInvoices({
        startDate: null,
        endDate: null,
        company: '',
        currency: '',
        invoice_type: '',
      });
      if (!Array.isArray(data)) throw new Error('Invalid data format received from API');
      const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
      setInvoices(sorted);
    } catch (error) {
      message.error('Faturalar yüklenirken bir hata oluştu: ' + error.message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredRows = useMemo(() => {
    return invoices.filter((inv) => {
      if (search) {
        const q = search.toLowerCase();
        const matchCompany = (inv.company || '').toLowerCase().includes(q);
        const matchNo = (inv.invoice_no || '').toLowerCase().includes(q);
        if (!matchCompany && !matchNo) return false;
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        const d = dayjs(inv.date);
        if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false;
      }
      if (typeFilter !== 'all' && inv.invoice_type !== typeFilter) return false;
      if (currencyFilter !== 'all' && inv.currency !== currencyFilter) return false;
      return true;
    });
  }, [invoices, search, dateRange, typeFilter, currencyFilter]);

  const summary = useMemo(() => {
    let subtotal = 0, kdv = 0, total = 0, satisTry = 0, alisTry = 0;
    for (const inv of filteredRows) {
      const tryTotal = inv.try_equivalent?.total ?? (inv.currency === 'TRY' ? inv.total : 0);
      const trySubtotal = inv.try_equivalent?.subtotal ?? (inv.currency === 'TRY' ? inv.subtotal : 0);
      const tryVat = inv.try_equivalent?.vat_amount ?? (inv.currency === 'TRY' ? inv.vat_amount : 0);
      subtotal += trySubtotal;
      kdv += tryVat;
      total += tryTotal;
      if (inv.invoice_type === 'Satış') satisTry += tryTotal;
      else alisTry += tryTotal;
    }
    const net = satisTry - alisTry;
    const period = dateRange && dateRange[0]
      ? dayjs(dateRange[0]).format('MMMM YYYY')
      : 'Tüm dönem';
    return { count: filteredRows.length, subtotal, kdv, total, net, period };
  }, [filteredRows, dateRange]);

  const handleExport = useCallback(async () => {
    if (filteredRows.length === 0) {
      message.warning('Aktarılacak fatura bulunamadı.');
      return;
    }
    try {
      const fileName = `Faturalar_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      const filePath = await window.api.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (!filePath) return;

      const exportData = filteredRows.map((invoice) => {
        const vatAmount = invoice.subtotal * (invoice.vat_rate / 100);
        let trySubtotal = 0, tryVatAmount = 0, tryTotal = 0;
        if (invoice.try_equivalent && invoice.try_equivalent.total) {
          trySubtotal = invoice.try_equivalent.subtotal || 0;
          tryVatAmount = invoice.try_equivalent.vat_amount || 0;
          tryTotal = invoice.try_equivalent.total || 0;
        } else if (invoice.currency === 'TRY') {
          trySubtotal = invoice.subtotal;
          tryVatAmount = vatAmount;
          tryTotal = invoice.total;
        }
        const hasTryEquivalent = invoice.try_equivalent && invoice.try_equivalent.total;
        return {
          'Tarih': dayjs(invoice.date).format('DD/MM/YYYY'),
          'Fatura Tip': invoice.invoice_type || 'Alış',
          'Şirket': invoice.company,
          'Fatura No': invoice.invoice_no,
          'Para Birim': invoice.currency,
          'Ara Toplam': typeof invoice.subtotal === 'number' ? invoice.subtotal.toFixed(2) : invoice.subtotal,
          'KDV Oranı': typeof invoice.vat_rate === 'number' ? invoice.vat_rate.toFixed(2) : invoice.vat_rate,
          'KDV Tutar': typeof vatAmount === 'number' ? vatAmount.toFixed(2) : vatAmount,
          'Genel Toplam': typeof invoice.total === 'number' ? invoice.total.toFixed(2) : invoice.total,
          'Ara Toplam (TL)': hasTryEquivalent || invoice.currency === 'TRY' ? (typeof trySubtotal === 'number' ? trySubtotal.toFixed(2) : trySubtotal) : 'KUR EKSIK',
          'KDV Tutar (TL)': hasTryEquivalent || invoice.currency === 'TRY' ? (typeof tryVatAmount === 'number' ? tryVatAmount.toFixed(2) : tryVatAmount) : 'KUR EKSIK',
          'Genel Toplam (TL)': hasTryEquivalent || invoice.currency === 'TRY' ? (typeof tryTotal === 'number' ? tryTotal.toFixed(2) : tryTotal) : 'KUR EKSIK',
        };
      });

      const totalRow = {
        'Tarih': '', 'Fatura Tip': '', 'Şirket': '', 'Fatura No': '', 'Para Birim': '',
        'Ara Toplam': '', 'KDV Oranı': '', 'KDV Tutar': '', 'Genel Toplam': '',
        'Ara Toplam (TL)': exportData.reduce((s, r) => s + Number(r['Ara Toplam (TL)'] || 0), 0).toFixed(2),
        'KDV Tutar (TL)': exportData.reduce((s, r) => s + Number(r['KDV Tutar (TL)'] || 0), 0).toFixed(2),
        'Genel Toplam (TL)': exportData.reduce((s, r) => s + Number(r['Genel Toplam (TL)'] || 0), 0).toFixed(2),
      };

      const colWidths = [
        { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 16 }, { wch: 16 }, { wch: 16 },
      ];

      await window.api.exportToExcel({ rows: exportData, totalRow, colWidths, sheetName: 'Faturalar' }, filePath);
      message.success(`Faturalar başarıyla aktarıldı. (${exportData.length} satır)`);
    } catch (error) {
      message.error('Excel dosyası oluşturulurken bir hata oluştu: ' + error.message);
    }
  }, [filteredRows]);

  const handleBulkDelete = async () => {
    for (const id of selectedRowKeys) await window.api.deleteInvoice(id);
    message.success(`${selectedRowKeys.length} fatura silindi`);
    setSelectedRowKeys([]);
    fetchInvoices();
  };

  useEffect(() => {
    setRight(
      <>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{filteredRows.length} fatura</span>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>Excel'e Aktar</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>Yeni Fatura</Button>
      </>
    );
    return () => setRight(null);
  }, [setRight, filteredRows.length, handleExport, navigate]);

  return (
    <div className="tt-page">
      <div>
        <div className="toolbar" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0', borderBottom: 0 }}>
          <span className="tt-input" style={{ minWidth: 280 }}>
            <SearchOutlined />
            <input placeholder="Şirket veya fatura no ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </span>
          <DatePicker.RangePicker value={dateRange} onChange={setDateRange} format="DD/MM/YYYY" allowClear />
          <div className="seg seg-pill">
            <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>Tümü</button>
            <button className={typeFilter === 'Alış' ? 'active' : ''} onClick={() => setTypeFilter('Alış')}>Alış</button>
            <button className={typeFilter === 'Satış' ? 'active' : ''} onClick={() => setTypeFilter('Satış')}>Satış</button>
          </div>
          <div className="seg seg-pill">
            <button className={currencyFilter === 'all' ? 'active' : ''} onClick={() => setCurrencyFilter('all')}>Tüm Para Birimi</button>
            <button className={currencyFilter === 'TRY' ? 'active' : ''} onClick={() => setCurrencyFilter('TRY')}>TRY</button>
            <button className={currencyFilter === 'USD' ? 'active' : ''} onClick={() => setCurrencyFilter('USD')}>USD</button>
            <button className={currencyFilter === 'EUR' ? 'active' : ''} onClick={() => setCurrencyFilter('EUR')}>EUR</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedRowKeys.length > 0 && (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{selectedRowKeys.length} seçili</span>
                <div className="toolbar-divider" />
                <Popconfirm title="Seçili faturalar silinsin mi?" onConfirm={handleBulkDelete} okText="Sil" cancelText="İptal">
                  <Button danger size="small" icon={<DeleteOutlined />}>Sil</Button>
                </Popconfirm>
              </>
            )}
          </div>
        </div>

        <div className="table-wrap" style={{ borderRadius: '0 0 var(--r-lg) var(--r-lg)', borderTop: 0 }}>
          {loading ? (
            <div style={{ padding: 80, textAlign: 'center' }}><Spin /></div>
          ) : filteredRows.length === 0 ? (
            <InvoiceTableEmpty onCreate={() => navigate('/invoices/new')} />
          ) : (
            <InvoiceTable
              rows={filteredRows}
              selectedRowKeys={selectedRowKeys}
              onSelectChange={setSelectedRowKeys}
              onRowClick={(row) => navigate(`/invoices/edit/${row.id}`)}
              summary={summary}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;
