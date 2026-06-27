'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Zap, Layers, Globe, Compass, Eye, ShieldAlert } from 'lucide-react';

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
  description?: string;
  address?: string;
}

interface MapComponentProps {
  markers: MapMarker[];
  onSelectMarker: (marker: any) => void;
  selectedMarker: any | null;
  flyToCoord: { latitude: number; longitude: number } | null;
}

declare global {
  interface Window {
    mappls: any;
    inspectTelemetry: (id: string) => void;
  }
}

export default function MapComponent({
  markers,
  onSelectMarker,
  selectedMarker,
  flyToCoord
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Script loaded and active state
  const [mapplsLoaded, setMapplsLoaded] = useState(false);
  const [mapplsActive, setMapplsActive] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'roadmap' | 'hybrid'>('standard');
  const [showSmartGrid, setShowSmartGrid] = useState(true);

  // Cinematic Google Earth Zoom & Plunge states
  const [isCinematicZooming, setIsCinematicZooming] = useState(false);
  const [cinematicAltitude, setCinematicAltitude] = useState(100000); // meters
  const [showPhotoOverlay, setShowPhotoOverlay] = useState(false);

  // Ref to track if cinematic zooming is active
  const isCinematicZoomingRef = useRef(false);

  useEffect(() => {
    isCinematicZoomingRef.current = isCinematicZooming;
  }, [isCinematicZooming]);

  // Leaflet smooth Google Earth zoom transition
  const startSatelliteZoomTransition = (lat: number, lng: number, marker: any) => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Cancel any previous animation/listeners
    if ((map as any)._zoomListener) {
      map.off('zoom move', (map as any)._zoomListener);
    }
    if ((map as any)._moveEndListener) {
      map.off('moveend', (map as any)._moveEndListener);
    }

    // Trigger cinematic overlay with space overview altitude
    setIsCinematicZooming(true);
    setCinematicAltitude(350000); // Orbit level
    setShowPhotoOverlay(false);

    // Beautiful continuous native flyTo from current map position to deep target zoom
    map.flyTo([lat, lng], 18, {
      animate: true,
      duration: 4.5, // Majestic majestic flight duration
      easeLinearity: 0.15 // Smooth orbital easing curve
    });

    // Real-time altitude calculation based on current zoom level during flight
    const zoomListener = () => {
      const z = map.getZoom();
      const currentZ = typeof z === 'number' ? z : 13;
      const alt = Math.round(100 * Math.pow(2, 18 - currentZ));
      setCinematicAltitude(alt);
    };

    map.on('zoom move', zoomListener);
    (map as any)._zoomListener = zoomListener;

    // When the swoop descent finishes
    const moveEndListener = () => {
      setIsCinematicZooming(false);
      setShowPhotoOverlay(true);
      onSelectMarker(marker);

      // Cleanup
      map.off('moveend', moveEndListener);
      if ((map as any)._zoomListener) {
        map.off('zoom move', (map as any)._zoomListener);
        (map as any)._zoomListener = null;
      }
    };

    map.on('moveend', moveEndListener);
    (map as any)._moveEndListener = moveEndListener;
  };

  // Mappls smooth Google Earth zoom transition
  const startMapplsSatelliteZoomTransition = (lat: number, lng: number, marker: any) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    setIsCinematicZooming(true);
    setShowPhotoOverlay(false);
    setCinematicAltitude(350000);

    try {
      // Quietly set initial overview zoom
      map.setZoom(6);
      map.panTo({ lat, lng });

      let currentZoom = 6.0;
      const targetZoom = 17.0;
      const duration = 4000; // 4 seconds flight
      const startTime = performance.now();

      const animateZoom = (now: number) => {
        if (!isCinematicZoomingRef.current) return;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Classic cubic ease-in-out curve
        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const zoom = 6 + (targetZoom - 6) * ease;
        map.setZoom(zoom);

        const alt = Math.round(100 * Math.pow(2, 18 - zoom));
        setCinematicAltitude(alt);

        if (progress < 1) {
          requestAnimationFrame(animateZoom);
        } else {
          map.setZoom(targetZoom);
          setIsCinematicZooming(false);
          setShowPhotoOverlay(true);
          onSelectMarker(marker);
        }
      };

      requestAnimationFrame(animateZoom);
    } catch (e) {
      console.warn("[Mappls Cinematic] Failed:", e);
      setIsCinematicZooming(false);
      onSelectMarker(marker);
    }
  };

  // References to map and markers
  const mapInstanceRef = useRef<any>(null); // Leaflet or Mappls Map Instance
  const mapplsMarkersRef = useRef<any[]>([]);
  const mapplsPolylinesRef = useRef<any[]>([]);
  const leafletMarkersRef = useRef<Record<string, any>>({});
  const leafletPolylinesRef = useRef<any[]>([]);
  const tileLayerRef = useRef<any>(null);

  const mapplsKey = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;

  // Global Telemetry Handler Hook for Leaflet HTML elements
  useEffect(() => {
    window.inspectTelemetry = (id: string) => {
      const marker = markers.find((m) => m.id === id);
      if (marker) {
        onSelectMarker(marker);
      }
    };
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).inspectTelemetry = undefined;
      }
    };
  }, [markers, onSelectMarker]);

  // Keep photo overlay state in sync with external selection changes
  useEffect(() => {
    if (!selectedMarker) {
      setTimeout(() => {
        setShowPhotoOverlay(false);
      }, 0);
    }
  }, [selectedMarker]);

  // 1. Dynamic Script Loader for Mappls Web Map SDK v3.0
  useEffect(() => {
    if (!mapplsKey) {
      console.log("[Mappls Map] Key not found, using Leaflet fallback mode.");
      setTimeout(() => {
        setMapplsActive(false);
      }, 0);
      return;
    }

    const scriptUrl = `https://apis.mappls.com/advanced.js?v=3.0&key=${mapplsKey}`;
    
    // Check if script already loaded
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      setTimeout(() => {
        setMapplsLoaded(true);
        setMapplsActive(true);
      }, 0);
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("[Mappls Map] Web SDK script loaded successfully.");
      setMapplsLoaded(true);
      setMapplsActive(true);
    };
    script.onerror = (err) => {
      console.warn("[Mappls Map] Script failed to load:", err);
      setMapplsActive(false);
    };

    document.head.appendChild(script);
  }, [mapplsKey]);

  // 2. Map Initialization Loop (Mappls OR Leaflet Fallback)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // A. MAPPLS MAP INITIALIZATION (IF ACTIVE)
    if (mapplsActive && mapplsLoaded && window.mappls) {
      console.log("[Mappls Map] Initializing Mappls Engine...");
      
      // Clean up previous Leaflet instance if it exists
      if (mapInstanceRef.current && typeof mapInstanceRef.current.remove === 'function' && !mapInstanceRef.current._mapplsMap) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("[Mappls Map] Failed to remove Leaflet map:", e);
        }
        mapInstanceRef.current = null;
      }

      if (!mapInstanceRef.current || !mapInstanceRef.current._mapplsMap) {
        try {
          window.mappls.initialize(mapplsKey, () => {
            if (!mapContainerRef.current) return;
            
            const map = new window.mappls.Map(mapContainerRef.current, {
              center: [22.7196, 75.8577], // Center on Indore, India
              zoom: 13,
              zoomControl: true,
              hybrid: mapStyle === 'hybrid'
            });

            map._mapplsMap = true; // flag to distinguish
            mapInstanceRef.current = map;
            renderMapplsFeatures(map);
          });
        } catch (err) {
          console.warn("[Mappls Map] Failed to initialize map instance:", err);
          initLeaflet();
        }
      } else {
        renderMapplsFeatures(mapInstanceRef.current);
      }
    } else {
      // B. LEAFLET FALLBACK MAP INITIALIZATION
      initLeaflet();
    }

    function initLeaflet() {
      console.log("[Leaflet Map] Initializing Fallback Engine...");
      const L = require('leaflet');
      
      // Fix default marker icons configuration in Leaflet
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current || mapInstanceRef.current._mapplsMap) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          center: [22.7196, 75.8577], // Indore
          zoom: 13,
          zoomControl: true,
          attributionControl: false
        });
      }

      // Add dynamic high-fidelity tiles based on active style selection
      if (tileLayerRef.current) {
        try {
          mapInstanceRef.current.removeLayer(tileLayerRef.current);
        } catch (e) {
          console.warn(e);
        }
      }

      let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      if (mapStyle === 'standard') {
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      } else if (mapStyle === 'roadmap') {
        url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Detailed roadmap: street names, shops, traffic, lanes, lights
      } else if (mapStyle === 'hybrid') {
        url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // Detailed hybrid satellite with names, shops, and lanes overlay
      }

      tileLayerRef.current = L.tileLayer(url, {
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      renderLeafletFeatures(mapInstanceRef.current);
    }

    // --- Render Mappls Markers and Polylines ---
    function renderMapplsFeatures(map: any) {
      if (!window.mappls) return;

      // 1. Clean previous Mappls markers
      mapplsMarkersRef.current.forEach((m) => {
        if (m && typeof m.remove === 'function') m.remove();
      });
      mapplsMarkersRef.current = [];

      // 2. Clean previous Mappls Polylines
      mapplsPolylinesRef.current.forEach((p) => {
        if (p && typeof p.remove === 'function') p.remove();
      });
      mapplsPolylinesRef.current = [];

      // 3. Render Markers
      const coordsForGrid: any[] = [];
      markers.forEach((marker) => {
        let color = '#ef4444'; // red for pending
        let markerIconUrl = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red.png';
        if (marker.status === 'verified') {
          color = '#f97316';
          markerIconUrl = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_orange.png';
        }
        if (marker.status === 'assigned') {
          color = '#eab308';
          markerIconUrl = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_yellow.png';
        }
        if (marker.status === 'in_progress') {
          color = '#3b82f6';
          markerIconUrl = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_blue.png';
        }
        if (marker.status === 'resolved') {
          color = '#10b981';
          markerIconUrl = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_green.png';
        }

        const popupContent = `
          <div style="min-width: 220px; font-family: system-ui, sans-serif; padding: 6px; color: #1e293b; background: white; border-radius: 12px;">
            <h4 style="font-weight: 700; font-size: 14px; margin: 0 0 4px; color: #0f172a; line-height: 1.3;">${marker.title}</h4>
            <p style="font-size: 11px; color: #4B5563; margin: 0 0 8px;">
              ${marker.address || 'Indore Smart Grid Zone'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background-color: ${color}20; color: ${color}; text-transform: uppercase;">
                ${marker.status.replace('_', ' ')}
              </span>
              <span style="font-size: 11px; color: #10b981; font-weight: 700;">
                Mappls Verified
              </span>
            </div>
            <button onclick="if(window.inspectTelemetry){ window.inspectTelemetry('${marker.id}'); }" style="width: 100%; border: none; background: #10b981; color: white; padding: 6px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer;">
              Inspect Telemetry
            </button>
          </div>
        `;

        try {
          const mMarker = new window.mappls.Marker({
            map: map,
            position: {
              lat: marker.latitude,
              lng: marker.longitude
            },
            icon_url: markerIconUrl,
            width: 28,
            height: 44,
            popupHtml: popupContent,
            fitbounds: false
          });

          mMarker.addListener('click', () => {
            if (isCinematicZoomingRef.current) return;
            onSelectMarker(marker);
            setTimeout(() => {
              setShowPhotoOverlay(true);
            }, 0);
          });

          mapplsMarkersRef.current.push(mMarker);

          if (showSmartGrid && (marker.category === 'street_light_failure' || marker.category === 'electrical_hazard' || marker.category === 'drainage_problem')) {
            coordsForGrid.push({ lat: marker.latitude, lng: marker.longitude });
          }
        } catch (e) {
          console.warn("[Mappls Marker] Failed to plot marker:", e);
        }
      });

      // 4. Draw Streetlight connection lines (Intellistreet GIS Smart Grid Layer)
      if (showSmartGrid && coordsForGrid.length > 1) {
        try {
          const poly = new window.mappls.Polyline({
            map: map,
            paths: coordsForGrid,
            strokeColor: '#2dd4bf', // Teal smart-grid color
            strokeOpacity: 0.75,
            strokeWeight: 3
          });
          mapplsPolylinesRef.current.push(poly);
        } catch (e) {
          console.warn("[Mappls Polyline] Failed to draw grid:", e);
        }
      }
    }

    // --- Render Leaflet Fallback Features ---
    function renderLeafletFeatures(map: any) {
      const L = require('leaflet');

      // Clear old Leaflet markers
      Object.values(leafletMarkersRef.current).forEach((m) => {
        map.removeLayer(m);
      });
      leafletMarkersRef.current = {};

      // Clear old Leaflet polylines
      leafletPolylinesRef.current.forEach((p) => {
        map.removeLayer(p);
      });
      leafletPolylinesRef.current = [];

      const coordsForGrid: [number, number][] = [];

      markers.forEach((marker) => {
        let color = '#ef4444'; // red for pending
        if (marker.status === 'verified') color = '#f97316';
        if (marker.status === 'assigned') color = '#eab308';
        if (marker.status === 'in_progress') color = '#3b82f6';
        if (marker.status === 'resolved') color = '#10b981';

        const circleMarker = L.circleMarker([marker.latitude, marker.longitude], {
          radius: 9,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95
        }).addTo(map);

        const popupContent = `
          <div style="min-width: 220px; font-family: system-ui, sans-serif; padding: 4px; color: #1e293b;">
            <h4 style="font-weight: 700; font-size: 14px; margin: 0 0 4px; color: #0f172a; line-height: 1.3;">${marker.title}</h4>
            <p style="font-size: 11px; color: #4B5563; margin: 0 0 8px;">
              ${marker.address || 'Indore Smart Grid Zone'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background-color: ${color}20; color: ${color}; text-transform: uppercase;">
                ${marker.status.replace('_', ' ')}
              </span>
              <span style="font-size: 11px; color: #6b7280; font-weight: 600;">
                ✓ ${marker.verification_count || 0} Votes
              </span>
            </div>
            <button onclick="if(window.inspectTelemetry){ window.inspectTelemetry('${marker.id}'); }" style="width: 100%; text-align: center; border: none; background: #3b82f6; color: white; padding: 7px 10px; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
              Inspect Live Telemetry
            </button>
          </div>
        `;

        circleMarker.bindPopup(popupContent);

        circleMarker.on('click', () => {
          if (isCinematicZoomingRef.current) return;
          onSelectMarker(marker);
          setTimeout(() => {
            setShowPhotoOverlay(true);
          }, 0);
        });

        leafletMarkersRef.current[marker.id] = circleMarker;

        if (showSmartGrid && (marker.category === 'street_light_failure' || marker.category === 'electrical_hazard' || marker.category === 'drainage_problem')) {
          coordsForGrid.push([marker.latitude, marker.longitude]);
        }
      });

      // Draw Leaflet Smart grid lines
      if (showSmartGrid && coordsForGrid.length > 1) {
        const polyline = L.polyline(coordsForGrid, {
          color: '#2dd4bf', // Teal electrical line
          weight: 3,
          opacity: 0.6,
          dashArray: '10, 10' // Dashed high-voltage line look
        }).addTo(map);
        leafletPolylinesRef.current.push(polyline);
      }
    }
  }, [markers, mapplsActive, mapplsLoaded, showSmartGrid, mapStyle]);

  // 3. Handle Map Style Switching (Leaflet or Mappls)
  useEffect(() => {
    if (mapplsActive && mapInstanceRef.current && typeof mapInstanceRef.current.setStyle === 'function') {
      try {
        console.log(`[Mappls Style] Switching to ${mapStyle} mode.`);
        mapInstanceRef.current.setStyle(mapStyle === 'hybrid' ? 'hybrid' : 'standard');
      } catch (err) {
        console.warn("[Mappls Style] Error switching style:", err);
      }
    } else if (mapInstanceRef.current && !mapInstanceRef.current._mapplsMap) {
      // Leaflet Live Style Switching without destroying the frame!
      const L = require('leaflet');
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }

      let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      if (mapStyle === 'standard') {
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      } else if (mapStyle === 'roadmap') {
        url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Detailed roadmap: street names, shops, traffic, lanes, lights
      } else if (mapStyle === 'hybrid') {
        url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // Detailed hybrid satellite with names, shops, and lanes overlay
      }

      tileLayerRef.current = L.tileLayer(url, {
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }
  }, [mapStyle, mapplsActive]);

  // 4. Handle Fly-To (Quiet / Normal zoom-in from external triggers)
  useEffect(() => {
    if (!mapInstanceRef.current || !flyToCoord) return;

    // If already in cinematic zooming (triggered directly on the map), ignore external triggers
    if (isCinematicZoomingRef.current) {
      console.log("[Fly-To] Ignoring external flyTo because cinematic zoom is active.");
      return;
    }

    if (mapplsActive && mapInstanceRef.current._mapplsMap) {
      // Mappls panTo implementation
      try {
        mapInstanceRef.current.panTo({
          lat: flyToCoord.latitude,
          lng: flyToCoord.longitude
        });
        mapInstanceRef.current.setZoom(17);
      } catch (e) {
        console.warn("[Mappls panTo] Failed:", e);
      }
    } else {
      // Leaflet implementation - quiet standard pan/zoom with no dramatic space overlays
      const L = require('leaflet');
      try {
        setTimeout(() => {
          setIsCinematicZooming(false);
          setShowPhotoOverlay(true);
        }, 0);

        mapInstanceRef.current.flyTo(
          [flyToCoord.latitude, flyToCoord.longitude],
          18, // deep street level zoom
          {
            animate: true,
            duration: 1.5
          }
        );
      } catch (e) {
        console.warn("[Leaflet flyTo] Failed:", e);
      }
    }
  }, [flyToCoord, mapplsActive]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
      
      {/* Dynamic Keyframes Styling Injection Block */}
      <style>{`
        @keyframes cloud-drift {
          0% { transform: scale(0.8) translate(-5%, -5%); opacity: 0; filter: blur(25px); }
          35% { opacity: 0.95; filter: blur(10px); }
          65% { opacity: 0.95; filter: blur(10px); }
          100% { transform: scale(1.8) translate(12%, 12%); opacity: 0; filter: blur(35px); }
        }
        @keyframes lens-shudder {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          12% { transform: translate(-3px, 1.5px) rotate(-0.6deg); }
          24% { transform: translate(1.5px, -1.5px) rotate(0.6deg); }
          36% { transform: translate(-1.5px, 2.5px) rotate(0deg); }
          48% { transform: translate(1.5px, 1.5px) rotate(0.6deg); }
          60% { transform: translate(-1.5px, -1.5px) rotate(-0.6deg); }
          72% { transform: translate(2.5px, 1.5px) rotate(0deg); }
          84% { transform: translate(-1.5px, 1.5px) rotate(0.6deg); }
        }
        @keyframes scanline-roll {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-cloud-break {
          animation: cloud-drift 2.2s ease-in-out forwards;
        }
        .animate-shudder {
          animation: lens-shudder 0.15s infinite alternate;
        }
        .scanline::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05));
          z-index: 20000;
          background-size: 100% 3px, 4px 100%;
          pointer-events: none;
        }
        .scanline-light::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(255, 255, 255, 0.05) 50%);
          z-index: 20000;
          background-size: 100% 4px;
          pointer-events: none;
          animation: scanline-roll 8s linear infinite;
        }
      `}</style>

      {/* Map Canvas div element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px] bg-slate-950" id="mappls-map-canvas" />

      {/* 1. Cinematic Atmospheric Plunge Overlay (Google Earth Mode) */}
      {isCinematicZooming && (
        <div className="absolute inset-0 z-[10000] bg-black/40 pointer-events-none flex flex-col items-center justify-between p-8 overflow-hidden scanline animate-shudder">
          
          {/* Top Telemetry Display */}
          <div className="w-full max-w-md bg-[#070a13]/95 border border-emerald-500/30 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <div>
                <p className="text-[9px] font-mono font-bold text-red-400 tracking-wider uppercase">LIVE ORBITAL PLUNGE</p>
                <p className="text-xs font-bold text-white uppercase truncate max-w-[180px]">
                  {selectedMarker?.title || 'Inspecting Node'}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[9px] text-gray-400">
              <p>LAT: {flyToCoord?.latitude.toFixed(5)}</p>
              <p>LNG: {flyToCoord?.longitude.toFixed(5)}</p>
            </div>
          </div>

          {/* Cloud breakthrough mist effects */}
          {cinematicAltitude < 65000 && cinematicAltitude > 5000 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[4px] transition-all duration-300">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent animate-cloud-break" />
            </div>
          )}

          {/* Mid altitude crosshair */}
          <div className="relative w-40 h-40 border border-emerald-500/20 rounded-full flex items-center justify-center">
            <div className="w-28 h-28 border border-dashed border-emerald-500/30 rounded-full animate-spin [animation-duration:12s]" />
            <div className="absolute w-8 h-0.5 bg-emerald-500/60" />
            <div className="absolute h-8 w-0.5 bg-emerald-500/60" />
            
            <div className="absolute text-[9px] font-mono text-emerald-400 font-bold -top-8 bg-slate-950/90 px-2 py-0.5 rounded-full border border-emerald-500/15">
              TELEMETRY LOCK
            </div>
          </div>

          {/* Bottom telemetry stats logs */}
          <div className="w-full max-w-md bg-[#070a13]/95 border border-emerald-500/30 p-4 rounded-2xl backdrop-blur-md mb-4 flex justify-between items-center font-mono">
            <div>
              <p className="text-[9px] text-gray-500 tracking-wider">ALTITUDE</p>
              <p className="text-xl font-bold text-emerald-400">
                {cinematicAltitude.toLocaleString()} m
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 tracking-wider">DESCENT SPEED</p>
              <p className="text-xs font-bold text-emerald-400 uppercase animate-pulse">
                {cinematicAltitude > 12000 ? 'Orbital Drop' : 'Decelerating'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Google Earth Citizen Photo Card Overlay */}
      {showPhotoOverlay && selectedMarker && (
        <div className="absolute bottom-4 left-4 z-[9998] max-w-sm w-80 bg-[#0c101d]/95 backdrop-blur-md border border-emerald-500/30 p-4 rounded-3xl shadow-2xl flex flex-col gap-3 transition-all duration-300 transform translate-y-0 opacity-100">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Drone Lens Lock
              </span>
            </div>
            <button
              onClick={() => setShowPhotoOverlay(false)}
              className="text-gray-400 hover:text-white text-sm bg-slate-850/80 hover:bg-slate-750 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Immersive Citizen Upload Photo Bubble with premium frame */}
          <div className="relative h-44 rounded-2xl overflow-hidden border border-gray-800 bg-slate-950 shadow-inner">
            <img
              src={selectedMarker.image_url || `https://picsum.photos/seed/street_${selectedMarker.id}/800/600`}
              alt={selectedMarker.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 to-transparent p-3 flex justify-between items-end">
              <div>
                <p className="text-[9px] text-gray-400 tracking-wider">FIELD SOURCE</p>
                <p className="text-xs font-bold text-white truncate max-w-[140px]">
                  {selectedMarker.reporter_name || 'Citizen Reporter'}
                </p>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase border border-emerald-500/20 tracking-wider">
                Verified
              </span>
            </div>
          </div>

          {/* Details / Telemetry summary */}
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white leading-tight">{selectedMarker.title}</h4>
            <p className="text-[11px] text-gray-400 leading-normal">
              {selectedMarker.description || 'Verified on-site telemetry. Active municipal GIS monitoring node lock.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-gray-800/60 pt-2">
            <div className="bg-slate-900/60 p-2 rounded-lg border border-gray-800">
              <p className="text-gray-500 tracking-wider">STREET ZONE</p>
              <p className="text-gray-300 font-bold truncate">
                {selectedMarker.address || 'Indore Smart Grid'}
              </p>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-gray-800">
              <p className="text-gray-500 tracking-wider">CONFIRMATIONS</p>
              <p className="text-emerald-400 font-bold">
                ✓ {selectedMarker.verification_count || 1} Votes
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (mapplsActive) {
                startMapplsSatelliteZoomTransition(selectedMarker.latitude, selectedMarker.longitude, selectedMarker);
              } else {
                startSatelliteZoomTransition(selectedMarker.latitude, selectedMarker.longitude, selectedMarker);
              }
            }}
            className="w-full mt-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-450 text-[#070a13] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles size={13} /> Inspect Live Telemetry
          </button>
        </div>
      )}

      {/* Floating Modern Interactive GIS Layer Switcher Overlay (Universal style modes & streetlight layer) */}
      <div className="absolute top-4 right-4 z-[9999] bg-[#0c101d]/90 backdrop-blur-md border border-gray-800 p-4 rounded-2xl shadow-xl max-w-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${mapplsActive ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400 animate-pulse'}`} />
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
              {mapplsActive ? 'Mappls GIS Engine' : 'Live GIS Leaflet'}
            </span>
          </div>
          <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 uppercase font-mono">
            V3.0
          </span>
        </div>

        {/* Global style switcher for both engines! */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">GIS Map Style</span>
          <div className="grid grid-cols-3 gap-1 bg-[#1a2035]/60 p-1 rounded-xl border border-gray-800">
            <button
              type="button"
              onClick={() => setMapStyle('standard')}
              className={`px-1.5 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                mapStyle === 'standard' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Slate
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('roadmap')}
              className={`px-1.5 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                mapStyle === 'roadmap' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Roads
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('hybrid')}
              className={`px-1.5 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                mapStyle === 'hybrid' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {!mapplsActive ? (
          <p className="text-[10px] text-gray-400 leading-normal">
            Equipped with high-resolution satellite imagery layers, streets, lanes, shops, & live telemetry overlay.
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 leading-normal">
            High-fidelity Mappls vector engine layers active.
          </p>
        )}

        {/* Universal Layer Toggle - Streetlight connection grid lines */}
        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between gap-4">
          <span className="text-[10px] font-bold text-gray-300">Streetlight Power Grid Layer</span>
          <button
            type="button"
            onClick={() => setShowSmartGrid((prev) => !prev)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${showSmartGrid ? 'bg-teal-500' : 'bg-slate-800'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showSmartGrid ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
