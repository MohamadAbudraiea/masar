import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Truck } from 'lucide-react';
import { apiClient, getApiUrl } from '../../api/client.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import FilterBar from '../../components/FilterBar.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import { formatMoney } from '../../lib/format.js';
import { formatDateTime } from '../../lib/time.js';
import { MONEY_COLS } from '../../lib/moneyColors.js';

const DEFAULTS = { status: '', q: '', from: '', to: '', page: '1' };

function MoneyHeader({ col, isAr }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
      {isAr ? col.label[1] : col.label[0]}
    </span>
  );
}

export default function EscrowShipments() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { filters, setFilter, resetFilters } = useUrlFilters(DEFAULTS);

  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});

  const TABS = [
    { value: '', label: isAr ? 'الكل' : 'All' },
    { value: 'pending,waiting_load,in_delivery', label: isAr ? 'محجوز' : 'Held' },
    { value: 'delivered', label: isAr ? 'بانتظار التأكيد' : 'Awaiting confirmation' },
    { value: 'audited', label: isAr ? 'تم الإفراج' : 'Released' },
    { value: 'requested', label: isAr ? 'غير مدفوع' : 'Unpaid' },
  ];

  // Tab counts (one light request per tab, page_size=1 → uses `total`)
  useEffect(() => {
    let alive = true;
    Promise.all(
      TABS.map((t) =>
        apiClient(`/tickets?page_size=1${t.value ? `&status=${t.value}` : ''}`)
          .then((r) => [t.value, r.total || 0])
          .catch(() => [t.value, null])
      )
    ).then((pairs) => alive && setCounts(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const qp = new URLSearchParams();
        ['status', 'q', 'from', 'to'].forEach((k) => filters[k] && qp.set(k, filters[k]));
        qp.set('page', filters.page || '1');
        qp.set('page_size', '15');
        const data = await apiClient(`/tickets?${qp.toString()}`);
        if (!alive) return;
        setTickets(data.items || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Failed to fetch escrow shipments:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [filters.status, filters.q, filters.from, filters.to, filters.page]);

  const handleExportCsv = () => {
    const qp = new URLSearchParams();
    ['status', 'q', 'from', 'to'].forEach((k) => filters[k] && qp.set(k, filters[k]));
    qp.set('format', 'csv');
    window.open(getApiUrl(`/tickets?${qp.toString()}`), '_blank');
  };

  const sum = (k) => tickets.reduce((s, t) => s + (Number(t[k]) || 0), 0);

  const columns = [
    {
      key: 'ticket_number',
      header: isAr ? 'الشحنة' : 'Shipment',
      render: (val, row) => (
        <div>
          <div className="font-bold text-navy-900">{val}</div>
          <div className="text-[11px] text-ink-muted whitespace-nowrap">
            {row.pickup?.city} → {row.dest?.city}
          </div>
        </div>
      ),
    },
    {
      key: 'parties',
      header: isAr ? 'المصنع / السائق' : 'Company / driver',
      render: (_, row) => (
        <div className="space-y-1 min-w-[170px]">
          {row.manufacturer?.id && (
            <Link
              to={`/escrow/companies/${row.manufacturer.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 font-semibold text-navy-900 hover:underline"
            >
              <Building2 className="h-3.5 w-3.5 text-ink-muted shrink-0" />
              <span className="truncate">{row.manufacturer.name}</span>
            </Link>
          )}
          {row.driver?.id ? (
            <Link
              to={`/escrow/drivers/${row.driver.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs text-ink hover:underline"
            >
              <Truck className="h-3.5 w-3.5 text-ink-muted shrink-0" />
              <span className="truncate">{row.driver.name}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              {isAr ? 'لا سائق بعد' : 'No driver yet'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: isAr ? 'الحالة' : 'Status',
      render: (val, row) => (
        <div className="space-y-1">
          <StatusChip status={val} />
          <div className="text-[11px] text-ink-muted whitespace-nowrap">
            {val === 'audited'
              ? `${isAr ? 'أُفرج' : 'Released'} ${formatDateTime(row.status_history?.audited)}`
              : val === 'requested'
              ? isAr ? 'لم يُدفع' : 'Not paid yet'
              : row.status_history?.pending
              ? `${isAr ? 'محجوز منذ' : 'Held since'} ${formatDateTime(row.status_history.pending)}`
              : isAr ? 'محجوز' : 'Held'}
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.price} isAr={isAr} />,
      render: (val) => <span className={`font-extrabold tabular-nums whitespace-nowrap ${MONEY_COLS.price.text}`}>{formatMoney(val)}</span>,
    },
    {
      key: 'escrow_fee',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.escrow} isAr={isAr} />,
      render: (val, row) => (
        <span className={`inline-flex rounded-lg px-2 py-1 font-bold tabular-nums whitespace-nowrap ${MONEY_COLS.escrow.chip}`}>
          {formatMoney(val)}
          {row.escrow_pct != null && <span className="ms-1 font-semibold opacity-75">· {row.escrow_pct}%</span>}
        </span>
      ),
    },
    {
      key: 'masar_fee',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.masar} isAr={isAr} />,
      render: (val) => <span className={`font-semibold tabular-nums whitespace-nowrap ${MONEY_COLS.masar.text}`}>{formatMoney(val)}</span>,
    },
    {
      key: 'driver_net',
      align: 'end',
      header: <MoneyHeader col={MONEY_COLS.driver} isAr={isAr} />,
      render: (val) => <span className={`font-bold tabular-nums whitespace-nowrap ${MONEY_COLS.driver.text}`}>{formatMoney(val)}</span>,
    },
  ];

  const footer = (
    <tr className="border-t-2 border-line bg-surface/60 text-sm">
      <td colSpan={3} className="px-4 py-3 text-xs font-bold text-ink-muted">
        {isAr ? `مجموع هذه الصفحة (${tickets.length} شحنة)` : `Total on this page (${tickets.length} shipments)`}
      </td>
      <td className={`px-4 py-3 text-end font-extrabold tabular-nums ${MONEY_COLS.price.text}`}>{formatMoney(sum('price'))}</td>
      <td className={`px-4 py-3 text-end font-bold tabular-nums ${MONEY_COLS.escrow.text}`}>{formatMoney(sum('escrow_fee'))}</td>
      <td className={`px-4 py-3 text-end font-bold tabular-nums ${MONEY_COLS.masar.text}`}>{formatMoney(sum('masar_fee'))}</td>
      <td className={`px-4 py-3 text-end font-bold tabular-nums ${MONEY_COLS.driver.text}`}>{formatMoney(sum('driver_net'))}</td>
    </tr>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-extrabold text-navy-900 tracking-tight leading-tight">{isAr ? 'الشحنات' : 'Shipments'}</h1>
        <p className="text-sm text-ink-muted mt-1">
          {isAr ? 'كل شحنة مع تقسيم أموالها: السعر، عمولة الضمان، عمولة مسار، وصافي السائق.' : 'Every shipment with its money split: price, escrow fee, Masar fee and driver net.'}
        </p>
      </div>

      <FilterBar
        tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))}
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        onExportCsv={handleExportCsv}
      />

      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        total={total}
        page={parseInt(filters.page || '1', 10)}
        pageSize={15}
        onPageChange={(p) => setFilter('page', p)}
        onRowClick={(row) => navigate(`/escrow/shipments/${row.id}`)}
        footer={footer}
        emptyMessage={isAr ? 'لا شحنات تطابق الفلاتر' : 'No shipments match these filters'}
      />
    </div>
  );
}
