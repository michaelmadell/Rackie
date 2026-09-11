import React, { useState } from 'react';
import { Box, Tooltip } from '@chakra-ui/react';

/**
 * Patchdocs-accurate Port SVG Icons
 * Exact SVG paths and polygon geometries reverse-engineered from app.patchdocs.io.
 * Supports RJ45 (top/bottom orientation), SFP/SFP+, Fiber LC, USB-A, USB-C, HDMI, DP, VGA, PS2, Audio, C13/C14, C19/C20, Console.
 */
export function PortSvg({
  type = 'rj45',
  orientation = 'top', // 'top' or 'bottom' (inverts RJ45 notch)
  isConnected = false,
  cableColor = '#3182CE',
  isDrafting = false,
  isHighlighted = false,
  isHoveredEmpty = false,
  width = 14,
  height = 11,
}) {
  const normType = (type || 'rj45').toLowerCase();

  // Amulet Hotkey theme: highlight is coral (#ff745b), hover empty is teal (#3d9e99), connected is cableColor
  const baseColor = isHighlighted
    ? '#ff745b'
    : isHoveredEmpty
    ? '#3d9e99'
    : isDrafting
    ? '#48BB78'
    : isConnected
    ? cableColor
    : '#CBD5E0';

  const fillColor = isConnected || isHighlighted || isHoveredEmpty ? baseColor : '#A0AEC0';
  const innerBg = '#1A202C';

  switch (normType) {
    case 'rj45':
    case 'ethernet':
    case 'cat6':
    case 'copper': {
      // Patchdocs RJ45: 11 x 9
      const isBottom = orientation === 'bottom';
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 11 9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          {isBottom ? (
            // Bottom row (inverted notch facing down)
            <polygon
              points="11 0 11 7 7.7 7 7.7 9 3.3 9 3.3 7 0 7 0 0"
              fill={fillColor}
              stroke={isHighlighted ? '#FF8C00' : isHoveredEmpty ? '#3182CE' : 'none'}
              strokeWidth="0.5"
            />
          ) : (
            // Top row (standard notch facing up)
            <polygon
              points="11 9 11 2 7.7 2 7.7 0 3.3 0 3.3 2 0 2 0 9"
              fill={fillColor}
              stroke={isHighlighted ? '#FF8C00' : isHoveredEmpty ? '#3182CE' : 'none'}
              strokeWidth="0.5"
            />
          )}
          {isConnected && (
            <circle
              cx="5.5"
              cy="4.5"
              r="2"
              fill={isHighlighted ? '#FF8C00' : cableColor}
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
          )}
        </svg>
      );
    }

    case 'sfp':
    case 'sfp_plus':
    case 'sfp+':
    case 'qsfp':
    case 'qsfp28':
      // Patchdocs SFP Cage: 11 x 9 rectangle
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 11 9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <rect
            x="0.5"
            y="0.5"
            width="10"
            height="8"
            rx="0.5"
            fill={fillColor}
            stroke={isHighlighted ? '#FF8C00' : isHoveredEmpty ? '#3182CE' : '#4A5568'}
            strokeWidth="0.8"
          />
          {isConnected && (
            <circle
              cx="5.5"
              cy="4.5"
              r="2"
              fill={isHighlighted ? '#FF8C00' : cableColor}
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
          )}
        </svg>
      );

    case 'sfp_rj45':
    case 'sfp-copper':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 11 9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <path
            d="M11,0 L11,9 L0,9 L0,0 L11,0 Z M6.9,1 L4.1,1 L4.1,2.3333 L2,2.3333 L2,7 L9,7 L9,2.3333 L6.9,2.3333 L6.9,1 Z"
            fill={fillColor}
          />
        </svg>
      );

    case 'fiber_lc':
    case 'fiber':
    case 'optical':
    case 'lc':
    case 'sc':
      // Patchdocs Direct Optical / Fiber LC: 12 x 8
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <path
            d="M12,0 L12,8 L0,8 L0,0 L12,0 Z M5.5,2 L1.5,2 L1.5,6 L5.5,6 L5.5,2 Z M10.5,2 L6.5,2 L6.5,6 L10.5,6 L10.5,2 Z M3.5,3 C4.0523,3 4.5,3.4477 4.5,4 C4.5,4.5523 4.0523,5 3.5,5 C2.9477,5 2.5,4.5523 2.5,4 C2.5,3.4477 2.9477,3 3.5,3 Z M8.5,3 C9.0523,3 9.5,3.4477 9.5,4 C9.5,4.5523 9.0523,5 8.5,5 C7.9477,5 7.5,4.5523 7.5,4 C7.5,3.4477 7.9477,3 8.5,3 Z"
            fill={fillColor}
          />
          {isConnected && (
            <circle
              cx="6"
              cy="4"
              r="2"
              fill={isHighlighted ? '#FF8C00' : cableColor}
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
          )}
        </svg>
      );

    case 'usb_c':
    case 'usb-c':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 12 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <path
            d="M9,0 C10.6568542,-4.4408921e-16 12,1.34314575 12,3 C12,4.65685425 10.6568542,6 9,6 L3,6 C1.34314575,6 0,4.65685425 0,3 C0,1.34314575 1.34314575,0 3,0 L9,0 Z M9.75,2.25 L2.25,2.25 C1.83578644,2.25 1.5,2.58578644 1.5,3 C1.5,3.41421356 1.83578644,3.75 2.25,3.75 L9.75,3.75 C10.1642136,3.75 10.5,3.41421356 10.5,3 C10.5,2.58578644 10.1642136,2.25 9.75,2.25 Z"
            fill={fillColor}
          />
        </svg>
      );

    case 'usb':
    case 'usb_a':
    case 'usb-a':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <path
            d="M12,0 L12,8 L0,8 L0,0 L12,0 Z M9,5 L7,5 L7,6 L9,6 L9,5 Z M5,5 L3,5 L3,6 L5,6 L5,5 Z M10,2 L2,2 L2,4 L10,4 L10,2 Z"
            fill={fillColor}
          />
        </svg>
      );

    case 'hdmi':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 12 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <path
            d="M11.25,0 C11.6642136,0 12,0.383755929 12,0.857142857 L12,4.28571429 C12,4.75910121 11.6642136,5.14285714 11.25,5.14285714 L10.5,5.14285714 C10.5,5.61624407 10.1642136,6 9.75,6 L2.25,6 C1.83578644,6 1.5,5.61624407 1.5,5.14285714 L0.75,5.14285714 C0.335786438,5.14285714 0,4.75910121 0,4.28571429 L0,0.857142857 C0,0.417569281 0.289530143,0.0552795766 0.662534156,0.00576662685 L0.75,0 L11.25,0 Z M10.125,2.57142857 L1.875,2.57142857 C1.66789322,2.57142857 1.5,2.76330654 1.5,3 C1.5,3.23669346 1.66789322,3.42857143 1.875,3.42857143 L10.125,3.42857143 C10.3321068,3.42857143 10.5,3.23669346 10.5,3 C10.5,2.76330654 10.3321068,2.57142857 10.125,2.57142857 Z"
            fill={fillColor}
          />
        </svg>
      );

    case 'dp':
    case 'displayport':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 12 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <path
            d="M11.25,0 C11.664225,0 12,0.447715 12,1 L12,5 C12,5.55228 11.664225,6 11.25,6 L1.0606575,6 C0.86175,6 0.67098225,5.89464 0.53033025,5.70711 L0.375,5.5 L0.21966975,5.29289 C0.07901775,5.10536 0,4.851 0,4.58579 L0,1 C0,0.447715 0.33578625,0 0.75,0 L11.25,0 Z M10,3 L2,3 C1.97828094,3 1.95688531,3.0013848 1.9358966,3.00407093 L1.875,3 C1.66789322,3 1.5,3.16789322 1.5,3.375 L1.5,4.625 C1.5,4.83210678 1.66789322,5 1.875,5 C2.08210678,5 2.25,4.83210678 2.25,4.625 L2.25,4 L9.75,4 L9.75,4.625 C9.75,4.83210678 9.91789322,5 10.125,5 C10.3321068,5 10.5,4.83210678 10.5,4.625 L10.5,3.375 C10.5,3.16789322 10.3321068,3 10.125,3 C10.1038806,3 10.0831689,3.00174586 10.0630014,3.00510113 L10,3 Z"
            fill={fillColor}
          />
        </svg>
      );

    case 'c13':
    case 'c14':
      // IEC 60320 C13/C14 Trapezoid power inlet
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 14 11"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <polygon
            points="1.5,3.5 3.5,1 10.5,1 12.5,3.5 12.5,10 1.5,10"
            fill={innerBg}
            stroke={fillColor}
            strokeWidth="1.2"
          />
          <line x1="4.5" y1="6" x2="4.5" y2="8" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" />
          <line x1="9.5" y1="6" x2="9.5" y2="8" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" />
          <line x1="7" y1="3" x2="7" y2="5" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" />
          {isConnected && (
            <circle
              cx="7"
              cy="6.5"
              r="2"
              fill={isHighlighted ? '#FF8C00' : cableColor}
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
          )}
        </svg>
      );

    case 'c19':
    case 'c20':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 15 11"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <rect
            x="0.5"
            y="0.5"
            width="14"
            height="10"
            rx="1.5"
            fill={innerBg}
            stroke={fillColor}
            strokeWidth="1.2"
          />
          <line x1="3" y1="4" x2="6" y2="4" stroke="#E2E8F0" strokeWidth="1.2" />
          <line x1="9" y1="4" x2="12" y2="4" stroke="#E2E8F0" strokeWidth="1.2" />
          <line x1="6" y1="8" x2="9" y2="8" stroke="#E2E8F0" strokeWidth="1.2" />
          {isConnected && (
            <circle
              cx="7.5"
              cy="6.5"
              r="2"
              fill={isHighlighted ? '#FF8C00' : cableColor}
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
          )}
        </svg>
      );

    case 'console':
      // Console port with Cisco blue border and RJ45 notch
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 11 9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <polygon
            points="11 9 11 2 7.7 2 7.7 0 3.3 0 3.3 2 0 2 0 9"
            fill="#2B6CB0"
            stroke="#63B3ED"
            strokeWidth="0.8"
          />
          {isConnected && (
            <circle cx="5.5" cy="4.5" r="2" fill={cableColor} stroke="#FFFFFF" strokeWidth="0.6" />
          )}
        </svg>
      );

    case 'power':
    case 'pwr':
      // Universal power button / LED indicator glyph
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <circle
            cx="6"
            cy="6"
            r="5"
            fill={innerBg}
            stroke={isHighlighted ? '#ff745b' : isHoveredEmpty ? '#3d9e99' : fillColor}
            strokeWidth="1.2"
          />
          <path
            d="M6 2.5V6"
            stroke={isHighlighted ? '#ff745b' : isHoveredEmpty ? '#3d9e99' : '#48BB78'}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M3.8 4.2C3 5 2.8 6.3 3.3 7.4C3.8 8.5 5 9.2 6.2 9.1C7.4 9 8.5 8.2 8.9 7.1C9.3 5.9 8.9 4.7 8 4"
            stroke={isHighlighted ? '#ff745b' : isHoveredEmpty ? '#3d9e99' : '#48BB78'}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 11 9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', overflow: 'visible' }}>
          <rect
            x="0.5"
            y="0.5"
            width="10"
            height="8"
            rx="1"
            fill={fillColor}
            stroke={isHighlighted ? '#FF8C00' : isHoveredEmpty ? '#3182CE' : '#4A5568'}
            strokeWidth="0.8"
          />
          {isConnected && (
            <circle
              cx="5.5"
              cy="4.5"
              r="2"
              fill={isHighlighted ? '#FF8C00' : cableColor}
              stroke="#FFFFFF"
              strokeWidth="0.6"
            />
          )}
        </svg>
      );
  }
}

