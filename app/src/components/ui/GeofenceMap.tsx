'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface GeofenceMapProps {
  lat: number;
  lng: number;
  radius: number;
  onChange: (data: { lat: number; lng: number; radius: number }) => void;
  readOnly?: boolean;
}

export default function GeofenceMap({ lat, lng, radius, onChange, readOnly = false }: GeofenceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dynamic import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      LRef.current = L;
      // Fix default marker icon issues in Webpack/Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !LRef.current) return;

    const L = LRef.current;

    // Initialize map
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([lat, lng], 15);
      
      // Use clean, neutral voyager tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(leafletMap.current);

      // Create marker
      markerRef.current = L.marker([lat, lng], {
        draggable: !readOnly
      }).addTo(leafletMap.current);

      // Create circle
      circleRef.current = L.circle([lat, lng], {
        radius: radius,
        color: '#fa972d', // User preference theme color
        fillColor: '#fa972d',
        fillOpacity: 0.15,
        weight: 2
      }).addTo(leafletMap.current);

      if (!readOnly) {
        // Drag marker event
        markerRef.current.on('dragend', () => {
          const position = markerRef.current.getLatLng();
          circleRef.current.setLatLng(position);
          onChange({ lat: position.lat, lng: position.lng, radius });
        });

        // Click map event to relocate marker
        leafletMap.current.on('click', (e: any) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          markerRef.current.setLatLng([clickLat, clickLng]);
          circleRef.current.setLatLng([clickLat, clickLng]);
          onChange({ lat: clickLat, lng: clickLng, radius });
        });
      }
    } else {
      // Update map view, marker, circle if props change
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - lat) > 0.00001 || Math.abs(currentPos.lng - lng) > 0.00001) {
        const newLatLng = new L.LatLng(lat, lng);
        markerRef.current.setLatLng(newLatLng);
        circleRef.current.setLatLng(newLatLng);
        leafletMap.current.panTo(newLatLng);
      }
      circleRef.current.setRadius(radius);
    }
  }, [isLoaded, lat, lng, radius, readOnly, onChange]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-elevated)',
          color: 'var(--text-3)',
          fontSize: 'var(--text-sm)',
          zIndex: 10,
          borderRadius: 'var(--radius-md)'
        }}>
          Loading Map...
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)', zIndex: 1 }} />
    </div>
  );
}
