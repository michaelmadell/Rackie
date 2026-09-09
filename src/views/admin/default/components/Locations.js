import {
  Box,
  Button,
  Flex,
  Input,
  List,
  ListItem,
  Text,
  Textarea,
  useToast,
  VStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useEffect, useRef, useState } from "react";
import { Map, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { searchAddress } from "services/geocode";

const MAPTILER_KEY = "5QIzD0yJGQmiB2p50Aah";

export default function Locations({ locations, onCreate }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const draftMarkerRef = useRef(null);
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    mapRef.current = new Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_KEY}`,
      center: [-122.4, 37.8],
      zoom: 1,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = locations.map((location) =>
      new Marker().setLngLat([location.lng, location.lat]).addTo(map)
    );
  }, [locations]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        setSearchError(null);
        return;
      }
      try {
        const results = await searchAddress(query);
        setSuggestions(results);
        setSearchError(results.length === 0 ? "No results found" : null);
      } catch {
        setSuggestions([]);
        setSearchError("Address search failed — check your connection and try again");
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const selectSuggestion = (suggestion) => {
    setSuggestions([]);
    setSearchError(null);
    setQuery(suggestion.address);
    setDraft({
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
      name: "",
      notes: "",
    });

    const map = mapRef.current;
    if (map) {
      map.flyTo({ center: [suggestion.lng, suggestion.lat], zoom: 14 });
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = new Marker({ color: "#f00" })
        .setLngLat([suggestion.lng, suggestion.lat])
        .addTo(map);
    }
  };

  const cancelDraft = () => {
    setDraft(null);
    setQuery("");
    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;
  };

  const saveDraft = async () => {
    try {
      await onCreate({
        name: draft.name,
        notes: draft.notes,
        address: draft.address,
        lat: draft.lat,
        lng: draft.lng,
      });
      cancelDraft();
    } catch (err) {
      toast({
        title: "Couldn't save location",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    }
  };

  return (
    <Card
      justifyContent='center'
      align='center'
      direction='column'
      w='100%'
      mb='0px'>
      <Box w='100%' mb='12px'>
        <Input
          placeholder='Search for an address...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <List
            border='1px solid'
            borderColor='secondaryGray.300'
            borderRadius='8px'
            mt='4px'
            maxH='200px'
            overflowY='auto'>
            {suggestions.map((suggestion, index) => (
              <ListItem
                key={index}
                p='8px'
                cursor='pointer'
                _hover={{ bg: "secondaryGray.100" }}
                onClick={() => selectSuggestion(suggestion)}>
                {suggestion.address}
              </ListItem>
            ))}
          </List>
        )}
        {searchError && suggestions.length === 0 && (
          <Text fontSize='sm' color='red.500' mt='4px'>
            {searchError}
          </Text>
        )}
      </Box>

      {draft && (
        <VStack w='100%' align='stretch' spacing='8px' mb='12px'>
          <Text fontSize='sm' color='secondaryGray.600'>
            {draft.address}
          </Text>
          <Input
            placeholder='Name'
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Textarea
            placeholder='Notes (optional)'
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
          <Flex gap='8px'>
            <Button
              colorScheme='brand'
              onClick={saveDraft}
              isDisabled={!draft.name.trim()}>
              Save location
            </Button>
            <Button variant='outline' onClick={cancelDraft}>
              Cancel
            </Button>
          </Flex>
        </VStack>
      )}

      <Flex justify='space-between' ps='0px' pe='20px' pt='5px' w='100%'>
        <Box w='100%' h='400px'>
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100%" }}
          />
        </Box>
      </Flex>
    </Card>
  );
}
