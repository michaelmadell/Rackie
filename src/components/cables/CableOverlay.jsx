import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Helper to build an SVG filleted corner between 3 points: P0 -> P1 -> P2
 */
function buildFilletCorner(p0, p1, p2, radius = 10) {
  const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
  const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

  const len1 = Math.hypot(v1.x, v1.y) || 1;
  const len2 = Math.hypot(v2.x, v2.y) || 1;

  const r = Math.min(radius, len1 / 2, len2 / 2);

  const start = {
    x: p1.x + (v1.x / len1) * r,
    y: p1.y + (v1.y / len1) * r,
  };
  const end = {
    x: p1.x + (v2.x / len2) * r,
    y: p1.y + (v2.y / len2) * r,
  };

  return `L ${start.x} ${start.y} Q ${p1.x} ${p1.y} ${end.x} ${end.y} `;
}

/**
 * Simplifies consecutive collinear or duplicate points to ensure clean right-angle corners
 */
function simplifyPolyline(points) {
  if (!points || points.length <= 1) return points || [];
  const clean = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const prev = clean[clean.length - 1];

    // 1. Skip if curr is identical or virtually identical to prev (< 1px)
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) < 1) {
      continue;
    }

    // 2. Check if curr continues in the same collinear direction as previous segment
    if (clean.length >= 2) {
      const prevPrev = clean[clean.length - 2];
      const isCollinearX = Math.abs(prevPrev.x - prev.x) < 0.5 && Math.abs(prev.x - curr.x) < 0.5;
      const isCollinearY = Math.abs(prevPrev.y - prev.y) < 0.5 && Math.abs(prev.y - curr.y) < 0.5;

      if (isCollinearX || isCollinearY) {
        clean[clean.length - 1] = curr;
        continue;
      }
    }

    clean.push(curr);
  }

  return clean;
}

/**
 * Generates an SVG path string for an orthogonal polyline with rounded filleted corners
 */
function generateFilletedPolyline(points, radius = 6) {
  const simplified = simplifyPolyline(points);
  if (!simplified || simplified.length < 2) return '';
  if (simplified.length === 2) {
    return `M ${simplified[0].x} ${simplified[0].y} L ${simplified[1].x} ${simplified[1].y}`;
  }

  let d = `M ${simplified[0].x} ${simplified[0].y} `;
  for (let i = 1; i < simplified.length - 1; i++) {
    d += buildFilletCorner(simplified[i - 1], simplified[i], simplified[i + 1], radius);
  }
  d += `L ${simplified[simplified.length - 1].x} ${simplified[simplified.length - 1].y}`;
  return d;
}

/**
 * Safely computes spline control points without undefined holes or corrupt data
 */
export function getSplineControlPoints(cable, p1, p2) {
  const dx = (p2.x - p1.x) * 0.4;
  const dy = (p2.y - p1.y) * 0.1 + 80;
  const defaultCp1 = { x: Math.round(p1.x + dx), y: Math.round(p1.y + dy) };
  const defaultCp2 = { x: Math.round(p2.x - dx), y: Math.round(p2.y + dy) };

  const wp = Array.isArray(cable?.waypoints) ? cable.waypoints : [];
  const cp1 =
    wp[0] && typeof wp[0].x === 'number' && typeof wp[0].y === 'number'
      ? { x: Math.round(wp[0].x), y: Math.round(wp[0].y) }
      : defaultCp1;
  const cp2 =
    wp[1] && typeof wp[1].x === 'number' && typeof wp[1].y === 'number'
      ? { x: Math.round(wp[1].x), y: Math.round(wp[1].y) }
      : defaultCp2;

  return [cp1, cp2];
}

/**
 * Safely computes bevelled elbow waypoints
 */
