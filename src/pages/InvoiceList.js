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
        const subtotal = Number(invoice.subtotal) || 0;
        const vatAmount = Number(invoice.vat_amount) || 0;
        const total = Number(invoice.total) || 0;
        const hasTryEquivalent = invoice.try_equivalent && invoice.try_equivalent.total;
        const trySubtotal = hasTryEquivalent
          ? Number(invoice.try_equivalent.subtotal) || 0
          : invoice.currency === 'TRY' ? subtotal : null;
        const tryVatAmount = hasTryEquivalent
          ? Number(invoice.try_equivalent.vat_amount) || 0
          : invoice.currency === 'TRY' ? vatAmount : null;
        const tryTotal = hasTryEquivalent
          ? Number(invoice.try_equivalent.total) || 0
          : invoice.currency === 'TRY' ? total : null;
        // KDV Oranı is either a numeric percentage or the string "Karışık" for mixed-rate invoices.
        const vatRateCell = invoice.vat_rate == null
          ? 'Karışık'
          : Number(invoice.vat_rate).toFixed(2);
        return {
          'Tarih': dayjs(invoice.date).format('DD/MM/YYYY'),
          'Fatura Tip': invoice.invoice_type || 'Alış',
          'Şirket': invoice.company,
          'Fatura No': invoice.invoice_no,
          'Para Birim': invoice.currency,
          'Ara Toplam': subtotal.toFixed(2),
          'KDV Oranı': vatRateCell,
          'KDV Tutar': vatAmount.toFixed(2),
          'Genel Toplam': total.toFixed(2),
          'Ara Toplam (TL)': trySubtotal != null ? trySubtotal.toFixed(2) : 'KUR EKSIK',
          'KDV Tutar (TL)': tryVatAmount != null ? tryVatAmount.toFixed(2) : 'KUR EKSIK',
          'Genel Toplam (TL)': tryTotal != null ? tryTotal.toFixed(2) : 'KUR EKSIK',
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

      // Build a flat per-line-item sheet so accountants can audit the KDV breakdown
      // even when invoices carry mixed rates.
      const lineItems = [];
      for (const invoice of filteredRows) {
        const lines = Array.isArray(invoice.line_items) ? invoice.line_items : [];
        const tryLines = Array.isArray(invoice.try_equivalent?.line_items)
          ? invoice.try_equivalent.line_items
          : [];
        for (let idx = 0; idx < lines.length; idx += 1) {
          const li = lines[idx];
          const liSubtotal = Number(li.subtotal) || 0;
          const liRate = Number(li.vat_rate) || 0;
          const liVat = liSubtotal * (liRate / 100);
          const liTotal = liSubtotal + liVat;
          const tryLi = tryLines.find((t) => t.id === li.id) || tryLines[idx] || null;
          lineItems.push({
            'Tarih': dayjs(invoice.date).format('DD/MM/YYYY'),
            'Fatura No': invoice.invoice_no,
            'Şirket': invoice.company,
            'Fatura Tip': invoice.invoice_type || 'Alış',
            'Para Birim': invoice.currency,
            'Satır Açıklama': li.description || '',
            'Ara Toplam': liSubtotal.toFixed(2),
            'KDV Oranı': liRate.toFixed(2),
            'KDV Tutar': liVat.toFixed(2),
            'Satır Toplamı': liTotal.toFixed(2),
            'Ara Toplam (TL)': tryLi ? (Number(tryLi.subtotal) || 0).toFixed(2) : (invoice.currency === 'TRY' ? liSubtotal.toFixed(2) : 'KUR EKSIK'),
            'KDV Tutar (TL)': tryLi ? (Number(tryLi.vat_amount) || 0).toFixed(2) : (invoice.currency === 'TRY' ? liVat.toFixed(2) : 'KUR EKSIK'),
          });
        }
      }

      const lineItemsColWidths = [
        { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
        { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
        { wch: 16 }, { wch: 16 },
      ];

      await window.api.exportToExcel({
        rows: exportData,
        totalRow,
        colWidths,
        sheetName: 'Faturalar',
        lineItems,
        lineItemsSheetName: 'Kalemler',
        lineItemsColWidths,
      }, filePath);
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