/**
 * Legacy Port SVG icons preserved as backup.
 * Use if retro high-detail schematic style is desired.
 */
export function LegacyPortSvg({
  type = 'rj45',
  isConnected = false,
  cableColor = '#3182CE',
  isDrafting = false,
  isHighlighted = false,
  isHoveredEmpty = false,
}) {
  const metalColor = isHoveredEmpty ? '#3182CE' : '#718096';
  const innerBg = '#1A202C';
  const pinGold = isHighlighted ? '#FF8C00' : isHoveredEmpty ? '#63B3ED' : '#D69E2E';
  const aquaFiber = isHighlighted ? '#FF8C00' : isHoveredEmpty ? '#63B3ED' : '#319795';
  const highlightColor = isHighlighted
    ? '#FF8C00'
    : isHoveredEmpty
    ? '#3182CE'
    : isDrafting
    ? '#38A169'
    : isConnected
    ? cableColor
    : '#4A5568';
  const effectivePlugColor = isHighlighted ? '#FF8C00' : cableColor;

  switch (type.toLowerCase()) {
    case 'rj45':
      return (
        <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="17" height="14" rx="2" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <line x1="3.5" y1="2.5" x2="3.5" y2="5" stroke={pinGold} strokeWidth="1" strokeLinecap="round" />
          <line x1="5.5" y1="2.5" x2="5.5" y2="5" stroke={pinGold} strokeWidth="1" strokeLinecap="round" />
          <line x1="7.5" y1="2.5" x2="7.5" y2="5" stroke={pinGold} strokeWidth="1" strokeLinecap="round" />
          <line x1="9.5" y1="2.5" x2="9.5" y2="5" stroke={pinGold} strokeWidth="1" strokeLinecap="round" />
          <line x1="11.5" y1="2.5" x2="11.5" y2="5" stroke={pinGold} strokeWidth="1" strokeLinecap="round" />
          <line x1="13.5" y1="2.5" x2="13.5" y2="5" stroke={pinGold} strokeWidth="1" strokeLinecap="round" />
          <path d="M5.5 14.5V11H12.5V14.5" fill={metalColor} />
          {isConnected && (
            <circle cx="9" cy="8" r="2.2" fill={effectivePlugColor} stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      );

    case 'sfp':
    case 'sfp_plus':
    case 'sfp+':
    case 'qsfp':
      return (
        <svg width="20" height="13" viewBox="0 0 20 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="19" height="12" rx="1" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <rect x="3" y="3" width="14" height="7" rx="0.5" fill="#2D3748" stroke="#4A5568" strokeWidth="0.8" />
          <line x1="7" y1="5" x2="7" y2="8" stroke={aquaFiber} strokeWidth="1.2" />
          <line x1="13" y1="5" x2="13" y2="8" stroke={aquaFiber} strokeWidth="1.2" />
          {isConnected && (
            <circle cx="10" cy="6.5" r="2.2" fill={effectivePlugColor} stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      );

    case 'fiber_lc':
    case 'fiber':
      return (
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="17" height="13" rx="1.5" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <rect x="2.5" y="2.5" width="5.5" height="9" rx="1" fill="#2D3748" stroke={aquaFiber} strokeWidth="0.8" />
          <circle cx="5.25" cy="7" r="1.2" fill="#FFFFFF" />
          <rect x="10" y="2.5" width="5.5" height="9" rx="1" fill="#2D3748" stroke={aquaFiber} strokeWidth="0.8" />
          <circle cx="12.75" cy="7" r="1.2" fill="#FFFFFF" />
          {isConnected && (
            <circle cx="9" cy="7" r="2.2" fill={effectivePlugColor} stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      );

    case 'c13':
    case 'c14':
      return (
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="1.5,4 4,0.5 14,0.5 16.5,4 16.5,13 1.5,13" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <line x1="5" y1="8" x2="5" y2="10.5" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="13" y1="8" x2="13" y2="10.5" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="9" y1="3" x2="9" y2="5.5" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
          {isConnected && (
            <circle cx="9" cy="8.5" r="2.2" fill={effectivePlugColor} stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      );

    case 'c19':
    case 'c20':
      return (
        <svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="19" height="14" rx="1.5" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <line x1="3.5" y1="4.5" x2="8" y2="4.5" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="4.5" x2="16.5" y2="4.5" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7.5" y1="10.5" x2="12.5" y2="10.5" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
          {isConnected && (
            <circle cx="10" cy="7.5" r="2.2" fill={effectivePlugColor} stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      );

    case 'console':
      return (
        <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="17" height="14" rx="2" fill={innerBg} stroke="#3182CE" strokeWidth="1.5" />
          <rect x="3" y="3" width="12" height="4" fill="#2B6CB0" />
          <line x1="5.5" y1="9" x2="12.5" y2="9" stroke="#E2E8F0" strokeWidth="1" />
          {isConnected && (
            <circle cx="9" cy="8" r="2.2" fill={cableColor} stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      );

    case 'usb':
      return (
        <svg width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="14" height="9" rx="1.5" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <rect x="2.5" y="4.5" width="10" height="3" fill="#A0AEC0" />
          {isConnected && (
            <circle cx="7.5" cy="5" r="2" fill={cableColor} stroke="#FFFFFF" strokeWidth="0.6" />
          )}
        </svg>
      );

    case 'hdmi':
    case 'displayport':
      return (
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0.5 1.5H16.5V7L13.5 10H3.5L0.5 7V1.5Z" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <line x1="4" y1="4" x2="13" y2="4" stroke={pinGold} strokeWidth="1" />
          {isConnected && (
            <circle cx="8.5" cy="5.5" r="2" fill={cableColor} stroke="#FFFFFF" strokeWidth="0.6" />
          )}
        </svg>
      );

    default:
      return (
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="15" height="13" rx="1.5" fill={innerBg} stroke={highlightColor} strokeWidth="1.2" />
          <circle cx="8" cy="7" r="3" fill="#4A5568" />
          {isConnected && (
            <circle cx="8" cy="7" r="2" fill={cableColor} stroke="#FFFFFF" strokeWidth="0.8" />
          )}
        </svg>
      );
  }
}

/**
 * PortNode represents an interactive port element on a device faceplate.
 * Clicking initiates or completes patch cable routing.
 */
export default function PortNode({
  port,
  rackId,
  deviceId,
  connectedCable,
  isHighlighted = false,
  isDraftingSource = false,
  isDraftingTarget = false,
  onClick,
  onHover,
  zIndex: customZIndex,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isConnected = !!connectedCable;
  const isHoveredEmpty = isHovered && !isConnected;

  const cableColor = isHighlighted ? '#ff745b' : (connectedCable?.color || '#3d9e99');

  // Determine port orientation (odd-over-even: posY < 0.5 is top notch, posY >= 0.5 is bottom notch)
  const orientation =
    port.orientation || (typeof port.posY === 'number' && port.posY > 0.5 ? 'bottom' : 'top');

  const portWidth = port.width || 14;
  const portHeight = port.height || 11;

  const descSuffix = port.description ? ` • ${port.description}` : '';
  const tooltipText = isConnected
    ? `${port.name} (${(port.portType || 'rj45').toUpperCase()}) — Patched (${connectedCable.cableType || 'Cat6'})${isHighlighted ? ' [ACTIVE]' : ''}${descSuffix}`
    : `${port.name} (${(port.portType || 'rj45').toUpperCase()}) — Available (Click to Patch)${descSuffix}`;

  const haloShadow = isHighlighted
    ? '0 0 14px 4px #ff745b, 0 0 6px #e6583e'
    : isHoveredEmpty
    ? '0 0 12px 3px #3d9e99, 0 0 5px #a3d4d1'
    : isDraftingSource
    ? '0 0 8px 2px #48BB78'
    : isDraftingTarget
    ? '0 0 8px 2px #3d9e99'
    : isConnected
    ? `0 0 4px ${cableColor}88`
    : 'none';

  const rotation = typeof port.rotation === 'number' ? port.rotation : 0;
  const rotTransform = rotation ? `rotate(${rotation}deg)` : '';
  const baseTransform = ['translate(-50%, -50%)', rotTransform].filter(Boolean).join(' ');
  const hoverTransform = ['translate(-50%, -50%)', rotTransform, 'scale(1.2)'].filter(Boolean).join(' ');

  return (
    <Tooltip label={tooltipText} fontSize="xs" placement="top" hasArrow openDelay={200}>
      <Box
        as="button"
        type="button"
        id={`port-node-${port.id}`}
        data-port-id={port.id}
        data-port-face={port.face}
        data-port-name={port.name}
        data-port-pos-y={port.posY}
        position="absolute"
        left={`${(port.posX * 100).toFixed(2)}%`}
        top={`${(port.posY * 100).toFixed(2)}%`}
        transform={
          isHighlighted || isHoveredEmpty
            ? hoverTransform
            : baseTransform
        }
        zIndex={customZIndex !== undefined ? customZIndex : (isHighlighted ? 12 : (isHoveredEmpty ? 10 : 4))}
        pointerEvents="auto"
        cursor="pointer"
        p="1px"
        borderRadius="3px"
        bg={
          isHighlighted
            ? 'rgba(255, 116, 91, 0.25)'
            : isHoveredEmpty
            ? 'rgba(61, 158, 153, 0.25)'
            : 'transparent'
        }
        border={
          isHighlighted
            ? '1px solid #ff745b'
            : isHoveredEmpty
            ? '1px solid #3d9e99'
            : '1px solid transparent'
        }
        outline="none"
        transition="all 0.15s ease"
        boxShadow={haloShadow}
        _hover={{
          transform: hoverTransform,
          boxShadow: isConnected
            ? '0 0 14px 4px #ff745b, 0 0 6px #e6583e'
            : '0 0 12px 3px #3d9e99, 0 0 5px #a3d4d1',
          borderColor: isConnected ? '#ff745b' : '#3d9e99',
          bg: isConnected ? 'rgba(255, 116, 91, 0.25)' : 'rgba(61, 158, 153, 0.25)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(port);
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          if (onHover) onHover(port);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (onHover) onHover(null);
        }}>
        <PortSvg
          type={port.portType}
          orientation={orientation}
          isConnected={isConnected}
          cableColor={cableColor}
          isDrafting={isDraftingSource || isDraftingTarget}
          isHighlighted={isHighlighted}
          isHoveredEmpty={isHoveredEmpty}
          width={portWidth}
          height={portHeight}
        />
      </Box>
    </Tooltip>
  );
}