export function getBevelledWaypoints(cable, p1, p2) {
  if (Array.isArray(cable?.waypoints)) {
    return cable.waypoints
      .filter((w) => w && typeof w.x === 'number' && typeof w.y === 'number')
      .map((w) => ({ x: Math.round(w.x), y: Math.round(w.y) }));
  }

  // If uninitialized (null or undefined), provide default 2 elbows
  const midX = Math.round((p1.x + p2.x) / 2);
  return [
    { x: midX, y: Math.round(p1.y) },
    { x: midX, y: Math.round(p2.y) },
  ];
}

/**
 * Generates an SVG path string for a bevelled polyline with smooth tangent curves at each node,
 * returning the path 'd' string and the tangent entry/exit point metadata for each node.
 */
export function computeBevelledPathWithTangents(points, radius = 20) {
  if (!points || points.length < 2) {
    return { pathD: '', tangentHandles: [] };
  }

  // Filter out any consecutive duplicate points (< 1px distance)
  const cleanPoints = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (
      Math.hypot(
        points[i].x - cleanPoints[cleanPoints.length - 1].x,
        points[i].y - cleanPoints[cleanPoints.length - 1].y
      ) >= 1
    ) {
      cleanPoints.push(points[i]);
    }
  }

  if (cleanPoints.length < 2) {
    return { pathD: '', tangentHandles: [] };
  }

  if (cleanPoints.length === 2) {
    return {
      pathD: `M ${cleanPoints[0].x} ${cleanPoints[0].y} L ${cleanPoints[1].x} ${cleanPoints[1].y}`,
      tangentHandles: [],
    };
  }

  let d = `M ${cleanPoints[0].x} ${cleanPoints[0].y} `;
  const tangentHandles = [];

  for (let i = 1; i < cleanPoints.length - 1; i++) {
    const p0 = cleanPoints[i - 1];
    const p1 = cleanPoints[i];
    const p2 = cleanPoints[i + 1];

    const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

    const len1 = Math.hypot(v1.x, v1.y) || 1;
    const len2 = Math.hypot(v2.x, v2.y) || 1;

    // Check collinearity via cross-product
    const cross = v1.x * v2.y - v1.y * v2.x;
    const isCollinear = Math.abs(cross) < 1e-2;

    if (isCollinear) {
      d += `L ${p1.x} ${p1.y} `;
      tangentHandles.push({
        node: p1,
        tangents: null,
      });
    } else {
      // Natural fillet radius smoothly scaled if segments are short
      const r = Math.min(radius, len1 * 0.45, len2 * 0.45);
      const start = {
        x: p1.x + (v1.x / len1) * r,
        y: p1.y + (v1.y / len1) * r,
      };
      const end = {
        x: p1.x + (v2.x / len2) * r,
        y: p1.y + (v2.y / len2) * r,
      };

      d += `L ${start.x} ${start.y} Q ${p1.x} ${p1.y} ${end.x} ${end.y} `;
      tangentHandles.push({
        node: p1,
        tangents: { start, end, r },
      });
    }
  }

  d += `L ${cleanPoints[cleanPoints.length - 1].x} ${cleanPoints[cleanPoints.length - 1].y}`;
  return { pathD: d, tangentHandles };
}

/**
 * Transforms screen client coordinates to SVG canvas space using getScreenCTM
 */
function getSvgPoint(svgEl, screenX, screenY, fallbackOrigin, zoom = 1) {
  if (svgEl && typeof svgEl.getScreenCTM === 'function') {
    const ctm = svgEl.getScreenCTM();
    if (ctm) {
      const pt = svgEl.createSVGPoint();
      pt.x = screenX;
      pt.y = screenY;
      return pt.matrixTransform(ctm.inverse());
    }
  }
  const origin = fallbackOrigin || (svgEl ? svgEl.getBoundingClientRect() : { left: 0, top: 0 });
  const z = zoom > 0 ? zoom : 1;
  return {
    x: (screenX - origin.left) / z,
    y: (screenY - origin.top) / z,
  };
}

