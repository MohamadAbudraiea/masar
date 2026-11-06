import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Building2, Eye } from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';
import { linkTo } from '../../lib/links.js';

const HELD_DEFAULTS = { from: '', to: '', q: '', status: '' };
const STAGES = ['pending', 'waiting_load', 'in_delivery', 'delivered'];
const STAGE_COLOR = { pending: '#F5A82A', waiting_load: '#2563EB', in_delivery: '#0D9488', delivered: '#7C3AED' };

function ageH(iso) {
  if (!iso) return null;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
}

export default function EscrowHeldFunds() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { t } = useTranslation();

  const { filters, setFilter, resetFilters } = useUrlFilters(HELD_DEFAULTS);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHeld = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient(`/reports/escrow/held${qs}`);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load held funds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeld();
  }, [filters.from, filters.to]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    params.set('format', 'csv');
    window.open(getApiUrl(`/reports/escrow/held?${params.toString()}`), '_blank');
  };

  const totalHeldAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const byStage = STAGES.map((st) => {
    const rows = items.filter((i) => i.status === st);
    return { st, count: rows.length, amount: rows.reduce((a, r) => a + (Number(r.amount) || 0), 0) };
  });
  const q = (filters.q || '').trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (!filters.status || i.status === filters.status) &&
      (!q || i.ticket.ticket_number.toLowerCase().includes(q) || i.manufacturer.name.toLowerCase().includes(q))
  );
  const ageLabel = (h) => (h < 1 ? (isAr ? 'أقل من ساعة' : '< 1 h') : h < 48 ? (isAr ? `${Math.round(h)} ساعة` : `${Math.round(h)} h`) : isAr ? `${Math.round(h / 24)} يوم` : `${Math.round(h / 24)} days`);

  const columns = [
    {
      key: 'ticket',
      header: isAr ? 'الشحنة' : 'Shipment',
      render: (tk) => <span className="font-bold text-navy-900">{tk.ticket_number}</span>,
    },
    {
      key: 'manufacturer',
      header: isAr ? 'المصنع المودِع' : 'Depositing company',
      render: (m) => (
        <Link to={`/escrow/companies/${m.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 font-semibold text-navy-900 hover:underline">
          <Building2 className="h-3.5 w-3.5 text-ink-muted" />
          {m.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: isAr ? 'المرحلة' : 'Stage',
      render: (val) => <StatusChip status={val} />,
    },
    {
      key: 'held_since',
      header: isAr ? 'محجوز منذ' : 'Held for',
      render: (val) => {
        const h = ageH(val);
        if (h == null) return <span className="text-xs text-ink-muted">—</span>;
        const cls = h > 72 ? 'bg-[#FEE2E2] text-[#B91C1C]' : h > 24 ? 'bg-amber-100 text-[#8A5A00]' : 'bg-surface text-ink-muted';
        return (
          <div>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${cls}`}>{ageLabel(h)}</span>
            <div className="text-[11px] text-ink-muted mt-0.5">{formatDateTime(val)}</div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      align: 'end',
      header: isAr ? 'المبلغ المحجوز' : 'Held amount',
      render: (val) => <span className="font-extrabold text-navy-900 tabular-nums whitespace-nowrap">{formatMoney(val)}</span>,
    },
    {
      key: 'actions',
      align: 'end',
      header: '',
      render: (_, row) => (
        <span className="inline-flex gap-1.5">
          <Link to={`/escrow/shipments/${row.ticket.id}`} onClick={(e) => e.stopPropagation()} className="h-8 px-2.5 rounded-lg border border-line text-xs font-bold text-navy-900 hover:bg-surface inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {isAr ? 'الشحنة' : 'Shipment'}
          </Link>
          <Link to={`/escrow/companies/${row.manufacturer.id}`} onClick={(e) => e.stopPropagation()} className="h-8 px-2.5 rounded-lg border border-line text-xs font-bold text-navy-900 hover:bg-surface inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> {isAr ? 'الشركة' : 'Company'}
          </Link>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">{isAr ? 'الأموال المحجوزة' : 'Held funds'}</h1>
        <p className="text-sm text-ink-muted mt-1">
          {isAr ? 'كل دفعة تحتفظ بها SafePay حتى يؤكد المصنع التسليم.' : 'Every payment SafePay is holding until the manufacturer confirms delivery.'}
        </p>
      </div>

      {/* Stage summary — click to filter */}
      <section className="bg-card rounded-2xl border border-line p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 rounded-xl bg-navy-900 text-amber-500 flex items-center justify-center"><Lock className="h-5 w-5" /></span>
            <div>
              <div className="text-xs font-semibold text-ink-muted">{isAr ? 'إجمالي المحجوز' : 'Total held'}</div>
              <div className="text-[26px] font-extrabold text-navy-900 tabular-nums leading-none mt-1">
                {formatMoney(totalHeldAmount).replace(' JD', '')} <span className="text-sm text-ink-muted">JD</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-ink-muted">{items.length} {isAr ? 'شحنة' : 'shipments'}</div>
        </div>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface" dir="ltr">
          {byStage.map((b) => (
            <div key={b.st} style={{ width: `${totalHeldAmount ? (b.amount / totalHeldAmount) * 100 : 0}%`, background: STAGE_COLOR[b.st] }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {byStage.map((b) => {
            const on = filters.status === b.st;
            return (
              <button
                key={b.st}
                onClick={() => setFilter('status', on ? '' : b.st)}
                className={`text-start rounded-xl border px-3 py-2.5 transition ${on ? 'border-navy-900 ring-2 ring-navy-900/10 bg-surface' : 'border-line hover:border-navy-700/30'}`}
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_COLOR[b.st] }} />
                  {t(`status.${b.st}`)}
                </span>
                <span className="mt-1 block text-sm font-extrabold text-navy-900 tabular-nums">{formatMoney(b.amount)}</span>
                <span className="block text-[11px] text-ink-muted">{b.count} {isAr ? 'شحنة' : 'shipments'}</span>
              </button>
            );
          })}
        </div>
      </section>

      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} onExportCsv={handleExportCsv} placeholder={isAr ? 'رقم الشحنة أو اسم الشركة…' : 'Shipment number or company…'} />

      <DataTable
        columns={columns}
        data={shown}
        loading={loading}
        onRowClick={(row) => navigate(`/escrow/shipments/${row.ticket.id}`)}
        emptyMessage={isAr ? 'لا أموال محجوزة هنا' : 'No held funds here'}
        emptyHint={isAr ? 'المدفوعات الجديدة تظهر هنا حتى تأكيد التسليم.' : 'New payments appear here until delivery is confirmed.'}
      />
    </div>
  );
}
