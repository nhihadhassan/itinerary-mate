/*
 * Adapted from Dobidop/easyItinerary (MIT License).
 * Copyright (c) 2026 Dobidop.
 *
 * The original helpers parse Google Maps URLs in a vanilla JS resource flow.
 * This module keeps the behavior framework-neutral for Itinerary Mate.
 */

export interface ParsedGoogleMapsPlace {
  name?: string;
  latitude?: number;
  longitude?: number;
}

const COORDINATE_PATTERNS: RegExp[] = [
  /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
  /place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  /[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
];

export function isGoogleMapsUrl(value: string) {
  return /google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(value);
}

export function isValidCoordinate(latitude: number, longitude: number) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function decodeMapsText(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.replace(/\+/g, " ").trim();
  }
}

export function parseGoogleMapsUrl(url: string): ParsedGoogleMapsPlace {
  const result: ParsedGoogleMapsPlace = {};

  const placeNameMatch = url.match(/\/place\/([^/@?]+)/);
  if (placeNameMatch) {
    result.name = decodeMapsText(placeNameMatch[1]);
  }

  for (const pattern of COORDINATE_PATTERNS) {
    const match = url.match(pattern);
    if (!match) continue;
    const latitude = Number.parseFloat(match[1]);
    const longitude = Number.parseFloat(match[2]);
    if (isValidCoordinate(latitude, longitude)) {
      result.latitude = Number(latitude.toFixed(6));
      result.longitude = Number(longitude.toFixed(6));
      break;
    }
  }

  if (!result.name) {
    const queryMatch = url.match(/[?&]q=([^&@]+)/);
    if (queryMatch) {
      const decoded = decodeMapsText(queryMatch[1]);
      if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(decoded)) {
        result.name = decoded;
      }
    }
  }

  return result;
}

export function parseMapsOrSearchText(value: string): ParsedGoogleMapsPlace {
  const trimmed = value.trim();
  if (!trimmed) return {};
  return isGoogleMapsUrl(trimmed) ? parseGoogleMapsUrl(trimmed) : { name: trimmed };
}
