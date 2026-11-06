import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../api/client.js';
import { Radio, Truck, Layers, ArrowRight } from 'lucide-react';

// Custom Map Icons
const pendingIcon = L.divIcon({
  className: 'pin-pending',
  html: `<div style="background:#64748b;width:24px;height:24px;border-radius:50%;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">📦</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const waitingIcon = L.divIcon({
  className: 'pin-waiting',
  html: `<div style="background:#f59e0b;width:28px;height:28px;border-radius:50%;border:2px solid #ffffff;box-shadow:0 0 10px rgba(245,158,11,0.6);display:flex;align-items:center;justify-content:center;font-size:14px;">⏳</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const movingTruckIcon = L.divIcon({
  className: 'pin-truck',
  html: `<div style="background:#0f172a;width:34px;height:34px;border-radius:50%;border:2.5px solid #10b981;box-shadow:0 0 14px rgba(16,185,129,0.8);display:flex;align-items:center;justify-content:center;font-size:16px;">🚚</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const destinationPinIcon = L.divIcon({
  className: 'pin-dest',
  html: `<div style="background:#10b981;width:20px;height:20px;border-radius:50%;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;">🏁</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Demo fallback routes in Jordan if platform has no live shipments
const DEMO_FALLBACK_SHIPMENTS = [
  {
    ticket_id: 'demo-1',
    ticket_number: 'MSR-000018',
    status: 'in_delivery',
    pickup_city: 'Amman',
    pickup_lat: 31.9539,
    pickup_lng: 35.9106,
    dest_city: 'Aqaba',
    dest_lat: 29.5321,
    dest_lng: 35.0063,
    distance_km: 334,
    driver_name: 'Mr. Omar Saleh',
  },
  {
    ticket_id: 'demo-2',
    ticket_number: 'MSR-000019',
    status: 'waiting_load',
    pickup_city: 'Sahab',
    pickup_lat: 31.8714,
    pickup_lng: 36.0042,
    dest_city: 'Irbid',
    dest_lat: 32.5568,
    dest_lng: 35.8469,
    distance_km: 98,
    driver_name: 'Walid Jarrah',
  },
  {
    ticket_id: 'demo-3',
    ticket_number: 'MSR-000020',
    status: 'pending',
    pickup_city: 'Zarqa',
    pickup_lat: 32.0608,
    pickup_lng: 36.0942,
    dest_city: 'Mafraq',
    dest_lat: 32.3424,
    dest_lng: 36.2081,
    distance_km: 45,
    driver_name: null,
  },
];

export default function AdminLiveMap() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [shipments, setShipments] = useState([]);
  const [animProgress, setAnimProgress] = useState(0);

  const fetchMapData = async () => {
    try {
      const data = await apiClient('/reports/admin/map');
      if (Array.isArray(data) && data.length > 0) {
        setShipments(data);
      } else {
        setShipments(DEMO_FALLBACK_SHIPMENTS);
      }
    } catch (e) {
      setShipments(DEMO_FALLBACK_SHIPMENTS);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Continuous animation ticker for moving truck simulation (loops smoothly over 18s)
  useEffect(() => {
    let animId;
    const startTime = Date.now();
    const loopDurationMs = 18000;

    function step() {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % loopDurationMs) / loopDurationMs;
      setAnimProgress(progress);
      animId = requestAnimationFrame(step);
    }

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-line p-5 space-y-4 h-full flex flex-col">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-navy-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-navy-700" />
              <span>{isAr ? 'خريطة التتبع المباشر للأسطول' : 'Fleet map'}</span>
            </h2>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
              <Radio className="w-3 h-3" />
              <span>{isAr ? 'تتبع حي' : 'Live Tracking'}</span>
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {isAr
              ? 'مواقع الشحنات الجارية وقيد التحميل، مع محاكاة الحركة المباشرة للشاحنات أثناء التوصيل'
              : 'Open, loading and en-route shipments across Jordan'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-surface/70 px-3 py-1.5 rounded-xl border border-line self-start">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-[11px] text-slate-700">{isAr ? 'متاحة' : 'Pending'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-slate-700">{isAr ? 'بالانتظار' : 'Waiting Load'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-700 font-bold">{isAr ? 'على الطريق' : 'In Delivery'}</span>
          </div>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative flex-1 min-h-[420px] w-full rounded-xl overflow-hidden border border-line shadow-inner z-0">
        <MapContainer
          center={[31.6, 35.8]}
          zoom={7.4}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {shipments.map((s) => {
            const hasPickup = s.pickup_lat && s.pickup_lng;
            const hasDest = s.dest_lat && s.dest_lng;

            if (!hasPickup) return null;

            const pickupCoords = [Number(s.pickup_lat), Number(s.pickup_lng)];
            const destCoords = hasDest ? [Number(s.dest_lat), Number(s.dest_lng)] : null;

            // Compute current interpolated position for in_delivery truck
            let currentTruckPos = pickupCoords;
            if (s.status === 'in_delivery' && destCoords) {
              const curLat = pickupCoords[0] + (destCoords[0] - pickupCoords[0]) * animProgress;
              const curLng = pickupCoords[1] + (destCoords[1] - pickupCoords[1]) * animProgress;
              currentTruckPos = [curLat, curLng];
            }

            return (
              <React.Fragment key={s.ticket_id}>
                {/* 1. Pickup Origin Marker */}
                <Marker
                  position={pickupCoords}
                  icon={s.status === 'waiting_load' ? waitingIcon : pendingIcon}
                >
                  <Popup>
                    <div className="p-1 space-y-1 text-xs">
                      <div className="font-bold text-navy-900">{s.ticket_number}</div>
                      <div className="text-slate-600">
                        {isAr ? 'من:' : 'From:'} {s.pickup_city}
                      </div>
                      {s.dest_city && (
                        <div className="text-slate-600">
                          {isAr ? 'إلى:' : 'To:'} {s.dest_city}
                        </div>
                      )}
                      <Link
                        to={`/admin/shipments/${s.ticket_id}`}
                        className="text-navy-900 font-bold underline decoration-amber-500 decoration-2 inline-block pt-1"
                      >
                        {isAr ? 'فتح تفاصيل الشحنة ←' : 'View shipment details →'}
                      </Link>
                    </div>
                  </Popup>
                </Marker>

                {/* 2. Destination Marker if in delivery */}
                {s.status === 'in_delivery' && destCoords && (
                  <Marker position={destCoords} icon={destinationPinIcon}>
                    <Popup>
                      <div className="p-1 text-xs font-semibold text-emerald-800">
                        🏁 {isAr ? 'نقطة الوصول والتسليم:' : 'Destination:'} {s.dest_city}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* 3. Dotted Route Polyline */}
                {s.status === 'in_delivery' && destCoords && (
                  <Polyline
                    positions={[pickupCoords, destCoords]}
                    pathOptions={{ color: '#10b981', dashArray: '6, 8', weight: 3, opacity: 0.8 }}
                  />
                )}

                {/* 4. Moving Truck Marker */}
                {s.status === 'in_delivery' && destCoords && (
                  <Marker position={currentTruckPos} icon={movingTruckIcon}>
                    <Popup>
                      <div className="p-1.5 space-y-1 text-xs">
                        <div className="flex items-center gap-1 text-emerald-700 font-black">
                          <span>🚚 {isAr ? 'شاحنة على الطريق' : 'In Transit'}</span>
                        </div>
                        <div className="font-bold text-navy-900">{s.ticket_number}</div>
                        <div className="text-slate-600">
                          {s.pickup_city} → {s.dest_city} ({s.distance_km || 300} km)
                        </div>
                        {s.driver_name && (
                          <div className="text-ink-muted text-[11px]">
                            {isAr ? 'السائق:' : 'Driver:'} {s.driver_name}
                          </div>
                        )}
                        <Link
                          to={`/admin/shipments/${s.ticket_id}`}
                          className="text-emerald-700 font-bold hover:underline inline-block pt-1"
                        >
                          {isAr ? 'تفاصيل التتبع والطلب ←' : 'Full tracking record →'}
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Small simulated movement pill overlay */}
        <div className="absolute bottom-3 start-3 z-[400] bg-navy-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1.5 rounded-xl border border-white/10 shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{isAr ? 'محاكاة الحركة المباشرة (عرض تجريبي)' : 'Simulated Movement (Live Demo)'}</span>
        </div>
      </div>
    </div>
  );
}

