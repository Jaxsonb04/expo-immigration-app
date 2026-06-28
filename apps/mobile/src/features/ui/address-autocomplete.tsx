import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Input, Label, TextField } from "heroui-native";

import { GlassCard } from "./glass";
import { colors, fonts, glass } from "./tokens";

interface AddressSuggestion {
  id: string;
  label: string;
}

interface PhotonProps {
  housenumber?: string;
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  countrycode?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  testID?: string;
}

const MIN_QUERY = 4;
const DEBOUNCE_MS = 300;

function formatAddress(p: PhotonProps): string {
  const street = p.street ?? p.name;
  const line1 = [p.housenumber, street].filter(Boolean).join(" ");
  const region = [p.state, p.postcode].filter(Boolean).join(" ");
  const line2 = [p.city, region].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(", ");
}

/**
 * Address field with debounced US-address suggestions (free OpenStreetMap /
 * Photon endpoint, no key). The selected address is held on-device only.
 */
export function AddressAutocomplete({
  value,
  onChangeText,
  label = "Mailing address",
  placeholder = "Start typing your address",
  testID,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const suppressRef = useRef(false);

  async function fetchSuggestions(query: string) {
    const requestId = ++requestIdRef.current;
    setIsSearching(true);

    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok) {
        setSuggestions([]);
        return;
      }

      const data = (await response.json()) as { features?: { properties?: PhotonProps }[] };

      if (requestId !== requestIdRef.current) {
        return;
      }

      const next = (data.features ?? [])
        .map((feature) => feature.properties ?? {})
        .filter((properties) => properties.countrycode === "US")
        .map((properties, index) => ({ id: String(index), label: formatAddress(properties) }))
        .filter((suggestion) => suggestion.label.length > 0);

      setSuggestions(next);
    } catch {
      if (requestId === requestIdRef.current) {
        setSuggestions([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsSearching(false);
      }
    }
  }

  function handleChange(text: string) {
    onChangeText(text);

    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(trimmed);
    }, DEBOUNCE_MS);
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    suppressRef.current = true;
    requestIdRef.current += 1;
    onChangeText(suggestion.label);
    setSuggestions([]);
    setIsSearching(false);
  }

  return (
    <View style={{ gap: 8 }}>
      <TextField>
        <Label>{label}</Label>
        <Input
          accessibilityLabel={label}
          autoCapitalize="words"
          autoCorrect={false}
          onChangeText={handleChange}
          placeholder={placeholder}
          testID={testID}
          value={value}
        />
      </TextField>

      {isSearching ? (
        <Text style={{ color: colors.hint, fontFamily: fonts.medium, fontSize: 12 }}>
          Searching addresses…
        </Text>
      ) : null}

      {suggestions.length > 0 ? (
        <GlassCard padding={0}>
          <View>
            {suggestions.map((suggestion, index) => (
              <Pressable
                key={suggestion.id}
                accessibilityRole="button"
                onPress={() => selectSuggestion(suggestion)}
                testID={`address-suggestion-${index}`}
                style={{
                  borderTopColor: glass.borderSoft,
                  borderTopWidth: index === 0 ? 0 : 1,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                }}
              >
                <Text style={{ color: colors.foreground, fontFamily: fonts.medium, fontSize: 14 }}>
                  {suggestion.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      ) : null}

      <Text style={{ color: colors.hint, fontFamily: fonts.body, fontSize: 11 }}>
        Suggestions from OpenStreetMap · held on-device only.
      </Text>
    </View>
  );
}