export default function CableOverlay({
  containerRef,
  zoomLevel = 1,
  cables = [],
  rackFaces = {},
  selectedCableId,
  hoveredCableId,
  onHoverCable,
  draftSourcePort,
  mousePos,
  activeRoutingMode = 'auto',
  visibilityMode = 'active', // 'active', 'all', 'selected'
  onSelectCable,
  onUpdateCableWaypoints,
}) {
  const svgRef = useRef(null);
  const [portPositions, setPortPositions] = useState({});
  const [draggingHandle, setDraggingHandle] = useState(null);

  // Measure port centers and device/rack bounding geometry relative to SVG canvas in unscaled coordinates
  const updatePortPositions = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl && !containerRef.current) return;
    const originRect = svgEl ? svgEl.getBoundingClientRect() : containerRef.current.getBoundingClientRect();
    const positions = {};

    const rootEl = containerRef.current || document;
    const portElements = rootEl.querySelectorAll('[data-port-id]');
    portElements.forEach((el) => {
      const portId = Number(el.getAttribute('data-port-id'));
      const rect = el.getBoundingClientRect();
      const face = el.getAttribute('data-port-face');
      const posY = Number(el.getAttribute('data-port-pos-y')) || 0.5;
      const isHiddenFace = el.getAttribute('data-hidden-face') === 'true';

      const portCenter = getSvgPoint(
        svgEl,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        originRect,
        zoomLevel
      );
      const x = portCenter.x;
      const y = portCenter.y;

      // Extract device slot bounding box relative to SVG origin
      // Must NOT match the port button itself: match ancestor device-slot or device-faceplate
      const devEl =
        el.closest('[data-device-slot]') ||
        el.closest('[data-device-faceplate]') ||
        el.parentElement?.closest('[data-device-id]');

      let device = null;
      let deviceId = null;
      if (devEl) {
        deviceId = Number(devEl.getAttribute('data-device-id')) || null;
        const dRect = devEl.getBoundingClientRect();
        const topLeft = getSvgPoint(svgEl, dRect.left, dRect.top, originRect, zoomLevel);
        const bottomRight = getSvgPoint(svgEl, dRect.right, dRect.bottom, originRect, zoomLevel);
        device = {
          left: topLeft.x,
          right: bottomRight.x,
          top: topLeft.y,
          bottom: bottomRight.y,
          centerY: (topLeft.y + bottomRight.y) / 2,
        };
      }

      // Extract rack bounding box & duct channels relative to SVG origin
      // Must NOT match the port button itself: match ancestor rack-container
      const rackEl =
        el.closest('[data-rack-container]') ||
        el.closest('[id^="rack-container-"]');

      let rack = null;
      let rackId = null;
      if (rackEl) {
        rackId = Number(rackEl.getAttribute('data-rack-id')) || null;
        const rRect = rackEl.getBoundingClientRect();
        const leftDuctEl = rackEl.querySelector('[id^="rack-channel-left"]');
        const rightDuctEl = rackEl.querySelector('[id^="rack-channel-right"]');
        const leftDuctRect = leftDuctEl ? leftDuctEl.getBoundingClientRect() : null;
        const rightDuctRect = rightDuctEl ? rightDuctEl.getBoundingClientRect() : null;

        const rackTopLeft = getSvgPoint(svgEl, rRect.left, rRect.top, originRect, zoomLevel);
        const rackBottomRight = getSvgPoint(svgEl, rRect.right, rRect.bottom, originRect, zoomLevel);

        const rackLeft = rackTopLeft.x;
        const rackRight = rackBottomRight.x;
        const rackTop = rackTopLeft.y;
        const rackBottom = rackBottomRight.y;

        const marginLeftX = leftDuctRect
          ? getSvgPoint(svgEl, leftDuctRect.left + leftDuctRect.width / 2, leftDuctRect.top, originRect, zoomLevel).x
          : rackLeft + 10;

        const marginRightX = rightDuctRect
          ? getSvgPoint(svgEl, rightDuctRect.left + rightDuctRect.width / 2, rightDuctRect.top, originRect, zoomLevel).x
          : rackRight - 10;

        rack = {
          left: rackLeft,
          right: rackRight,
          top: rackTop,
          bottom: rackBottom,
          centerX: (rackLeft + rackRight) / 2,
          marginLeftX,
          marginRightX,
        };
      }

      positions[portId] = {
        x,
        y,
        face,
        rackId,
        deviceId,
        posY,
        isHiddenFace,
        isVisible: !isHiddenFace && rect.width > 0,
        device,
        rack,
      };
    });

    setPortPositions(positions);
  }, [containerRef, zoomLevel]);

  // Recalculate on mount, resize, scroll, or when cables/racks/faces/zoomLevel update
  useEffect(() => {
    updatePortPositions();
    const rAF = requestAnimationFrame(updatePortPositions);
    const timer = setTimeout(updatePortPositions, 50);
    const timer2 = setTimeout(updatePortPositions, 120);

    const resizeObserver = new ResizeObserver(() => {
      updatePortPositions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // MutationObserver to immediately catch DOM attribute changes (like data-hidden-face or data-port-face)
    let mutationObserver = null;
    if (typeof MutationObserver !== 'undefined' && containerRef.current) {
      mutationObserver = new MutationObserver(() => {
        updatePortPositions();
      });
      mutationObserver.observe(containerRef.current, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-hidden-face', 'data-port-face', 'data-device-id'],
      });
    }

    window.addEventListener('resize', updatePortPositions);
    return () => {
      cancelAnimationFrame(rAF);
      clearTimeout(timer);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      window.removeEventListener('resize', updatePortPositions);
    };
  }, [updatePortPositions, cables, containerRef, rackFaces, zoomLevel]);

  // Handle Dragging Tangent/Elbow Handles for Spline & Bevelled modes
  const handleMouseDown = (cableId, handleIndex, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingHandle({ cableId, handleIndex });
  };

  // Double-click on bevelled cable path to insert a new node at click location
  const handleCableDoubleClick = (cable, e) => {
    e.stopPropagation();
    e.preventDefault();

    const svgEl = svgRef.current;
    if (!svgEl) return;

    const p1 = portPositions[cable.fromPortId];
    const p2 = portPositions[cable.toPortId];
    if (!p1 || !p2) return;

    if (onSelectCable) onSelectCable(cable.id);

    const mouseSvg = getSvgPoint(svgEl, e.clientX, e.clientY, null, zoomLevel);
    const clickPt = { x: mouseSvg.x, y: mouseSvg.y };

    const currentWaypoints = getBevelledWaypoints(cable, p1, p2);
    const points = [p1, ...currentWaypoints, p2];

    let bestIdx = 0;
    let minDist = Infinity;
    let bestProj = { x: Math.round(clickPt.x), y: Math.round(clickPt.y) };

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq > 0 ? ((clickPt.x - a.x) * dx + (clickPt.y - a.y) * dy) / lenSq : 0.5;
      t = Math.max(0.05, Math.min(0.95, t));
      const proj = {
        x: Math.round(a.x + t * dx),
        y: Math.round(a.y + t * dy),
      };
      const dist = Math.hypot(clickPt.x - proj.x, clickPt.y - proj.y);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
        bestProj = proj;
      }
    }

    const newWaypoints = [...currentWaypoints];
    newWaypoints.splice(bestIdx, 0, bestProj);

    if (onUpdateCableWaypoints) {
      const extra = cable.routingMode !== 'bevelled' ? { routingMode: 'bevelled' } : {};
      onUpdateCableWaypoints(cable.id, newWaypoints, true, extra);
    }
  };

  // Double-click on an existing node handle to delete it
  const handleNodeDoubleClick = (cableId, handleIndex, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingHandle(null);

    const cable = cables.find((c) => c.id === cableId);
    if (!cable) return;

    const p1 = portPositions[cable.fromPortId];
    const p2 = portPositions[cable.toPortId];
    if (!p1 || !p2) return;

    const currentWaypoints = getBevelledWaypoints(cable, p1, p2);
    const newWaypoints = currentWaypoints.filter((_, idx) => idx !== handleIndex);

    if (onUpdateCableWaypoints) {
      onUpdateCableWaypoints(cableId, newWaypoints, true);
    }
  };

  useEffect(() => {
    if (!draggingHandle) return;

    const handleMouseMove = (e) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      const cable = cables.find((c) => c.id === draggingHandle.cableId);
      if (!cable) return;

      const p1 = portPositions[cable.fromPortId];
      const p2 = portPositions[cable.toPortId];
      if (!p1 || !p2) return;

      const mouseSvg = getSvgPoint(svgEl, e.clientX, e.clientY, null, zoomLevel);
      const mode = cable.routingMode || 'auto';
      let currentWaypoints = [];

      if (mode === 'spline') {
        currentWaypoints = getSplineControlPoints(cable, p1, p2);
      } else if (mode === 'bevelled') {
        currentWaypoints = getBevelledWaypoints(cable, p1, p2);
      } else {
        currentWaypoints = Array.isArray(cable.waypoints) ? [...cable.waypoints] : [];
      }

      currentWaypoints[draggingHandle.handleIndex] = {
        x: Math.round(mouseSvg.x),
        y: Math.round(mouseSvg.y),
      };

      if (onUpdateCableWaypoints) {
        onUpdateCableWaypoints(draggingHandle.cableId, currentWaypoints, false);
      }
    };

    const handleMouseUp = () => {
      if (draggingHandle && onUpdateCableWaypoints) {
        const cable = cables.find((c) => c.id === draggingHandle.cableId);
        if (cable && Array.isArray(cable.waypoints)) {
          onUpdateCableWaypoints(draggingHandle.cableId, cable.waypoints, true);
        }
      }
      setDraggingHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, cables, portPositions, onUpdateCableWaypoints, zoomLevel]);

  // Patchdocs cable routing algorithm as demonstrated in Screenshot 2026-09-10 005236.png:
  // - Along the edge of the device to the side
  // - Turn to the vertical center of the device at the side
  // - Cross horizontally through the rack rail into the margin
  // - All cables run along the exact same vertical trunk path in the margin!
  const computeAutoPath = (p1, p2) => {
    // 1. Device and Rack geometry (with reliable fallbacks)
    const dev1 = p1.device || {
      left: p1.x - 170,
      right: p1.x + 170,
      top: p1.y - 14,
      bottom: p1.y + 14,
      centerY: p1.y,
    };
    const dev2 = p2.device || {
      left: p2.x - 170,
      right: p2.x + 170,
      top: p2.y - 14,
      bottom: p2.y + 14,
      centerY: p2.y,
    };

    const rack1 = p1.rack || {
      left: dev1.left - 42,
      right: dev1.right + 42,
      top: dev1.top - 40,
      centerX: (dev1.left + dev1.right) / 2,
      marginLeftX: dev1.left - 32,
      marginRightX: dev1.right + 32,
    };
    const rack2 = p2.rack || {
      left: dev2.left - 42,
      right: dev2.right + 42,
      top: dev2.top - 40,
      centerX: (dev2.left + dev2.right) / 2,
      marginLeftX: dev2.left - 32,
      marginRightX: dev2.right + 32,
    };

    const sameRack = p1.rackId && p2.rackId ? p1.rackId === p2.rackId : Math.abs(rack1.centerX - rack2.centerX) < 50;

    // 2. Decide margin side (left vs right)
    // Intra-rack: both endpoints route to the SAME side margin (Patchdocs behavior in user screenshot)
    // Cross-rack: Rack 1 exits toward Rack 2; Rack 2 exits toward Rack 1
    let side1 = 'right';
    let side2 = 'right';

    if (sameRack) {
      const avgX = (p1.x + p2.x) / 2;
      const sharedSide = avgX >= rack1.centerX ? 'right' : 'left';
      side1 = sharedSide;
      side2 = sharedSide;
    } else {
      if (rack1.centerX <= rack2.centerX) {
        side1 = 'right';
        side2 = 'left';
      } else {
        side1 = 'left';
        side2 = 'right';
      }
    }

    // 3. Vertical exit direction (Up vs Down along device edge)
    // - Distinct top row (< 0.45): exit UP to top edge
    // - Distinct bottom row (> 0.55): exit DOWN to bottom edge
    // - Single-row or center (0.45..0.55): exit towards target device
    const getExitUpward = (p, targetP) => {
      if (typeof p.posY === 'number') {
        if (p.posY < 0.45) return true;
        if (p.posY > 0.55) return false;
      }
      return targetP.y < p.y;
    };

    const exit1Up = getExitUpward(p1, p2);
    const exit2Up = getExitUpward(p2, p1);

    // 4. Coordinates:
    // Slot edge lines (runs right on the gap/boundary line between U slots)
    const yEdge1 = exit1Up ? dev1.top + 1 : dev1.bottom - 1;
    const yEdge2 = exit2Up ? dev2.top + 1 : dev2.bottom - 1;

    // Side X (at the device ear / inner edge of mounting rail)
    const xSide1 = side1 === 'right' ? (dev1.right - 8) : (dev1.left + 8);
    const xSide2 = side2 === 'right' ? (dev2.right - 8) : (dev2.left + 8);

    // Margin X (fixed vertical trunk line in the margin channel - NO staggering, all on same line!)
    const margin1X = side1 === 'right' ? rack1.marginRightX : rack1.marginLeftX;
    const margin2X = side2 === 'right' ? rack2.marginRightX : rack2.marginLeftX;

    // Special Case: Same Device intra-connection (e.g. port 1 to port 24 on same chassis)
    const sameDevice = p1.deviceId && p2.deviceId && p1.deviceId === p2.deviceId;
    if (sameRack && sameDevice) {
      if (exit1Up === exit2Up) {
        // Both on same row: direct horizontal U-loop along that edge
        return generateFilletedPolyline([p1, { x: p1.x, y: yEdge1 }, { x: p2.x, y: yEdge1 }, p2], 6);
      }
      // Top row to bottom row on same chassis: loop at the ear
      return generateFilletedPolyline([
        p1,
        { x: p1.x, y: yEdge1 },
        { x: xSide1, y: yEdge1 },
        { x: xSide1, y: yEdge2 },
        { x: p2.x, y: yEdge2 },
        p2,
      ], 6);
    }

    // 5. Build full orthogonal path
    let points = [];

    if (sameRack) {
      // Intra-rack:
      // Port 1 -> edge1 -> side1 -> center1 -> margin -> center2 -> side2 -> edge2 -> Port 2
      // All cables in this margin run on the EXACT same vertical path (margin1X)
      points = [
        p1,
        { x: p1.x, y: yEdge1 },
        { x: xSide1, y: yEdge1 },
        { x: xSide1, y: dev1.centerY },
        { x: margin1X, y: dev1.centerY },
        { x: margin1X, y: dev2.centerY },
        { x: xSide2, y: dev2.centerY },
        { x: xSide2, y: yEdge2 },
        { x: p2.x, y: yEdge2 },
        p2,
      ];
    } else {
      // Cross-rack:
      // Port 1 -> edge1 -> side1 -> center1 -> margin1 -> overhead bridgeY -> margin2 -> center2 -> side2 -> edge2 -> Port 2
      const bridgeY = Math.min(rack1.top, rack2.top) - 16;
      points = [
        p1,
        { x: p1.x, y: yEdge1 },
        { x: xSide1, y: yEdge1 },
        { x: xSide1, y: dev1.centerY },
        { x: margin1X, y: dev1.centerY },
        { x: margin1X, y: bridgeY },
        { x: margin2X, y: bridgeY },
        { x: margin2X, y: dev2.centerY },
        { x: xSide2, y: dev2.centerY },
        { x: xSide2, y: yEdge2 },
        { x: p2.x, y: yEdge2 },
        p2,
      ];
    }

    return generateFilletedPolyline(points, 6);
  };

  // Render individual cable path
  const renderCable = (cable) => {
    if (cable.visible === false) return null;

    const p1 = portPositions[cable.fromPortId];
    const p2 = portPositions[cable.toPortId];

    // If neither endpoint is tracked yet, skip
    if (!p1 || !p2) return null;

    const bothVisible = p1.isVisible && p2.isVisible;

    // Visibility filtering
    if (visibilityMode === 'selected' && selectedCableId !== cable.id) {
      return null;
    }
    if (visibilityMode === 'active' && !bothVisible) {
      return null;
    }

    const isSelected = selectedCableId === cable.id;
    const isCrossFaceDashed = !bothVisible; // Endpoint is on a flipped rear face
    const color = cable.color || '#3d9e99';
    const mode = cable.routingMode || 'auto';

    let pathD = '';
    let controlHandles = [];

    if (mode === 'straight') {
      // 1. Straight Point-to-Point
      pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    } else if (mode === 'spline') {
      // 2. Spline with Cubic Bézier & Handles
      const [cp1, cp2] = getSplineControlPoints(cable, p1, p2);
      pathD = `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
      controlHandles = [
        { ...cp1, anchor: p1 },
        { ...cp2, anchor: p2 },
      ];
    } else if (mode === 'bevelled') {
      // 3. Bevelled Lines with Handles & Tangent Fillet Curves
      const waypoints = getBevelledWaypoints(cable, p1, p2);
      const points = [p1, ...waypoints, p2];
      const { pathD: bevelPathD, tangentHandles } = computeBevelledPathWithTangents(points, 20);
      pathD = bevelPathD;
      controlHandles = waypoints.map((w, idx) => ({
        ...w,
        anchor: null,
        tangents: tangentHandles[idx]?.tangents || null,
      }));
    } else {
      // 4. Auto (Patchdocs)
      pathD = computeAutoPath(p1, p2);
    }

    const isHovered = hoveredCableId === cable.id;
    const isHighlighted = isHovered || isSelected;
    const wireColor = isHovered ? '#ff745b' : (isSelected ? '#a3d4d1' : color);
    const wireWidth = isHighlighted ? 3.5 : 2.5;

    return (
      <g
        key={cable.id}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectCable) onSelectCable(cable.id);
        }}
        onDoubleClick={(e) => handleCableDoubleClick(cable, e)}
        onMouseEnter={() => onHoverCable && onHoverCable(cable.id)}
        onMouseLeave={() => onHoverCable && onHoverCable(null)}
        cursor="pointer">
        {/* Invisible wider hit-target for easy mouse hover, clicking, and double-clicking */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={18}
          onDoubleClick={(e) => handleCableDoubleClick(cable, e)}
        >
          <title>Click to select • Double-click to add node</title>
        </path>
        {/* Glowing Orange Halo under hovered cable, or White Halo under selected cable */}
        {isHighlighted && (
          <path
            d={pathD}
            fill="none"
            stroke={isHovered ? '#FF8C00' : '#FFFFFF'}
            strokeWidth={isHovered ? 9 : 8}
            opacity={isHovered ? 0.5 : 0.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            onDoubleClick={(e) => handleCableDoubleClick(cable, e)}
          />
        )}
        {/* Cable Wire Core */}
        <path
          d={pathD}
          fill="none"
          stroke={wireColor}
          strokeWidth={wireWidth}
          strokeDasharray={isCrossFaceDashed ? '6 4' : 'none'}
          opacity={isCrossFaceDashed ? 0.5 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          onDoubleClick={(e) => handleCableDoubleClick(cable, e)}
        />

        {/* Glowing Orange Endpoint Badges on the two connected ports when hovered */}
        {isHovered && (
          <>
            {!p1.isHiddenFace && (
              <circle
                cx={p1.x}
                cy={p1.y}
                r="6.5"
                fill="#FF8C00"
                fillOpacity="0.3"
                stroke="#FF8C00"
                strokeWidth="2.5"
              />
            )}
            {!p2.isHiddenFace && (
              <circle
                cx={p2.x}
                cy={p2.y}
                r="6.5"
                fill="#FF8C00"
                fillOpacity="0.3"
                stroke="#FF8C00"
                strokeWidth="2.5"
              />
            )}
          </>
        )}

        {/* Cable Control Handles (Visible when cable is selected) */}
        {isSelected &&
          controlHandles.map((handle, idx) => (
            <g key={`handle-${idx}`}>
              {/* Spline anchor guideline */}
              {handle.anchor && (
                <line
                  x1={handle.anchor.x}
                  y1={handle.anchor.y}
                  x2={handle.x}
                  y2={handle.y}
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              )}

              {/* Bevelled corner tangent indicator lines */}
              {handle.tangents && (
                <g opacity="0.65">
                  <line
                    x1={handle.x}
                    y1={handle.y}
                    x2={handle.tangents.start.x}
                    y2={handle.tangents.start.y}
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={handle.x}
                    y1={handle.y}
                    x2={handle.tangents.end.x}
                    y2={handle.tangents.end.y}
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={handle.tangents.start.x}
                    cy={handle.tangents.start.y}
                    r="2.5"
                    fill="#FFFFFF"
                  />
                  <circle
                    cx={handle.tangents.end.x}
                    cy={handle.tangents.end.y}
                    r="2.5"
                    fill="#FFFFFF"
                  />
                </g>
              )}

              {/* Grab / Drag Node Handle Circle */}
              <circle
                cx={handle.x}
                cy={handle.y}
                r="6"
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="2"
                cursor={
                  draggingHandle &&
                  draggingHandle.cableId === cable.id &&
                  draggingHandle.handleIndex === idx
                    ? 'grabbing'
                    : 'grab'
                }
                onMouseDown={(e) => handleMouseDown(cable.id, idx, e)}
                onDoubleClick={(e) => handleNodeDoubleClick(cable.id, idx, e)}
              >
                <title>Drag to reposition bend • Double-click to remove node</title>
              </circle>
            </g>
          ))}
      </g>
    );
  };

  // Render Live Elastic Drafting Cable from source port to mouse
  const renderDraftingCable = () => {
    if (!draftSourcePort || !mousePos) return null;
    const p1 = portPositions[draftSourcePort.id];
    if (!p1) return null;

    let pathD = '';
    if (activeRoutingMode === 'spline') {
      const dx = (mousePos.x - p1.x) * 0.4;
      const dy = 50;
      pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y + dy}, ${mousePos.x - dx} ${mousePos.y + dy}, ${mousePos.x} ${mousePos.y}`;
    } else if (activeRoutingMode === 'bevelled') {
      const midX = (p1.x + mousePos.x) / 2;
      const draftPoints = [p1, { x: midX, y: p1.y }, { x: midX, y: mousePos.y }, mousePos];
      const { pathD: draftD } = computeBevelledPathWithTangents(draftPoints, 18);
      pathD = draftD;
    } else {
      pathD = `M ${p1.x} ${p1.y} L ${mousePos.x} ${mousePos.y}`;
    }

    return (
      <g>
        <path
          d={pathD}
          fill="none"
          stroke="#48BB78"
          strokeWidth="2.5"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
        <circle cx={mousePos.x} cy={mousePos.y} r="5" fill="#48BB78" stroke="#FFFFFF" strokeWidth="1.5" />
      </g>
    );
  };

  return (
    <svg
      id="rackie-cable-overlay"
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 15,
        overflow: 'visible',
      }}>
      <g style={{ pointerEvents: 'auto' }}>
        {cables.map(renderCable)}
        {renderDraftingCable()}
      </g>
    </svg>
  );
}
