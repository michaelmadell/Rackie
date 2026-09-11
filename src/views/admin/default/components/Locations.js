import {
  Badge,
  Box,
  Button,
  CloseButton,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Spinner,
  Text,
  Textarea,
  useColorMode,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LngLatBounds, Map, Marker, NavigationControl, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { searchAddress } from "services/geocode";
import {
  MdBusiness,
  MdCheck,
  MdClose,
  MdLocationOn,
  MdMap,
  MdPlace,
  MdSearch,
} from "react-icons/md";

// Vector tile styles (100% free, no API key required)
const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createPinElement(color = "#3d9e99", isDraft = false) {
  const el = document.createElement("div");
  el.className = isDraft ? "rackie-draft-marker" : "rackie-saved-marker";
  el.style.width = isDraft ? "34px" : "30px";
  el.style.height = isDraft ? "34px" : "30px";
  el.style.cursor = "pointer";
  el.style.display = "block";
  const size = isDraft ? 34 : 30;
  const strokeW = isDraft ? 2 : 1.8;
  const radius = isDraft ? 3 : 2.5;

  el.innerHTML = `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5)); display: block;">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#ffffff" stroke-width="${strokeW}"/>
      <circle cx="12" cy="9" r="${radius}" fill="#ffffff"/>
    </svg>
  `;
  return el;
}

export default function Locations({ locations, onCreate }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const draftMarkerRef = useRef(null);
  const searchContainerRef = useRef(null);
  const hasFitBoundsRef = useRef(false);
  const toast = useToast();
  const { colorMode } = useColorMode();
  const prevColorModeRef = useRef(colorMode);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Theme colors
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue(
    "secondaryGray.600",
    "secondaryGray.400"
  );
  const inputBg = useColorModeValue("secondaryGray.100", "navy.700");
  const inputBorder = useColorModeValue(
    "secondaryGray.300",
    "rgba(255, 255, 255, 0.1)"
  );
  const dropdownBg = useColorModeValue("white", "navy.800");
  const dropdownBorder = useColorModeValue(
    "secondaryGray.300",
    "rgba(255, 255, 255, 0.12)"
  );
  const itemHoverBg = useColorModeValue("secondaryGray.200", "navy.700");
  const itemActiveBg = useColorModeValue("secondaryGray.300", "navy.600");
  const draftCardBg = useColorModeValue("secondaryGray.200", "navy.700");
  const draftCardBorder = useColorModeValue(
    "secondaryGray.400",
    "rgba(255, 255, 255, 0.08)"
  );
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const badgeBg = useColorModeValue("brand.100", "whiteAlpha.200");
  const badgeColor = useColorModeValue("brand.500", "brand.400");

  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  // Re-render markers for all saved locations
  const renderMarkers = useCallback((locs) => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const currentLocs = locs || locationsRef.current;
    if (!currentLocs || currentLocs.length === 0) return;

    const newMarkers = [];
    const validCoords = [];

    currentLocs.forEach((location) => {
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      validCoords.push([lng, lat]);

      const pinEl = createPinElement("#3d9e99", false);

      const popup = new Popup({
        offset: 20,
        closeButton: true,
      }).setHTML(`
        <div style="font-family: inherit; padding: 6px 8px; min-width: 140px; color: #1B2559;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${escapeHtml(location.name)}</div>
          <div style="font-size: 11px; color: #707EAE;">${escapeHtml(location.address)}</div>
          ${
            location.notes
              ? `<div style="font-size: 11px; font-style: italic; color: #707EAE; margin-top: 4px;">${escapeHtml(location.notes)}</div>`
              : ""
          }
        </div>
      `);

      const marker = new Marker({ element: pinEl, anchor: "bottom" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    // Auto-frame locations if not yet framed or if locations updated
    if (validCoords.length === 1 && !hasFitBoundsRef.current) {
      hasFitBoundsRef.current = true;
      map.flyTo({ center: validCoords[0], zoom: 12 });
    } else if (validCoords.length > 1 && !hasFitBoundsRef.current) {
      hasFitBoundsRef.current = true;
      const bounds = validCoords.reduce(
        (b, coord) => b.extend(coord),
        new LngLatBounds(validCoords[0], validCoords[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
  }, []);

  // Initialize MapLibre on mount
  useEffect(() => {
    const initialStyle =
      colorMode === "dark" ? MAP_STYLES.dark : MAP_STYLES.light;

    const map = new Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [-3.6584, 50.5733],
      zoom: 5,
    });

    map.addControl(new NavigationControl({ showCompass: true }), "top-right");
    mapRef.current = map;

    const onMapReady = () => {
      renderMarkers(locationsRef.current);
    };

    if (map.loaded()) {
      onMapReady();
    } else {
      map.on("load", onMapReady);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update map style ONLY when colorMode changes
  useEffect(() => {
    if (prevColorModeRef.current !== colorMode) {
      prevColorModeRef.current = colorMode;
      const map = mapRef.current;
      if (!map) return;

      const newStyle = colorMode === "dark" ? MAP_STYLES.dark : MAP_STYLES.light;
      map.setStyle(newStyle);

      map.once("style.load", () => {
        renderMarkers(locationsRef.current);
        if (draft && draftMarkerRef.current) {
          draftMarkerRef.current.addTo(map);
        }
      });
    }
  }, [colorMode, renderMarkers, draft]);

  // Update markers whenever locations prop updates
  useEffect(() => {
    locationsRef.current = locations;
    const map = mapRef.current;
    if (!map) return;

    if (map.loaded() || map.isStyleLoaded()) {
      renderMarkers(locations);
    }
  }, [locations, renderMarkers]);

  // Search autocomplete debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchAddress(query);
        setSuggestions(results);
        setActiveIndex(-1);
        setIsDropdownOpen(true);
        setSearchError(
          results.length === 0
            ? `No matching places found for "${query}"`
            : null
        );
      } catch (err) {
        setSuggestions([]);
        setSearchError(
          "Address search failed — please check your network and try again."
        );
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectSuggestion = (suggestion) => {
    setIsDropdownOpen(false);
    setSuggestions([]);
    setSearchError(null);
    setQuery(suggestion.address);

    const lat = Number(suggestion.lat);
    const lng = Number(suggestion.lng);

    // Auto-populate draft name with primary place name (e.g. "Amulet Hotkey")
    setDraft({
      name: suggestion.name || "",
      address: suggestion.address,
      lat,
      lng,
      notes: "",
    });

    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true,
        duration: 1200,
      });

      draftMarkerRef.current?.remove();

      const pinEl = createPinElement("#01B574", true);

      const popup = new Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family: inherit; padding: 4px; color: #1B2559;">
          <strong>${escapeHtml(suggestion.name)}</strong><br/>
          <span style="font-size: 11px; color: #707EAE;">${escapeHtml(suggestion.address)}</span>
        </div>
      `);

      draftMarkerRef.current = new Marker({ element: pinEl, anchor: "bottom" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      popup.addTo(map);
    }
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setSearchError(null);
    setIsDropdownOpen(false);
  };

  const cancelDraft = () => {
    setDraft(null);
    clearSearch();
    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;
  };

  const saveDraft = async () => {
    if (!draft.name.trim() || !draft.address.trim()) return;

    setIsSaving(true);
    try {
      await onCreate({
        name: draft.name.trim(),
        notes: draft.notes.trim(),
        address: draft.address.trim(),
        lat: draft.lat,
        lng: draft.lng,
      });

      toast({
        title: `Added "${draft.name}"`,
        description: "New location saved successfully",
        status: "success",
        duration: 3500,
        isClosable: true,
      });

      cancelDraft();
    } catch (err) {
      toast({
        title: "Couldn't save location",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getBadgeIcon = (type) => {
    switch (type) {
      case "Business":
        return MdBusiness;
      case "Postcode":
        return MdPlace;
      default:
        return MdLocationOn;
    }
  };

  return (
    <Card
      justifyContent='flex-start'
      align='stretch'
      direction='column'
      w='100%'
      p='24px'
      mb='0px'>
      <Flex justify='space-between' align='center' mb='16px'>
        <HStack spacing='8px'>
          <Icon as={MdMap} w='22px' h='22px' color={brandColor} />
          <Text fontSize='xl' fontWeight='700' color={textColor}>
            Map & Search
          </Text>
        </HStack>
      </Flex>

      {/* Address Search Bar */}
      <Box position='relative' w='100%' mb='16px' ref={searchContainerRef}>
        <InputGroup size='md'>
          <InputLeftElement pointerEvents='none'>
            <Icon as={MdSearch} w='20px' h='20px' color={textColorSecondary} />
          </InputLeftElement>
          <Input
            placeholder='Search place name, business, or postcode (e.g. Amulet Hotkey, TQ12 6TQ)...'
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            bg={inputBg}
            color={textColor}
            border='1px solid'
            borderColor={inputBorder}
            borderRadius='16px'
            fontSize='sm'
            pr='40px'
            _placeholder={{ color: textColorSecondary }}
            _focus={{
              borderColor: brandColor,
              boxShadow: `0 0 0 1px ${brandColor}`,
            }}
          />
          <InputRightElement>
            {isSearching ? (
              <Spinner size='sm' color={brandColor} />
            ) : query.length > 0 ? (
              <CloseButton
                size='sm'
                onClick={clearSearch}
                color={textColorSecondary}
              />
            ) : null}
          </InputRightElement>
        </InputGroup>

        {/* Floating Autocomplete Dropdown */}
        {isDropdownOpen && suggestions.length > 0 && (
          <Box
            position='absolute'
            top='calc(100% + 6px)'
            left='0'
            right='0'
            zIndex='30'
            bg={dropdownBg}
            border='1px solid'
            borderColor={dropdownBorder}
            borderRadius='16px'
            boxShadow='2xl'
            maxH='280px'
            overflowY='auto'
            p='6px'>
            {suggestions.map((suggestion, index) => {
              const isSelected = index === activeIndex;
              const IconComp = getBadgeIcon(suggestion.type);
              return (
                <Flex
                  key={index}
                  p='10px 14px'
                  borderRadius='12px'
                  cursor='pointer'
                  align='center'
                  justify='space-between'
                  bg={
                    isSelected
                      ? itemActiveBg
                      : "transparent"
                  }
                  _hover={{ bg: itemHoverBg }}
                  onClick={() => selectSuggestion(suggestion)}
                  transition='background-color 0.15s ease'>
                  <HStack spacing='12px' align='center' flex='1' minW='0'>
                    <Flex
                      w='32px'
                      h='32px'
                      borderRadius='10px'
                      bg={badgeBg}
                      color={badgeColor}
                      align='center'
                      justify='center'
                      flexShrink='0'>
                      <Icon as={IconComp} w='18px' h='18px' />
                    </Flex>
                    <Box minW='0' flex='1'>
                      <Flex align='center' gap='8px' flexWrap='wrap'>
                        <Text
                          fontWeight='700'
                          fontSize='sm'
                          color={textColor}
                          noOfLines={1}>
                          {suggestion.name}
                        </Text>
                        <Badge
                          fontSize='10px'
                          borderRadius='6px'
                          px='6px'
                          py='1px'
                          colorScheme={
                            suggestion.type === "Business"
                              ? "brand"
                              : suggestion.type === "Postcode"
                              ? "green"
                              : "gray"
                          }>
                          {suggestion.type}
                        </Badge>
                      </Flex>
                      <Text
                        fontSize='xs'
                        color={textColorSecondary}
                        noOfLines={1}
                        mt='1px'>
                        {suggestion.subtitle}
                      </Text>
                    </Box>
                  </HStack>
                </Flex>
              );
            })}
          </Box>
        )}

        {/* Search Error / Empty State Notice */}
        {isDropdownOpen && searchError && (
          <Box
            position='absolute'
            top='calc(100% + 6px)'
            left='0'
            right='0'
            zIndex='30'
            bg={dropdownBg}
            border='1px solid'
            borderColor={dropdownBorder}
            borderRadius='14px'
            boxShadow='xl'
            p='14px 18px'>
            <HStack spacing='8px'>
              <Icon as={MdPlace} color='red.500' w='18px' h='18px' />
              <Text fontSize='sm' color={textColorSecondary}>
                {searchError}
              </Text>
            </HStack>
          </Box>
        )}
      </Box>

      {/* New Location Draft Form */}
      {draft && (
        <Box
          w='100%'
          p='18px'
          borderRadius='16px'
          bg={draftCardBg}
          border='1px solid'
          borderColor={draftCardBorder}
          mb='16px'>
          <Flex justify='space-between' align='center' mb='12px'>
            <HStack spacing='8px'>
              <Badge colorScheme='green' borderRadius='8px' px='8px' py='2px'>
                New Location
              </Badge>
              <Text fontSize='xs' color={textColorSecondary}>
                {Number(draft.lat).toFixed(4)}, {Number(draft.lng).toFixed(4)}
              </Text>
            </HStack>
            <CloseButton size='sm' onClick={cancelDraft} />
          </Flex>

          <VStack spacing='12px' align='stretch'>
            <FormControl isRequired>
              <FormLabel
                fontSize='xs'
                fontWeight='600'
                color={textColor}
                mb='4px'>
                Location Name
              </FormLabel>
              <Input
                placeholder='e.g. Amulet Hotkey, London Office'
                value={draft.name}
                color={textColor}
                bg={inputBg}
                borderColor={inputBorder}
                _placeholder={{ color: textColorSecondary }}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel
                fontSize='xs'
                fontWeight='600'
                color={textColor}
                mb='4px'>
                Address
              </FormLabel>
              <Input
                placeholder='Full Address'
                value={draft.address}
                color={textColor}
                bg={inputBg}
                borderColor={inputBorder}
                _placeholder={{ color: textColorSecondary }}
                onChange={(e) =>
                  setDraft({ ...draft, address: e.target.value })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel
                fontSize='xs'
                fontWeight='600'
                color={textColor}
                mb='4px'>
                Notes (Optional)
              </FormLabel>
              <Textarea
                placeholder='Add site notes, contact info, or floor details...'
                value={draft.notes}
                color={textColor}
                bg={inputBg}
                borderColor={inputBorder}
                _placeholder={{ color: textColorSecondary }}
                rows={2}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </FormControl>

            <Flex gap='10px' pt='4px'>
              <Button
                colorScheme='brand'
                onClick={saveDraft}
                isLoading={isSaving}
                isDisabled={!draft.name.trim() || !draft.address.trim()}
                leftIcon={<Icon as={MdCheck} />}>
                Save Location
              </Button>
              <Button
                variant='outline'
                onClick={cancelDraft}
                leftIcon={<Icon as={MdClose} />}>
                Cancel
              </Button>
            </Flex>
          </VStack>
        </Box>
      )}

      {/* MapLibre Map Container */}
      <Box
        w='100%'
        h='420px'
        borderRadius='16px'
        overflow='hidden'
        border='1px solid'
        borderColor={inputBorder}
        position='relative'>
        <div
          ref={mapContainerRef}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>
    </Card>
  );
}
