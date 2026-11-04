import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Building2,
  Truck,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import StatusChip from '../../components/StatusChip.jsx';
import Timeline from '../../components/Timeline.jsx';
import TruckLoader from '../../components/TruckLoader.jsx';
import { formatDateTime } from '../../lib/time.js';
import { formatMoney } from '../../lib/format.js';

export default function EscrowShipmentDetail() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTicket() {
      try {
        setLoading(true);
        const data = await apiClient(`/tickets/${id}`);
        setTicket(data);
      } catch (err) {
        console.error('Failed to load shipment detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTicket();
  }, [id]);

  if (loading) {
    return <TruckLoader message={isAr ? 'جاري تحميل تفاصيل الشحنة...' : 'Loading shipment details...'} />;
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center text-xs text-ink-muted">
        {isAr ? 'الشحنة غير موجودة' : 'Shipment not found'}
      </div>
    );
  }

  const ledgerEntries = ticket.ledger_entries || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <Link
          to="/escrow/shipments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-navy-900 mb-3"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة لقائمة الشحنات' : 'Back to Shipments'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-navy-900 font-bold">
              <Package className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-navy-900">{ticket.ticket_number}</h1>
                <StatusChip status={ticket.status} />
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {ticket.pickup?.city} → {ticket.dest?.city} · {formatDateTime(ticket.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Settlement Breakdown Card */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2 border-b border-line pb-3">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>{isAr ? 'تفصيل المستحقات والعمولات (SafePay Escrow)' : 'Escrow Settlement Breakdown'}</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-surface/50 p-3.5 rounded-xl border border-line/60">
            <span className="text-ink-muted block text-[11px] mb-1">
              {isAr ? 'إجمالي السعر المودع' : 'Total Deposited Price'}
            </span>
            <div className="text-lg font-black text-navy-900 font-mono">
              {formatMoney(ticket.price)}
            </div>
          </div>

          <div className="bg-surface/50 p-3.5 rounded-xl border border-line/60">
            <span className="text-ink-muted block text-[11px] mb-1">
              {isAr ? 'عمولة SafePay الضامنة' : 'SafePay Escrow Fee'} ({ticket.escrow_pct}%)
            </span>
            <div className="text-lg font-bold text-navy-700 font-mono">
              {formatMoney(ticket.escrow_fee)}
            </div>
          </div>

          <div className="bg-surface/50 p-3.5 rounded-xl border border-line/60">
            <span className="text-ink-muted block text-[11px] mb-1">
              {isAr ? 'عمولة منصة مسار' : 'Masar Platform Fee'}
            </span>
            <div className="text-lg font-bold text-slate-600 font-mono">
              {formatMoney(ticket.masar_fee)}
            </div>
          </div>

          <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30">
            <span className="text-emerald-800 block text-[11px] mb-1 font-semibold">
              {isAr ? 'صافي مستحق السائق' : 'Driver Net Settlement'}
            </span>
            <div className="text-lg font-black text-emerald-600 font-mono">
              {formatMoney(ticket.driver_net)}
            </div>
          </div>
        </div>
      </div>

      {/* Parties Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manufacturer */}
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs text-xs space-y-2">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            {isAr ? 'الشركة المودعة (المصنع)' : 'Depositing Company'}
          </span>
          <div className="font-bold text-navy-900 text-sm flex items-center justify-between">
            <Link
              to={`/escrow/companies/${ticket.manufacturer_id}`}
              className="hover:underline flex items-center gap-1.5"
            >
              <Building2 className="h-4 w-4 text-navy-700" />
              <span>{ticket.manufacturer?.name}</span>
            </Link>
            <span dir="ltr" className="text-xs text-ink-muted">
              {ticket.manufacturer?.phone}
            </span>
          </div>
        </div>

        {/* Driver */}
        <div className="bg-card rounded-2xl border border-line p-5 shadow-xs text-xs space-y-2">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
            {isAr ? 'السائق المستفيد (المستلم للأرباح)' : 'Beneficiary Driver'}
          </span>
          {ticket.driver ? (
            <div className="space-y-1">
              <div className="font-bold text-navy-900 text-sm flex items-center justify-between">
                <Link
                  to={`/escrow/drivers/${ticket.driver.id}`}
                  className="hover:underline flex items-center gap-1.5"
                >
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span>{ticket.driver.name}</span>
                </Link>
                <span dir="ltr" className="text-xs text-ink-muted">
                  {ticket.driver.phone}
                </span>
              </div>
              <div className="text-[11px] font-mono text-ink-muted" dir="ltr">
                IBAN: {ticket.driver.iban || 'JO0000000000000000000000000000'}{' '}
                {ticket.driver.cliq_alias ? `· CliQ: ${ticket.driver.cliq_alias}` : ''}
              </div>
            </div>
          ) : (
            <span className="text-ink-muted italic">{isAr ? 'لم يُعيّن سائق بعد' : 'Unassigned'}</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs">
        <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-4">
          {isAr ? 'المسار الزمني للشحنة' : 'Shipment Timeline'}
        </h2>
        <Timeline statusHistory={ticket.status_history} currentStatus={ticket.status} />
      </div>

      {/* Ledger Audit Entries */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
          {isAr ? 'قيود دفتر الأستاذ لحساب الضمان (Ledger Entries)' : 'SafePay Ledger Entries'}
        </h2>

        {ledgerEntries.length === 0 ? (
          <div className="text-xs text-ink-muted py-4 text-center">
            {isAr ? 'لا توجد قيود أستاذ مسجلة بعد' : 'No ledger movements recorded yet'}
          </div>
        ) : (
          <div className="divide-y divide-line/60 text-xs">
            {ledgerEntries.map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-navy-900 uppercase">{entry.entry_type}</span>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    {formatDateTime(entry.created_at)}
                  </div>
                </div>
                <div className="font-mono font-bold text-navy-900">
                  {formatMoney(entry.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

