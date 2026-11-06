import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Copy, Banknote } from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { MONEY_COLS } from '../../lib/moneyColors.js';
import { useToast } from '../../state/toast.jsx';

const REL_DEFAULTS = { from: '', to: '', q: '' };

function MoneyHeader({ col, isAr }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
      {isAr ? col.label[1] : col.label[0]}
    </span>
  );
}

export default function EscrowReleases() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const toast = useToast();

  const { filters, setFilter, resetFilters } = useUrlFilters(REL_DEFAULTS);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient(`/reports/escrow/releases${qs}`);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load escrow releases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [filters.from, filters.to]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    params.set('format', 'csv');
    window.open(getApiUrl(`/reports/escrow/releases?${params.toString()}`), '_blank');
  };

  const q = (filters.q || '').trim().toLowerCase();
  const shown = items.filter((r) => !q || r.ticket_number.toLowerCase().includes(q) || (r.driver_name || '').toLowerCase().includes(q));
  const sum = (k) => shown.reduce((a, r) => a + (Number(r[k]) || 0), 0);

  const copy = (e, text) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(text);
      toast.success(isAr ? 'تم النسخ' : 'Copied');
    } catch {
      /* clipboard unavailable */
    }
  };

  const columns = [
    {
      key: 'ticket_number',
      header: isAr ? 'الشحنة' : 'Shipment',
      render: (val, row) => (
        <div>
          <div className="font-bold text-navy-900">{val}</div>
          <div className="text-[11px] text-ink-muted whitespace-nowrap">{formatDateTime(row.release_time)}</div>
        </div>
      ),
    },
    {
      key: 'driver_name',
      header: isAr ? 'السائق وحساب الصرف' : 'Driver & payout account',
      render: (val, row) => (
        <div className="min-w-[200px]">
          <div className="font-semibold text-navy-900">{val}</div>
          {row.iban && (
            <button onClick={(e) => copy(e, row.iban)} className="group mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-navy-900 tabular-nums" dir="ltr" title={isAr ? 'نسخ' : 'Copy'}>
              {row.iban}
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
            </button>
          )}
          {row.cliq_alias && <div className="text-[11px] text-ink-muted" dir="ltr">CliQ: {row.cliq_alias}</div>}
        </div>
      ),
    },
    {
      key: 'price',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.price} isAr={isAr} />,
      render: (v) => <span className={`font-extrabold tabular-nums whitespace-nowrap ${MONEY_COLS.price.text}`}>{formatMoney(v)}</span>,
    },
    {
      key: 'escrow_commission',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.escrow} isAr={isAr} />,
      render: (v) => <span className={`inline-flex rounded-lg px-2 py-1 font-bold tabular-nums whitespace-nowrap ${MONEY_COLS.escrow.chip}`}>{formatMoney(v)}</span>,
    },
    {
      key: 'masar_commission',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.masar} isAr={isAr} />,
      render: (v) => <span className={`font-semibold tabular-nums whitespace-nowrap ${MONEY_COLS.masar.text}`}>{formatMoney(v)}</span>,
    },
    {
      key: 'driver_net',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.driver} isAr={isAr} />,
      render: (v) => <span className={`font-bold tabular-nums whitespace-nowrap ${MONEY_COLS.driver.text}`}>{formatMoney(v)}</span>,
    },
    {
      key: 'status',
      align: 'end',
      header: isAr ? 'التحويل' : 'Transfer',
      render: () => (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] text-[#15803D] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap">
          <CheckCheck className="h-3.5 w-3.5" /> {isAr ? 'تم التحويل' : 'Transferred'}
        </span>
      ),
    },
  ];

  const footer = (
    <tr className="border-t-2 border-line bg-surface/60">
      <td colSpan={2} className="px-4 py-3 text-xs font-bold text-ink-muted">{isAr ? `المجموع (${shown.length} عملية)` : `Total (${shown.length} releases)`}</td>
      <td className={`px-4 py-3 text-end font-extrabold tabular-nums ${MONEY_COLS.price.text}`}>{formatMoney(sum('price'))}</td>
      <td className={`px-4 py-3 text-end font-bold tabular-nums ${MONEY_COLS.escrow.text}`}>{formatMoney(sum('escrow_commission'))}</td>
      <td className={`px-4 py-3 text-end font-bold tabular-nums ${MONEY_COLS.masar.text}`}>{formatMoney(sum('masar_commission'))}</td>
      <td className={`px-4 py-3 text-end font-bold tabular-nums ${MONEY_COLS.driver.text}`}>{formatMoney(sum('driver_net'))}</td>
      <td />
    </tr>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">{isAr ? 'عمليات الإفراج' : 'Releases'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {isAr ? 'كل مبلغ أُفرج عنه بعد تأكيد التسليم، مع حساب السائق.' : "Every payout released after delivery was confirmed, with the driver's account."}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-line px-4 py-3">
          <span className="h-10 w-10 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center"><Banknote className="h-5 w-5" /></span>
          <div>
            <div className="text-xs text-ink-muted">{isAr ? 'صُرف للسائقين' : 'Paid to drivers'}</div>
            <div className="text-lg font-extrabold text-navy-900 tabular-nums">{formatMoney(sum('driver_net'))}</div>
          </div>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} onExportCsv={handleExportCsv} placeholder={isAr ? 'رقم الشحنة أو اسم السائق…' : 'Shipment number or driver…'} />

      <DataTable
        columns={columns}
        data={shown}
        loading={loading}
        footer={footer}
        onRowClick={(row) => navigate(`/escrow/shipments/${row.ticket_id}`)}
        emptyMessage={isAr ? 'لا عمليات إفراج في هذه الفترة' : 'No releases in this period'}
      />
    </div>
  );
}
