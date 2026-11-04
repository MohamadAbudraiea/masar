import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Truck, Star, Phone, ArrowUpRight } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import DataTable from '../../components/DataTable.jsx';
import { linkTo } from '../../lib/links.js';

export default function ManufacturerDrivers() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDrivers() {
      try {
        setLoading(true);
        const res = await apiClient('/me/drivers');
        setDrivers(res.items || []);
      } catch (err) {
        console.error('Failed to load drivers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDrivers();
  }, []);

  const columns = [
    {
      key: 'name',
      header: isAr ? 'السائق' : 'Driver',
      render: (val, row) => (
        <div>
          <span className="font-bold text-navy-900 hover:text-amber-600 transition flex items-center gap-1">
            {val}
            <ArrowUpRight className="h-3 w-3 text-ink-muted" />
          </span>
          <span className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" />
            <span dir="ltr">{row.phone}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'avg_rating',
      header: isAr ? 'التقييم العام' : 'Rating',
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          <span className="font-bold text-navy-900">{val || '5.0'}</span>
          <span className="text-ink-muted text-[10px]">({row.ratings_count || 0})</span>
        </div>
      ),
    },
    {
      key: 'truck',
      header: isAr ? 'نوع الشاحنة' : 'Truck & Equipment',
      render: (_, row) => (
        <div>
          <div className="font-medium text-navy-900">
            {row.type_name_en || 'Standard'} · {row.body_name_en || 'Flatbed'}
          </div>
          {row.plate_number && (
            <span className="text-[10px] text-ink-muted font-mono bg-surface px-1.5 py-0.5 rounded border border-line/60">
              {row.plate_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'trips_count',
      header: isAr ? 'الرحلات معك' : 'Trips with You',
      render: (val) => (
        <span className="font-bold text-navy-900">
          {val} {isAr ? 'شحنة' : 'shipments'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">
          {isAr ? 'سائقو شحناتي' : 'My Drivers'}
        </h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {isAr
            ? 'قائمة السائقين المعتمدين الذين نفذوا شحنات لمصنعك سابقاً'
            : 'Drivers who have accepted and completed deliveries for your company'}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        onRowClick={(row) => navigate(linkTo('manufacturer', 'driver', row.id))}
        emptyMessage={
          isAr
            ? 'لم يقم أي سائق بقبول شحنات لمصنعك حتى الآن'
            : 'No drivers have handled shipments for your company yet.'
        }
      />
    </div>
  );
}

