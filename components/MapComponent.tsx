import { useEffect, useRef } from 'react';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category: string;
  status: string;
  priority: string;
  verification_count: number;
  image_url: string;
  reporter_name: string;
}

interface MapComponentProps {
  markers: any[];
  onSelectMarker: (marker: any) => void;
  selectedMarker: any | null;
  flyToCoord: { latitude: number; longitude: number } | null;
}

export default function MapComponent({
  markers,
  onSelectMarker,
  selectedMarker,
  flyToCoord
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletMarkersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    // Dynamically import Leaflet inside useEffect to avoid Next.js SSR "window is not defined" error
    const L = require('leaflet');
    
    // Fix default marker icons configuration in Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    if (!mapContainerRef.current) return;

    // Instantiate map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [22.7196, 75.8577], // Center around Indore, India
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });

      // Use a beautiful dark Slate map theme matching our Intellistreet dashboard aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear old markers from map
    Object.values(leafletMarkersRef.current).forEach((m) => {
      map.removeLayer(m);
    });
    leafletMarkersRef.current = {};

    // Plot our interactive, color-coded markers
    markers.forEach((marker) => {
      // Pick marker color based on civic status
      let color = '#ef4444'; // red for pending
      if (marker.status === 'verified') color = '#f97316'; // orange for verified
      if (marker.status === 'assigned') color = '#eab308'; // amber for assigned
      if (marker.status === 'in_progress') color = '#3b82f6'; // blue for progress
      if (marker.status === 'resolved') color = '#10b981'; // green for resolved

      // Glowing circle marker design resembling active GIS telemetry
      const circleMarker = L.circleMarker([marker.latitude, marker.longitude], {
        radius: 9,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(map);

      // Create a gorgeous rich popup
      const popupContent = `
        <div style="min-width: 220px; font-family: system-ui, sans-serif; padding: 4px; color: #1e293b;">
          <h4 style="font-weight: 700; font-size: 14px; margin: 0 0 4px; color: #0f172a; line-height: 1.3;">${marker.title}</h4>
          <p style="font-size: 11px; color: #4B5563; margin: 0 0 8px;">
            ${marker.address}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background-color: ${color}20; color: ${color}; text-transform: uppercase;">
              ${marker.status.replace('_', ' ')}
            </span>
            <span style="font-size: 11px; color: #6b7280; font-weight: 600;">
              ✓ ${marker.verification_count} Votes
            </span>
          </div>
          <button id="view-details-btn-${marker.id}" style="width: 100%; text-align: center; border: none; background: #3b82f6; color: white; padding: 6px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
            Inspect Live Telemetry
          </button>
        </div>
      `;

      circleMarker.bindPopup(popupContent);

      // Setup click handlers
      circleMarker.on('popupopen', () => {
        const btn = document.getElementById(`view-details-btn-${marker.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            onSelectMarker(marker);
          });
        }
      });

      circleMarker.on('click', () => {
        onSelectMarker(marker);
      });

      leafletMarkersRef.current[marker.id] = circleMarker;
    });

    return () => {
      // Map cleanup on unmount handled gracefully
    };
  }, [markers, onSelectMarker]);

  // Handle Fly-To (Drone view) transitions when a coordinate changes
  useEffect(() => {
    if (!mapInstanceRef.current || !flyToCoord) return;
    
    const L = require('leaflet');
    mapInstanceRef.current.setView(
      [flyToCoord.latitude, flyToCoord.longitude],
      17, // Zoom in close for 3D drone effect
      {
        animate: true,
        duration: 2.2, // Smooth ease fly-over
        easeLinearity: 0.25
      }
    );
  }, [flyToCoord]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
    </div>
  );
}
