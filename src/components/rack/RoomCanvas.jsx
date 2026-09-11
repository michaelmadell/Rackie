import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import RackElevation from './RackElevation';
import CableOverlay from '../cables/CableOverlay';
import DeviceLibraryModal from '../deviceLibrary/DeviceLibraryModal';
import DevicePropertiesDrawer from './DevicePropertiesDrawer';
import {
  createCable,
  createDevice,
  createDeviceTemplate,
  createRack,
  deleteCable,
  deleteDevice,
  updateDevice,
  deleteRack,
  getDeviceTemplates,
  getRoomFull,
  updateCable,
} from '../../services/digitalTwinApi';
import {
  MdAdd,
  MdCable,
  MdCenterFocusStrong,
  MdClose,
  MdDelete,
  MdDevices,
  MdVisibility,
  MdVisibilityOff,
  MdZoomIn,
  MdZoomOut,
} from 'react-icons/md';

const CABLE_COLORS = [
  { name: 'Amulet Teal', hex: '#a3d4d1' },
  { name: 'Amulet Coral', hex: '#ff745b' },
  { name: 'Teal Pro', hex: '#3d9e99' },
  { name: 'Dark Blue', hex: '#0b2130' },
  { name: 'Blue', hex: '#3182CE' },
  { name: 'Green', hex: '#38A169' },
  { name: 'Red', hex: '#E53E3E' },
  { name: 'Yellow', hex: '#D69E2E' },
  { name: 'Slate', hex: '#4A5568' },
  { name: 'Orange', hex: '#DD6B20' },
];

export default function RoomCanvas({ roomId, onBack }) {
  const toast = useToast();
  const canvasContainerRef = useRef(null);
  const zoomWrapperRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  const roomDataRef = useRef(roomData);
  roomDataRef.current = roomData;
  const [templates, setTemplates] = useState([]);

  // Zoom and Pan (with Ctrl + Wheel smooth zoom centered on cursor)
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const pendingScrollRef = useRef(null);
  const [isWheelZooming, setIsWheelZooming] = useState(false);
  const wheelTimeoutRef = useRef(null);

  // Pan State & Refs (Click & drag on empty space, middle-click, or Space+drag)
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0, hasDragged: false });
  const isSpacePressedRef = useRef(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Device Drag State & Ref (Move device via right ear drag handle)
  const [draggingDeviceState, setDraggingDeviceState] = useState(null);
  const dragSessionRef = useRef(null);

  // Synchronize scroll offsets during zoom so content under cursor stays anchored
  useLayoutEffect(() => {
    zoomLevelRef.current = zoomLevel;
    if (pendingScrollRef.current && canvasContainerRef.current) {
      canvasContainerRef.current.scrollLeft = pendingScrollRef.current.scrollLeft;
      canvasContainerRef.current.scrollTop = pendingScrollRef.current.scrollTop;
      pendingScrollRef.current = null;
    }
  }, [zoomLevel]);

  // Native non-passive Wheel listener to handle Ctrl + Scroll zoom on rack elevation canvas
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // Check for Ctrl (Windows/Linux) or Cmd (macOS)
      if (!e.ctrlKey && !e.metaKey) return;

      // Crucial: prevent native browser webpage zoom
      e.preventDefault();

      if (e.deltaY === 0) return;

      const currentZoom = zoomLevelRef.current;
      const zoomDelta =
        Math.abs(e.deltaY) < 30
          ? -e.deltaY * 0.005 // fine trackpad pinch
          : e.deltaY < 0
          ? 0.1
          : -0.1; // standard mouse wheel step

      const nextZoom = Math.min(2.5, Math.max(0.4, Math.round((currentZoom + zoomDelta) * 100) / 100));
      if (nextZoom === currentZoom) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const effectiveScrollLeft = pendingScrollRef.current
        ? pendingScrollRef.current.scrollLeft
        : container.scrollLeft;
      const effectiveScrollTop = pendingScrollRef.current
        ? pendingScrollRef.current.scrollTop
        : container.scrollTop;

      // Position in unscaled content space under mouse cursor
      const contentX = (effectiveScrollLeft + mouseX) / currentZoom;
      const contentY = (effectiveScrollTop + mouseY) / currentZoom;

      // Target scroll offsets so point under mouse remains stable
      const targetScrollLeft = Math.max(0, contentX * nextZoom - mouseX);
      const targetScrollTop = Math.max(0, contentY * nextZoom - mouseY);

      zoomLevelRef.current = nextZoom;
      pendingScrollRef.current = {
        scrollLeft: targetScrollLeft,
        scrollTop: targetScrollTop,
      };

      setIsWheelZooming(true);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        setIsWheelZooming(false);
      }, 150);

      setZoomLevel(nextZoom);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [loading, roomData]);

  // Ctrl + Plus/Minus/0 keyboard shortcuts when hovering over rack canvas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
        if (canvasContainerRef.current && canvasContainerRef.current.matches(':hover')) {
          e.preventDefault();
          if (e.key === '=' || e.key === '+') {
            setZoomLevel((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))));
          } else if (e.key === '-') {
            setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))));
          } else if (e.key === '0') {
            setZoomLevel(1);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Spacebar pan toggle (hold Space to activate grab cursor & pan)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        const activeEl = document.activeElement;
        const isTyping =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable);
        if (isTyping) return;

        if (canvasContainerRef.current && canvasContainerRef.current.matches(':hover')) {
          e.preventDefault();
          isSpacePressedRef.current = true;
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cable Drafting & Routing State
  const [activeRoutingMode, setActiveRoutingMode] = useState('auto'); // 'auto', 'spline', 'bevelled', 'straight'
  const [activeColor, setActiveColor] = useState('#3d9e99');
  const [visibilityMode, setVisibilityMode] = useState('active'); // 'active', 'all', 'selected'
  const [selectedCableId, setSelectedCableId] = useState(null);
  const [hoveredCableId, setHoveredCableId] = useState(null);
  const [hoveredPort, setHoveredPort] = useState(null);
  const [draftSourcePort, setDraftSourcePort] = useState(null);
  const [mousePos, setMousePos] = useState(null);

  // Helper to test if a click target belongs to an interactive item (devices, ports, cables, buttons)
  const isInteractiveItem = (target) => {
    if (!target || !(target instanceof Element)) return false;

    // Form controls, buttons, and menus
    if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"]')) {
      return true;
    }

    // Port nodes and buttons
    if (target.closest('[data-port-id], [id^="port-node-"], [data-port-node]')) {
      return true;
    }

    // Mounted devices, faceplates, and drag handles
    if (
      target.closest(
        '[data-device-id], [data-device-slot], [data-device-faceplate], [data-device-drag-handle], [data-drag-ghost]'
      )
    ) {
      return true;
    }

    // Cable paths and waypoint circles
    if (
      target.closest(
        'svg#rackie-cable-overlay path, svg#rackie-cable-overlay circle, [data-cable-id], [data-handle-index]'
      )
    ) {
      return true;
    }

    // Modular enclosure blade slots & server bays
    if (target.closest('[data-blade-bay], [data-blade-server], [data-enclosure-bay]')) {
      return true;
    }

    return false;
  };

  // Click-and-drag pan on empty/non-item space or via middle click / spacebar
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleMouseDown = (e) => {
      // Do not pan while actively drafting a patch cable or dragging a device
      if (draftSourcePort || dragSessionRef.current) return;

      const isMiddleClick = e.button === 1;
      const isSpaceDrag = e.button === 0 && isSpacePressedRef.current;
      const isLeftClickOnEmpty = e.button === 0 && !isInteractiveItem(e.target);

      if (!isMiddleClick && !isSpaceDrag && !isLeftClickOnEmpty) {
        return;
      }

      e.preventDefault();

      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: container.scrollLeft,
        startScrollTop: container.scrollTop,
        hasDragged: false,
      };

      isPanningRef.current = true;
      setIsPanning(true);

      const handleMouseMove = (moveEvent) => {
        if (!isPanningRef.current) return;

        const dx = moveEvent.clientX - panStartRef.current.startX;
        const dy = moveEvent.clientY - panStartRef.current.startY;

        if (!panStartRef.current.hasDragged && Math.hypot(dx, dy) > 3) {
          panStartRef.current.hasDragged = true;
        }

        if (panStartRef.current.hasDragged) {
          container.scrollLeft = panStartRef.current.startScrollLeft - dx;
          container.scrollTop = panStartRef.current.startScrollTop - dy;
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        if (panStartRef.current.hasDragged) {
          // Suppress the click event that follows mouseup after dragging
          const captureClick = (clickEvent) => {
            clickEvent.stopPropagation();
            clickEvent.preventDefault();
          };
          window.addEventListener('click', captureClick, { capture: true, once: true });
        }

        isPanningRef.current = false;
        setIsPanning(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    container.addEventListener('mousedown', handleMouseDown);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
    };
  }, [loading, roomData, draftSourcePort]);

  // Independent Front vs Rear view state for each individual rack
  const [rackFaces, setRackFaces] = useState({});

  const handleToggleRackFace = (rackId, newFace) => {
    setRackFaces((prev) => ({
      ...prev,
      [rackId]: newFace,
    }));
  };

  // Modals & Drawers
  const {
    isOpen: isAddRackOpen,
    onOpen: onOpenAddRack,
    onClose: onCloseAddRack,
  } = useDisclosure();
  const {
    isOpen: isLibraryOpen,
    onOpen: onOpenLibrary,
    onClose: onCloseLibrary,
  } = useDisclosure();
  const {
    isOpen: isCablesDrawerOpen,
    onOpen: onOpenCablesDrawer,
    onClose: onCloseCablesDrawer,
  } = useDisclosure();

  // Mounting target state
  const [mountingTarget, setMountingTarget] = useState({ rack: null, slot: 1 });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const {
    isOpen: isDeviceDrawerOpen,
    onOpen: onOpenDeviceDrawer,
    onClose: onCloseDeviceDrawer,
  } = useDisclosure();

  const handleSelectDevice = (dev) => {
    setSelectedDevice(dev);
    onOpenDeviceDrawer();
  };

  const handleCloseDeviceDrawer = () => {
    onCloseDeviceDrawer();
    setSelectedDevice(null);
  };

  const handleUpdateDevice = async (deviceId, updatedData) => {
    await updateDevice(deviceId, updatedData);
    refreshRoom();
    // keep selectedDevice synced
    setSelectedDevice((prev) => (prev && prev.id === deviceId ? { ...prev, ...updatedData } : prev));
  };

  // Move Device via Drag Handle
  const handleStartDragDevice = (device, rack, e) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const devUHeight = device.uHeight || 1;

    // Calculate initial grab offset in U units from top of the device faceplate
    const devSlotEl = document.querySelector(
      `[data-device-slot="true"][data-device-id="${device.id}"]`
    );
    let grabOffsetU = 0;
    if (devSlotEl) {
      const rect = devSlotEl.getBoundingClientRect();
      const relativeClickY = (e.clientY - rect.top) / (zoomLevelRef.current || 1);
      grabOffsetU = Math.max(0, Math.min(devUHeight - 1, Math.floor(relativeClickY / 28)));
    }

    const session = {
      device,
      sourceRack: rack,
      startX,
      startY,
      grabOffsetU,
      hasMoved: false,
      targetRackId: rack.id,
      targetU: device.uPosition,
      collision: null,
    };
    dragSessionRef.current = session;

    const onMouseMove = (moveEvent) => {
      const sess = dragSessionRef.current;
      if (!sess) return;

      const delta = Math.hypot(moveEvent.clientX - sess.startX, moveEvent.clientY - sess.startY);
      if (!sess.hasMoved) {
        if (delta < 3) return; // Ignore slight twitches
        sess.hasMoved = true;
        document.body.style.cursor = 'grabbing';
      }

      const currentRacks = roomDataRef.current?.racks || [];
      // 1. Identify which rack is under the cursor
      const elUnderCursor =
        typeof document.elementFromPoint === 'function'
          ? document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
          : null;
      const rackEl = elUnderCursor ? elUnderCursor.closest('[data-rack-container]') : null;
      let targetRack = sess.sourceRack;

      if (rackEl) {
        const rId = Number(rackEl.getAttribute('data-rack-id'));
        const foundRack = currentRacks.find((r) => r.id === rId);
        if (foundRack) targetRack = foundRack;
      }

      // 2. Identify target U inside the target rack equipment bay
      const equipmentBayEl = document.getElementById(`rack-equipment-bay-${targetRack.id}`);
      let targetU = sess.device.uPosition;

      if (equipmentBayEl) {
        const bayRect = equipmentBayEl.getBoundingClientRect();
        const bayRelativeY = (moveEvent.clientY - bayRect.top) / (zoomLevelRef.current || 1);
        const slotFromTop = Math.floor(bayRelativeY / 28);
        const hoveredU = targetRack.uHeight - slotFromTop;
        const rawTargetU = hoveredU - (devUHeight - 1 - sess.grabOffsetU);
        targetU = Math.max(1, Math.min(targetRack.uHeight - devUHeight + 1, rawTargetU));
      }

      // 3. Collision check with other devices on targetRack
      const otherDevices = (targetRack.devices || []).filter((d) => d.id !== sess.device.id);
      const targetStart = targetU;
      const targetEnd = targetU + devUHeight - 1;

      let collidingDevice = null;
      for (const od of otherDevices) {
        const odStart = od.uPosition;
        const odEnd = od.uPosition + (od.uHeight || 1) - 1;
        if (targetStart <= odEnd && targetEnd >= odStart) {
          collidingDevice = od;
          break;
        }
      }

      sess.targetRackId = targetRack.id;
      sess.targetU = targetU;
      sess.collision = collidingDevice;

      setDraggingDeviceState({
        isDragging: true,
        draggingDevice: sess.device,
        sourceRackId: sess.sourceRack.id,
        dragTargetRackId: targetRack.id,
        dragTargetU: targetU,
        dragCollision: collidingDevice,
        grabOffsetU: sess.grabOffsetU,
      });
    };

    const onMouseUp = async (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';

      const sess = dragSessionRef.current;
      dragSessionRef.current = null;
      setDraggingDeviceState(null);

      if (!sess || !sess.hasMoved) {
        return;
      }

      // Suppress synthetic click on mouseup
      const captureClick = (clickEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
      };
      window.addEventListener('click', captureClick, { capture: true, once: true });

      if (sess.collision) {
        toast({
          title: `Slot U${sess.targetU} Occupied`,
          description: `Cannot move "${sess.device.name}" here because "${sess.collision.name}" occupies slot U${sess.collision.uPosition}.`,
          status: 'warning',
          duration: 3500,
          isClosable: true,
        });
        return;
      }

      const isChanged =
        sess.targetU !== sess.device.uPosition || sess.targetRackId !== sess.sourceRack.id;

      if (!isChanged) {
        return;
      }

      // Optimistically update local roomData
      const updatePayload = {
        uPosition: sess.targetU,
        ...(sess.targetRackId !== sess.sourceRack.id ? { rackId: sess.targetRackId } : {}),
      };

      setRoomData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          racks: prev.racks.map((r) => {
            if (r.id === sess.sourceRack.id && sess.sourceRack.id !== sess.targetRackId) {
              return {
                ...r,
                devices: (r.devices || []).filter((d) => d.id !== sess.device.id),
              };
            }
            if (r.id === sess.targetRackId) {
              const targetDevices =
                sess.sourceRack.id === sess.targetRackId
                  ? (r.devices || []).map((d) =>
                      d.id === sess.device.id ? { ...d, uPosition: sess.targetU } : d
                    )
                  : [
                      ...(r.devices || []),
                      { ...sess.device, rackId: sess.targetRackId, uPosition: sess.targetU },
                    ];
              return {
                ...r,
                devices: targetDevices,
              };
            }
            return r;
          }),
        };
      });

      try {
        await updateDevice(sess.device.id, updatePayload);
        toast({
          title: 'Device Moved',
          description: `Moved "${sess.device.name || 'Device'}" to slot U${sess.targetU}.`,
          status: 'success',
          duration: 2500,
          isClosable: true,
        });
        refreshRoom();
      } catch (err) {
        toast({
          title: 'Failed to move device',
          description: err.message,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        refreshRoom();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Add Rack Form
  const [newRackName, setNewRackName] = useState('');
  const [newRackUHeight, setNewRackUHeight] = useState(42);

  // Theming
  const canvasBg = useColorModeValue('#F4F7FE', '#081925');
  const toolbarBg = useColorModeValue('white', 'navy.800');
  const toolbarBorder = useColorModeValue('secondaryGray.300', 'whiteAlpha.150');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const btnBorderColor = useColorModeValue('gray.300', 'whiteAlpha.200');
  const btnTextColor = useColorModeValue('gray.700', 'whiteAlpha.800');

  // Fetch Room Digital Twin Data
  const refreshRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      const data = await getRoomFull(roomId);
      setRoomData(data);
    } catch (err) {
      toast({
        title: 'Error loading room canvas',
        description: err.message,
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, toast]);

  // Fetch Device Templates for Library
  const refreshTemplates = useCallback(async () => {
    try {
      const data = await getDeviceTemplates();
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load device templates', err);
    }
  }, []);

  useEffect(() => {
    refreshRoom();
    refreshTemplates();
  }, [refreshRoom, refreshTemplates]);

  // Track Mouse Position for live drafting rubber-band cable in unscaled SVG space
  const handleMouseMove = (e) => {
    if (!draftSourcePort) return;
    const wrapper = zoomWrapperRef.current || canvasContainerRef.current;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / zoomLevel,
        y: (e.clientY - rect.top) / zoomLevel,
      });
    }
  };

  // Cancel drafting on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && draftSourcePort) {
        setDraftSourcePort(null);
        setMousePos(null);
        toast({
          title: 'Cable connection cancelled',
          status: 'info',
          duration: 1500,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftSourcePort, toast]);

  // Handle Port Click (Drafting or Connecting)
  const handlePortClick = async (port) => {
    if (!draftSourcePort) {
      // Start drafting from this port
      setDraftSourcePort(port);
      toast({
        title: `Patch Cable Started: ${port.name}`,
        description: 'Click destination port on any rack to complete connection, or press Esc to cancel.',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    if (draftSourcePort.id === port.id) {
      // Clicked same port: cancel
      setDraftSourcePort(null);
      setMousePos(null);
      return;
    }

    // Complete connection!
    try {
      await createCable({
        fromPortId: draftSourcePort.id,
        toPortId: port.id,
        routingMode: activeRoutingMode,
        color: activeColor,
      });

      toast({
        title: 'Patch Cable Connected!',
        description: `${draftSourcePort.name} ➔ ${port.name} (${activeRoutingMode.toUpperCase()} mode)`,
        status: 'success',
      });

      setDraftSourcePort(null);
      setMousePos(null);
      refreshRoom();
    } catch (err) {
      toast({
        title: 'Could not connect cable',
        description: err.message,
        status: 'error',
      });
    }
  };

  // Add Rack Submit
  const handleCreateRack = async () => {
    if (!newRackName.trim()) return;
    try {
      await createRack({
        roomId,
        name: newRackName.trim(),
        uHeight: Number(newRackUHeight),
      });
      setNewRackName('');
      onCloseAddRack();
      refreshRoom();
      toast({
        title: 'Rack added to room',
        status: 'success',
      });
    } catch (err) {
      toast({
        title: 'Failed to create rack',
        description: err.message,
        status: 'error',
      });
    }
  };

  // Delete Rack
  const handleDeleteRack = async (rackId) => {
    if (!window.confirm('Delete this rack and all mounted equipment?')) return;
    try {
      await deleteRack(rackId);
      refreshRoom();
      toast({ title: 'Rack removed', status: 'info' });
    } catch (err) {
      toast({ title: 'Error deleting rack', description: err.message, status: 'error' });
    }
  };

  // Mount Device from Library
  const handleMountTemplate = async (template, customRack = null, customSlot = null) => {
    const rack = customRack || mountingTarget.rack || racks[0];
    const slot = customSlot || mountingTarget.slot || 1;
    if (!rack) {
      toast({ title: 'No rack available to mount device', status: 'warning' });
      return;
    }
    try {
      await createDevice({
        rackId: rack.id,
        templateId: template.id,
        name: `${template.manufacturer} ${template.model}`,
        uPosition: slot,
        uHeight: template.uHeight,
        enclosureData: template.enclosureData || null,
      });

      toast({
        title: `Mounted ${template.model} at U${slot} in ${rack.name}`,
        status: 'success',
      });
      refreshRoom();
    } catch (err) {
      toast({
        title: 'Mount failed',
        description: err.message,
        status: 'error',
      });
    }
  };

  // Unmount Device
  const handleDeleteDevice = async (deviceId) => {
    try {
      await deleteDevice(deviceId);
      toast({ title: 'Device unmounted', status: 'info' });
      refreshRoom();
    } catch (err) {
      toast({ title: 'Error unmounting device', description: err.message, status: 'error' });
    }
  };

  const updateTimeoutRef = useRef(null);

  // Update Cable Waypoints (from drag handles or double-click add/remove)
  const handleUpdateCableWaypoints = (cableId, waypoints, commit = false, extraFields = {}) => {
    // Optimistic update for immediate buttery-smooth UI
    setRoomData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cables: prev.cables.map((c) =>
          c.id === cableId ? { ...c, waypoints, ...extraFields } : c
        ),
      };
    });

    if (commit) {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateCable(cableId, { waypoints, ...extraFields }).catch((err) => {
        console.error('Failed to persist cable waypoints', err);
      });
      return;
    }

    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        await updateCable(cableId, { waypoints, ...extraFields });
      } catch (err) {
        console.error('Failed to update cable handles', err);
      }
    }, 200);
  };

  // Change routing mode for future cables and optionally convert currently selected cable
  const handleSelectRoutingMode = async (mode) => {
    setActiveRoutingMode(mode);
    if (selectedCableId) {
      try {
        await updateCable(selectedCableId, { routingMode: mode });
        setRoomData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cables: prev.cables.map((c) =>
              c.id === selectedCableId ? { ...c, routingMode: mode } : c
            ),
          };
        });
        toast({
          title: `Selected cable switched to ${mode.toUpperCase()} routing`,
          status: 'info',
          duration: 2000,
          isClosable: true,
        });
      } catch (err) {
        console.error('Failed to update cable routing mode', err);
      }
    }
  };

  // Toggle Cable Visibility
  const handleToggleCableVisibility = async (cable) => {
    try {
      const updated = await updateCable(cable.id, { visible: !cable.visible });
      setRoomData((prev) => ({
        ...prev,
        cables: prev.cables.map((c) => (c.id === cable.id ? updated : c)),
      }));
    } catch (err) {
      toast({ title: 'Could not toggle visibility', description: err.message, status: 'error' });
    }
  };

  // Delete Cable
  const handleDeleteCable = async (cableId) => {
    try {
      await deleteCable(cableId);
      refreshRoom();
      toast({ title: 'Cable removed', status: 'info' });
    } catch (err) {
      toast({ title: 'Could not delete cable', description: err.message, status: 'error' });
    }
  };

  if (loading && !roomData) {
    return (
      <Flex w="100%" h="500px" justify="center" align="center" direction="column" gap="14px">
        <Spinner size="xl" color="brand.500" thickness="4px" />
        <Text fontSize="sm" color="gray.500">
          Loading Digital Twin Canvas...
        </Text>
      </Flex>
    );
  }

  const room = roomData?.room;
  const racks = roomData?.racks || [];
  const cables = roomData?.cables || [];

  return (
    <Box position="relative" w="100%" minH="85vh" bg={canvasBg} borderRadius="16px" overflow="hidden">
      {/* MASTER TOP TOOLBAR (Patchdocs inspired controls) */}
      <Flex
        px="16px"
        py="10px"
        bg={toolbarBg}
        borderBottom="1px solid"
        borderColor={toolbarBorder}
        justify="space-between"
        align="center"
        wrap="wrap"
        gap="10px"
        zIndex={20}
        position="relative">
        {/* Left: Room Title, Back Button, and Rack Count */}
        <HStack spacing="12px">
          {onBack && (
            <Button size="xs" variant="outline" onClick={onBack}>
              ← Locations
            </Button>
          )}
          <Box>
            <HStack spacing="8px">
              <Text fontSize="md" fontWeight="800" color={textColor}>
                {room?.name || 'Server Room Canvas'}
              </Text>
              {room?.floor && (
                <Badge colorScheme="brand" variant="solid" fontSize="10px" borderRadius="4px">
                  {room.floor}
                </Badge>
              )}
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {racks.length} Rack{racks.length === 1 ? '' : 's'} • {cables.length} Patch Connection{cables.length === 1 ? '' : 's'}
            </Text>
          </Box>
        </HStack>

        {/* Center: The 4 Routing Modes & Color Palette */}
        <HStack spacing="12px" wrap="wrap">
          {/* 4 Routing Options */}
          <Box>
            <Text fontSize="9px" fontWeight="700" color="gray.400" mb="2px" textTransform="uppercase">
              Routing Mode
            </Text>
            <ButtonGroup size="xs" isAttached variant="outline" borderColor={btnBorderColor}>
              <Button
                colorScheme={activeRoutingMode === 'auto' ? 'brand' : 'gray'}
                variant={activeRoutingMode === 'auto' ? 'solid' : 'outline'}
                bg={activeRoutingMode === 'auto' ? 'brand.500' : 'transparent'}
                borderColor={btnBorderColor}
                color={activeRoutingMode === 'auto' ? 'white' : btnTextColor}
                onClick={() => handleSelectRoutingMode('auto')}>
                Auto (Patchdocs)
              </Button>
              <Button
                colorScheme={activeRoutingMode === 'spline' ? 'brand' : 'gray'}
                variant={activeRoutingMode === 'spline' ? 'solid' : 'outline'}
                bg={activeRoutingMode === 'spline' ? 'brand.500' : 'transparent'}
                borderColor={btnBorderColor}
                color={activeRoutingMode === 'spline' ? 'white' : btnTextColor}
                onClick={() => handleSelectRoutingMode('spline')}>
                Spline
              </Button>
              <Button
                colorScheme={activeRoutingMode === 'bevelled' ? 'brand' : 'gray'}
                variant={activeRoutingMode === 'bevelled' ? 'solid' : 'outline'}
                bg={activeRoutingMode === 'bevelled' ? 'brand.500' : 'transparent'}
                borderColor={btnBorderColor}
                color={activeRoutingMode === 'bevelled' ? 'white' : btnTextColor}
                onClick={() => handleSelectRoutingMode('bevelled')}>
                Bevelled
              </Button>
              <Button
                colorScheme={activeRoutingMode === 'straight' ? 'brand' : 'gray'}
                variant={activeRoutingMode === 'straight' ? 'solid' : 'outline'}
                bg={activeRoutingMode === 'straight' ? 'brand.500' : 'transparent'}
                borderColor={btnBorderColor}
                color={activeRoutingMode === 'straight' ? 'white' : btnTextColor}
                onClick={() => handleSelectRoutingMode('straight')}>
                Straight
              </Button>
            </ButtonGroup>
          </Box>

          {/* Cable Color Palette */}
          <Box>
            <Text fontSize="9px" fontWeight="700" color="gray.400" mb="2px" textTransform="uppercase">
              Cord Color
            </Text>
            <HStack spacing="5px">
              {CABLE_COLORS.map((c) => (
                <Box
                  key={c.hex}
                  w="20px"
                  h="20px"
                  borderRadius="full"
                  bg={c.hex}
                  cursor="pointer"
                  border="2px solid"
                  borderColor={activeColor === c.hex ? '#FFFFFF' : 'transparent'}
                  boxShadow={activeColor === c.hex ? '0 0 6px #3d9e99' : 'none'}
                  onClick={() => setActiveColor(c.hex)}
                  title={c.name}
                />
              ))}
            </HStack>
          </Box>

          {/* Visibility Filter */}
          <Box>
            <Text fontSize="9px" fontWeight="700" color="gray.400" mb="2px" textTransform="uppercase">
              Cables View
            </Text>
            <Select
              size="xs"
              value={visibilityMode}
              onChange={(e) => setVisibilityMode(e.target.value)}
              borderRadius="6px"
              w="140px">
              <option value="active">Active Faces Only</option>
              <option value="all">Show All (Dashed)</option>
              <option value="selected">Selected Only</option>
            </Select>
          </Box>
        </HStack>

        {/* Right: Zoom, Add Rack, Device Library, and Cables Drawer */}
        <HStack spacing="8px">
          <ButtonGroup size="xs" isAttached variant="outline">
            <IconButton
              icon={<Icon as={MdZoomOut} />}
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
              title="Zoom Out (Ctrl + Scroll Down or Ctrl + -)"
            />
            <Button fontSize="10px" px="6px" title="Current Zoom Level">
              {Math.round(zoomLevel * 100)}%
            </Button>
            <IconButton
              icon={<Icon as={MdZoomIn} />}
              onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
              title="Zoom In (Ctrl + Scroll Up or Ctrl + +)"
            />
            <IconButton
              icon={<Icon as={MdCenterFocusStrong} />}
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom (Ctrl + 0)"
            />
          </ButtonGroup>

          <Badge
            colorScheme="brand"
            variant="subtle"
            fontSize="9px"
            px="6px"
            py="2px"
            borderRadius="4px"
            display={{ base: 'none', lg: 'inline-flex' }}>
            Ctrl + Scroll to Zoom • Drag to Pan
          </Badge>

          <Button
            size="xs"
            colorScheme="brand"
            variant="outline"
            leftIcon={<Icon as={MdDevices} />}
            onClick={() => {
              if (!mountingTarget.rack && racks.length > 0) {
                setMountingTarget({ rack: racks[0], slot: 1 });
              }
              onOpenLibrary();
            }}>
            Device Library
          </Button>

          <Button
            size="xs"
            colorScheme="coral"
            variant="outline"
            leftIcon={<Icon as={MdCable} />}
            onClick={onOpenCablesDrawer}>
            Cables ({cables.length})
          </Button>

          <Button
            size="xs"
            colorScheme="brand"
            leftIcon={<Icon as={MdAdd} />}
            onClick={onOpenAddRack}>
            Add Rack
          </Button>
        </HStack>
      </Flex>

      {/* Drafting Notification Banner */}
      {draftSourcePort && (
        <Flex
          bg="brand.500"
          color="white"
          px="16px"
          py="6px"
          justify="space-between"
          align="center"
          fontSize="xs"
          fontWeight="600"
          zIndex={25}
          position="relative">
          <HStack spacing="8px">
            <Box w="8px" h="8px" borderRadius="full" bg="#48BB78" />
            <Text>
              Drafting patch cable from <strong>{draftSourcePort.name}</strong> ({draftSourcePort.face.toUpperCase()}) — Click any target port to connect.
            </Text>
          </HStack>
          <Button
            size="xs"
            variant="solid"
            colorScheme="whiteAlpha"
            leftIcon={<Icon as={MdClose} />}
            onClick={() => {
              setDraftSourcePort(null);
              setMousePos(null);
            }}>
            Cancel (Esc)
          </Button>
        </Flex>
      )}

      {/* MAIN INTERACTIVE ROOM VIEWPORT */}
      <Box
        ref={canvasContainerRef}
        data-testid="room-canvas-viewport"
        position="relative"
        w="100%"
        h="calc(85vh - 70px)"
        overflow="auto"
        p="20px"
        cursor={isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default'}
        userSelect={isPanning ? 'none' : 'auto'}
        onMouseMove={handleMouseMove}
        onClick={() => setSelectedCableId(null)}>
        {/* Zoom Transform Wrapper */}
        <Box
          ref={zoomWrapperRef}
          data-testid="zoom-transform-wrapper"
          position="relative"
          display="inline-flex"
          alignItems="flex-start"
          transform={`scale(${zoomLevel})`}
          transformOrigin="top left"
          transition={isWheelZooming ? 'none' : 'transform 0.1s ease-out'}>
          {/* Side-by-Side Racks Canvas */}
          {racks.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              w="500px"
              h="300px"
              p="30px"
              borderRadius="16px"
              border="2px dashed"
              borderColor="gray.500"
              m="40px auto">
              <Icon as={MdDevices} w="40px" h="40px" color="gray.400" mb="10px" />
              <Text fontSize="md" fontWeight="700" color={textColor} mb="6px">
                No Racks in this Room Yet
              </Text>
              <Text fontSize="xs" color="gray.500" mb="14px" textAlign="center">
                Add your first server rack to start mounting equipment and routing patch cables.
              </Text>
              <Button size="sm" colorScheme="brand" leftIcon={<Icon as={MdAdd} />} onClick={onOpenAddRack}>
                Add 42U Server Rack
              </Button>
            </Flex>
          ) : (
            (() => {
              // Dynamic orange highlight sets when hovering over a cable or a port
              const highlightedPortIds = new Set();
              let effectiveHoveredCableId = hoveredCableId;

              if (hoveredCableId) {
                const c = cables.find((item) => item.id === hoveredCableId);
                if (c) {
                  highlightedPortIds.add(c.fromPortId);
                  highlightedPortIds.add(c.toPortId);
                }
              }

              if (hoveredPort) {
                const c = cables.find(
                  (item) => item.fromPortId === hoveredPort.id || item.toPortId === hoveredPort.id
                );
                if (c) {
                  effectiveHoveredCableId = c.id;
                  highlightedPortIds.add(c.fromPortId);
                  highlightedPortIds.add(c.toPortId);
                }
              }

              return (
                <>
                  {racks.map((rack) => (
                    <RackElevation
                      key={rack.id}
                      rack={rack}
                      devices={rack.devices || []}
                      cables={cables}
                      activeFace={rackFaces[rack.id] || 'front'}
                      onToggleFace={(face) => handleToggleRackFace(rack.id, face)}
                      selectedDeviceId={selectedDevice?.id}
                      onSelectDevice={handleSelectDevice}
                      highlightedPortIds={highlightedPortIds}
                      draftSourcePort={draftSourcePort}
                      onPortClick={handlePortClick}
                      onPortHover={(p) => setHoveredPort(p)}
                      onMountDeviceClick={(r, slot) => {
                        setMountingTarget({ rack: r, slot });
                        onOpenLibrary();
                      }}
                      onDeleteDevice={handleDeleteDevice}
                      onUpdateDevice={handleUpdateDevice}
                      onDeleteRack={handleDeleteRack}
                      draggingDeviceState={draggingDeviceState}
                      onStartDragDevice={handleStartDragDevice}
                    />
                  ))}

                  {/* Master Floating Cable Overlay SVG */}
                  {racks.length > 0 && (
                    <CableOverlay
                      containerRef={canvasContainerRef}
                      zoomLevel={zoomLevel}
                      cables={cables}
                      rackFaces={rackFaces}
                      selectedCableId={selectedCableId}
                      hoveredCableId={effectiveHoveredCableId}
                      onHoverCable={(cableId) => setHoveredCableId(cableId)}
                      draftSourcePort={draftSourcePort}
                      mousePos={mousePos}
                      activeRoutingMode={activeRoutingMode}
                      visibilityMode={visibilityMode}
                      onSelectCable={(id) => setSelectedCableId(id)}
                      onUpdateCableWaypoints={handleUpdateCableWaypoints}
                    />
                  )}
                </>
              );
            })()
          )}
        </Box>
      </Box>

      {/* Floating Ctrl + Scroll Zoom, Pan & Device Move Status Indicator */}
      <Box
        position="absolute"
        bottom="16px"
        right="20px"
        pointerEvents="none"
        zIndex={15}
        bg={
          draggingDeviceState?.isDragging
            ? draggingDeviceState.dragCollision
              ? 'coral.500'
              : 'brand.500'
            : isPanning
            ? 'coral.500'
            : isWheelZooming
            ? 'brand.500'
            : 'rgba(11, 33, 48, 0.85)'
        }
        backdropFilter="blur(8px)"
        color={
          draggingDeviceState?.isDragging || isPanning || isWheelZooming
            ? 'white'
            : 'gray.200'
        }
        px="10px"
        py="4px"
        borderRadius="8px"
        fontSize="11px"
        fontWeight="600"
        boxShadow="0 4px 14px rgba(0,0,0,0.35)"
        border="1px solid"
        borderColor={
          draggingDeviceState?.isDragging
            ? draggingDeviceState.dragCollision
              ? 'coral.300'
              : 'brand.300'
            : isPanning
            ? 'coral.300'
            : isWheelZooming
            ? 'brand.300'
            : 'rgba(255,255,255,0.15)'
        }
        opacity={draggingDeviceState?.isDragging || isPanning || isWheelZooming ? 1 : 0.75}
        transition="all 0.2s ease">
        {draggingDeviceState?.isDragging
          ? draggingDeviceState.dragCollision
            ? `⚠️ Cannot place at U${draggingDeviceState.dragTargetU} (Occupied by ${draggingDeviceState.dragCollision.name})`
            : `Moving ${draggingDeviceState.draggingDevice?.name || 'Device'} ➔ Slot U${draggingDeviceState.dragTargetU}...`
          : isPanning
          ? 'Panning Canvas...'
          : `Ctrl + Scroll to Zoom • Drag to Pan (${Math.round(zoomLevel * 100)}%)`}
      </Box>

      {/* ADD RACK MODAL */}
      <Modal isOpen={isAddRackOpen} onClose={onCloseAddRack} size="md">
        <ModalOverlay />
        <ModalContent bg={toolbarBg}>
          <ModalHeader fontSize="md" fontWeight="700">
            Add Server Rack to {room?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="14px">
              <FormControl isRequired>
                <FormLabel fontSize="xs">Rack Name</FormLabel>
                <Input
                  placeholder="e.g. Rack 01 (MDF), Cabinet A"
                  value={newRackName}
                  onChange={(e) => setNewRackName(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">Rack Height (U Units)</FormLabel>
                <Select
                  value={newRackUHeight}
                  onChange={(e) => setNewRackUHeight(Number(e.target.value))}>
                  <option value={12}>12U (Wallbox / Comms)</option>
                  <option value={18}>18U (Mid-sized)</option>
                  <option value={24}>24U (Half-rack)</option>
                  <option value={36}>36U (Data Hall)</option>
                  <option value={42}>42U (Standard Full Rack)</option>
                  <option value={45}>45U (Extended)</option>
                  <option value={48}>48U (High Density)</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="10px" onClick={onCloseAddRack}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={handleCreateRack} isDisabled={!newRackName.trim()}>
              Create Rack
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* DEVICE LIBRARY MODAL */}
      <DeviceLibraryModal
        isOpen={isLibraryOpen}
        onClose={onCloseLibrary}
        templates={templates}
        allRacks={racks}
        targetRack={mountingTarget.rack}
        targetSlot={mountingTarget.slot}
        onSelectTemplateToMount={handleMountTemplate}
        onCreateTemplate={async (data) => {
          const t = await createDeviceTemplate(data);
          refreshTemplates();
          return t;
        }}
      />

      {/* DEVICE PROPERTIES DRAWER (Patchdocs style) */}
      <DevicePropertiesDrawer
        isOpen={isDeviceDrawerOpen}
        onClose={handleCloseDeviceDrawer}
        device={selectedDevice}
        rack={selectedDevice ? racks.find((r) => r.id === selectedDevice.rackId) : null}
        room={room}
        cables={cables}
        allRacks={racks}
        onUpdateDevice={handleUpdateDevice}
        onDeleteDevice={handleDeleteDevice}
        onDisconnectCable={handleDeleteCable}
        onStartPatch={handlePortClick}
      />

      {/* CABLES & CONNECTIONS DRAWER */}
      <Drawer isOpen={isCablesDrawerOpen} placement="right" onClose={onCloseCablesDrawer} size="md">
        <DrawerOverlay />
        <DrawerContent bg={toolbarBg}>
          <DrawerCloseButton />
          <DrawerHeader borderBottom="1px solid" borderColor={toolbarBorder} fontSize="md">
            Patch Connections ({cables.length})
          </DrawerHeader>
          <DrawerBody p="10px">
            {cables.length === 0 ? (
              <Flex direction="column" align="center" justify="center" h="200px">
                <Icon as={MdCable} w="32px" h="32px" color="gray.400" mb="8px" />
                <Text fontSize="sm" color="gray.500">
                  No patch connections created yet.
                </Text>
              </Flex>
            ) : (
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Cable</Th>
                    <Th>From ➔ To</Th>
                    <Th>Mode</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {cables.map((c) => (
                    <Tr
                      key={c.id}
                      bg={selectedCableId === c.id ? 'whiteAlpha.100' : 'transparent'}
                      cursor="pointer"
                      onClick={() => setSelectedCableId(c.id)}>
                      <Td>
                        <HStack spacing="6px">
                          <Box w="10px" h="10px" borderRadius="full" bg={c.color} />
                          <Text fontSize="xs" fontWeight="700">
                            #{c.id}
                          </Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="xs" fontWeight="600">
                          {c.fromPort?.rackName} / {c.fromPort?.name} ({c.fromPort?.face})
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          ➔ {c.toPort?.rackName} / {c.toPort?.name} ({c.toPort?.face})
                        </Text>
                      </Td>
                      <Td>
                        <Badge size="xs" fontSize="9px" colorScheme="blue">
                          {c.routingMode}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing="4px">
                          <IconButton
                            size="xs"
                            variant="ghost"
                            icon={<Icon as={c.visible ? MdVisibility : MdVisibilityOff} />}
                            title={c.visible ? 'Hide Cable' : 'Show Cable'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCableVisibility(c);
                            }}
                          />
                          <IconButton
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            icon={<Icon as={MdDelete} />}
                            title="Delete Cable"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCable(c.id);
                            }}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
